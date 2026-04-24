"""Inference helpers: load a trained Vanta checkpoint and extract a target speaker."""

from __future__ import annotations

import io
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from vanta.config import SAMPLE_RATE
from vanta.models.vanta import Vanta, VantaConfig
from vanta.utils.audio import peak_normalize

MAX_MIX_SECONDS = 30.0
ENROLL_SECONDS = 5.0


def _ffmpeg_decode(raw: bytes) -> np.ndarray:
    """Pipe arbitrary-container bytes through ffmpeg, get mono 16 kHz float32.

    libsndfile can't read MP4/M4A/WebM/MOV and so on. ffmpeg can. We spawn it
    on demand and stream in/out via pipes to avoid temp files.
    """
    from imageio_ffmpeg import get_ffmpeg_exe

    cmd = [
        get_ffmpeg_exe(),
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",
        "-vn",                      # ignore any video stream
        "-ac", "1",                 # mono
        "-ar", str(SAMPLE_RATE),
        "-f", "f32le",              # raw float32 output — trivial to np.frombuffer
        "pipe:1",
    ]
    proc = subprocess.run(cmd, input=raw, capture_output=True)
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(f"ffmpeg decode failed: {err or 'no stderr'}")
    return np.frombuffer(proc.stdout, dtype=np.float32).copy()


def _to_mono_16k(raw: bytes) -> np.ndarray:
    # Fast path: libsndfile handles WAV/FLAC/OGG/MP3 without spawning a process.
    try:
        wav, sr = sf.read(io.BytesIO(raw), dtype="float32", always_2d=False)
    except Exception:
        # Anything libsndfile refuses — MP4, M4A, WebM, MOV, etc. — goes to ffmpeg.
        return _ffmpeg_decode(raw)

    if wav.ndim > 1:
        wav = wav.mean(axis=1)
    if sr != SAMPLE_RATE:
        import soxr
        wav = soxr.resample(wav, sr, SAMPLE_RATE, quality="HQ")
    return wav.astype(np.float32, copy=False)


def _fit(wav: np.ndarray, target_samples: int) -> np.ndarray:
    if len(wav) >= target_samples:
        return wav[:target_samples]
    out = np.zeros(target_samples, dtype=wav.dtype)
    out[: len(wav)] = wav
    return out


class VantaInference:
    """Wraps a trained Vanta model for single-file inference.

    Load once at startup, call `.extract(mixture_bytes, enrollment_bytes)` per
    request. Returns (extracted_wav_bytes, residue_wav_bytes).
    """

    def __init__(self, checkpoint_path: Path, repeats: int = 2, device: str = "auto"):
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)
        self.model = Vanta(VantaConfig(repeats=repeats))
        ck = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(ck["model_state"])
        self.model.to(self.device).eval()

    @torch.no_grad()
    def extract(
        self, mixture_bytes: bytes, enrollment_bytes: bytes
    ) -> tuple[bytes, bytes, dict]:
        mixture = _to_mono_16k(mixture_bytes)
        enrollment = _to_mono_16k(enrollment_bytes)

        # Guardrails on request size.
        orig_mix_samples = len(mixture)
        max_samples = int(MAX_MIX_SECONDS * SAMPLE_RATE)
        if len(mixture) > max_samples:
            mixture = mixture[:max_samples]

        # Enrollment has to be exactly ENROLL_SECONDS for our trained model.
        enrollment = _fit(enrollment, int(ENROLL_SECONDS * SAMPLE_RATE))
        enrollment = peak_normalize(enrollment, peak=0.95)

        mix_t = torch.from_numpy(mixture).unsqueeze(0).to(self.device)
        enr_t = torch.from_numpy(enrollment).unsqueeze(0).to(self.device)

        # AMP matches how we trained, and it halves memory on long clips.
        use_amp = self.device.type == "cuda"
        if use_amp:
            with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
                est = self.model(mix_t, enrollment=enr_t).float()
        else:
            est = self.model(mix_t, enrollment=enr_t)

        estimate = est.squeeze(0).cpu().numpy()

        # SI-SDR is scale-invariant, so nothing in training penalizes the decoder
        # for drifting to huge amplitudes. Model outputs routinely peak at
        # ±100+. Match the mixture's loudness so playback sounds natural and
        # PCM_16 encoding doesn't clip.
        mix_peak = float(np.max(np.abs(mixture[: len(estimate)]))) + 1e-8
        est_peak = float(np.max(np.abs(estimate))) + 1e-8
        estimate = estimate * (mix_peak * 0.95 / est_peak)

        # Residue = what Vanta removed. Handy for demos — users can play it and
        # hear "this is what the void consumed."
        residue = mixture[: len(estimate)] - estimate

        meta = {
            "sample_rate": SAMPLE_RATE,
            "input_seconds": orig_mix_samples / SAMPLE_RATE,
            "output_seconds": len(estimate) / SAMPLE_RATE,
            "truncated": orig_mix_samples > max_samples,
        }
        return _encode_wav(estimate), _encode_wav(residue), meta


def _encode_wav(wav: np.ndarray) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, wav, SAMPLE_RATE, subtype="PCM_16", format="WAV")
    return buf.getvalue()
