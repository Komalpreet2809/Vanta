"""AMI real-recording dataset — genuine mixtures with genuine ground truth.

Each AMI meeting is recorded twice, simultaneously:
    Headset-N  : close-talking mic on speaker N  -> near-clean target voice
    Array1-01  : mic in the room                 -> the real mixture of everyone

So (Array1-01, Headset-N) is a real (mixture, target) pair: same room, same
moment, same acoustics, conversational speech, real mic chain. That is exactly
the physics our synthetic pipeline can't fake.

Three problems real data brings that synthesis never did, and how we handle them:

1. LEVEL/CHANNEL MISMATCH. The headset signal is not "the target as the room mic
   heard it" — different mic, distance, and gain. Training SI-SDR against the raw
   headset would ask the model to invent a channel transform. Fix: project the
   headset signal onto the room-mic signal (least-squares scalar) so the target
   is expressed *in the mixture's own channel*. SI-SDR is scale-invariant, but
   this keeps target and mixture in the same acoustic space.

2. SILENCE. Meetings are mostly one person talking; a random 3 s window often has
   the target silent, which is a degenerate SI-SDR target. Fix: index only
   windows where the target is genuinely active (energy threshold), while still
   allowing partial activity so the model keeps learning "go quiet when I stop".

3. TARGET LEAKAGE INTO OTHER HEADSETS. Not our problem here — we only use the
   target's own headset — but it's why we don't build interference from the
   other headsets.

Enrollment comes from a *different* window of the same speaker's headset, so it
matches deployment: a clean-ish reference clip of the person you want.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from torch.utils.data import Dataset, get_worker_info

from vanta.utils.audio import EPS, peak_normalize

ARRAY_MIC = "Array1-01"


def _rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x**2) + EPS))


def build_index(
    ami_root: Path,
    clip_seconds: float = 3.0,
    hop_seconds: float = 2.0,
    sr: int = 16000,
    min_active_rms: float = 0.005,
    min_active_frac: float = 0.4,
) -> list[dict]:
    """Scan meetings and index windows where a speaker is genuinely talking.

    Returns entries: {meeting, speaker, start_sample, n_samples}. Reads the audio
    once per file with soundfile blocks, so memory stays flat.
    """
    entries: list[dict] = []
    n = int(clip_seconds * sr)
    hop = int(hop_seconds * sr)

    for mdir in sorted(p for p in ami_root.iterdir() if p.is_dir()):
        meeting = mdir.name
        array_path = mdir / f"{meeting}.{ARRAY_MIC}.wav"
        if not array_path.exists():
            continue
        for spk in range(4):
            hs_path = mdir / f"{meeting}.Headset-{spk}.wav"
            if not hs_path.exists():
                continue
            try:
                info = sf.info(str(hs_path))
                hs, file_sr = sf.read(str(hs_path), dtype="float32", always_2d=False)
            except Exception:
                continue
            if hs.ndim > 1:
                hs = hs.mean(axis=1)
            if file_sr != sr:
                import soxr

                hs = soxr.resample(hs, file_sr, sr, quality="QQ").astype(np.float32)

            # Frame-level activity, then keep windows that are mostly active.
            frame = int(0.05 * sr)
            n_frames = len(hs) // frame
            if n_frames == 0:
                continue
            fr = hs[: n_frames * frame].reshape(n_frames, frame)
            active = (np.sqrt((fr**2).mean(axis=1) + EPS) > min_active_rms)

            frames_per_win = max(int(clip_seconds * sr) // frame, 1)
            for start_f in range(0, n_frames - frames_per_win, max(hop // frame, 1)):
                win = active[start_f : start_f + frames_per_win]
                if win.mean() >= min_active_frac:
                    entries.append(
                        {
                            "meeting": meeting,
                            "speaker": spk,
                            "start": int(start_f * frame),
                            "n": n,
                        }
                    )
    return entries


class AmiDataset(Dataset):
    """Real (mixture, target, enrollment) triples from AMI meetings."""

    def __init__(
        self,
        ami_root: str | Path,
        index_path: str | Path,
        clip_seconds: float = 3.0,
        enroll_seconds: float = 5.0,
        sr: int = 16000,
        seed: int = 0,
    ):
        self.root = Path(ami_root)
        self.sr = sr
        self.clip_n = int(clip_seconds * sr)
        self.enroll_n = int(enroll_seconds * sr)
        self.seed = seed
        with open(index_path) as f:
            self.entries = [json.loads(line) for line in f]
        # Windows grouped per (meeting, speaker) so enrollment can come from a
        # different moment of the same person.
        self.by_spk: dict[tuple[str, int], list[int]] = {}
        for i, e in enumerate(self.entries):
            self.by_spk.setdefault((e["meeting"], e["speaker"]), []).append(i)
        self._rng: np.random.Generator | None = None

    def __len__(self) -> int:
        return len(self.entries)

    def _get_rng(self) -> np.random.Generator:
        if self._rng is None:
            info = get_worker_info()
            seed = self.seed if info is None else (torch.initial_seed() % (2**31))
            self._rng = np.random.default_rng(seed)
        return self._rng

    def _read(self, meeting: str, mic: str, start: int, n: int) -> np.ndarray:
        path = self.root / meeting / f"{meeting}.{mic}.wav"
        with sf.SoundFile(str(path)) as f:
            file_sr = f.samplerate
            if file_sr != self.sr:
                ratio = file_sr / self.sr
                f.seek(int(start * ratio))
                raw = f.read(int(n * ratio), dtype="float32", always_2d=False)
                if raw.ndim > 1:
                    raw = raw.mean(axis=1)
                import soxr

                w = soxr.resample(raw, file_sr, self.sr, quality="HQ").astype(np.float32)
            else:
                f.seek(start)
                w = f.read(n, dtype="float32", always_2d=False)
                if w.ndim > 1:
                    w = w.mean(axis=1)
        if len(w) < n:
            w = np.pad(w, (0, n - len(w)))
        return w[:n].astype(np.float32)

    def __getitem__(self, idx: int) -> dict:
        rng = self._get_rng()
        e = self.entries[idx]
        meeting, spk = e["meeting"], e["speaker"]

        mixture = self._read(meeting, ARRAY_MIC, e["start"], self.clip_n)
        headset = self._read(meeting, f"Headset-{spk}", e["start"], self.clip_n)

        # Express the target in the mixture's channel: least-squares scalar
        # projection of the headset signal onto the room-mic signal. Without this
        # the model is asked to invent a mic/distance transform it cannot know.
        denom = float(np.dot(headset, headset)) + EPS
        alpha = float(np.dot(mixture, headset)) / denom
        target = (alpha * headset).astype(np.float32)

        # Enrollment: a different active window of the same speaker's headset.
        pool = self.by_spk[(meeting, spk)]
        j = int(rng.integers(0, len(pool)))
        if len(pool) > 1 and pool[j] == idx:
            j = (j + 1) % len(pool)
        enr_entry = self.entries[pool[j]]
        enrollment = self._read(
            meeting, f"Headset-{spk}", enr_entry["start"], self.enroll_n
        )
        enrollment = peak_normalize(enrollment, peak=0.95)

        # Keep the mixture in a sane range; scale the target identically so the
        # relationship the loss sees is untouched.
        peak = float(np.max(np.abs(mixture))) + EPS
        if peak > 0.95:
            s = 0.95 / peak
            mixture = mixture * s
            target = target * s

        return {
            "mixture": torch.from_numpy(mixture.astype(np.float32)),
            "target": torch.from_numpy(target.astype(np.float32)),
            "enrollment": torch.from_numpy(enrollment.astype(np.float32)),
            "target_speaker": f"{meeting}-{spk}",
        }
