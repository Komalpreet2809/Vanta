"""Recording-chain augmentation — teaches the model real-world audio.

The from-scratch model trained on clean LibriSpeech generalized to LibriSpeech
(+7 dB) but failed on real phone/laptop recordings: it never saw mic coloration,
limited bandwidth, compression artifacts, or room tone. This module degrades the
synthetic mixtures to *look like* real recordings, closing that domain gap.

Two kinds of degradation, applied differently on purpose:

  LINEAR (EQ tilt, band-limiting): these color the whole recording, target voice
  included. We apply the SAME linear filter to the mixture AND the clean target,
  so the model isn't asked to invent bandwidth the "mic" never captured — it only
  has to remove the interferer + noise within the recorded band.

  MIXTURE-ONLY (soft clipping, mu-law codec sim, broadband noise floor): these
  simulate junk in the captured signal. Applied to the mixture only; the target
  stays the clean reference, so the model learns to clean them off.

All ops are numpy/scipy so they run in DataLoader workers without ffmpeg overhead.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, sosfilt

EPS = 1e-8


@dataclass
class AugConfig:
    enabled: bool = False
    # Probability each op fires per sample.
    eq_prob: float = 0.6
    bandlimit_prob: float = 0.5
    clip_prob: float = 0.3
    mulaw_prob: float = 0.3
    noise_floor_prob: float = 0.5
    # Band-limit cutoff range (Hz). 3.4 kHz ~ telephone; 7.8 kHz ~ near full band.
    lowpass_hz: tuple[float, float] = (3400.0, 7800.0)
    # First-order spectral tilt in dB across the band (+ = brighter, - = darker).
    eq_tilt_db: tuple[float, float] = (-9.0, 9.0)
    # Soft-clip drive (higher = more distortion). tanh(drive * x) / tanh(drive).
    clip_drive: tuple[float, float] = (2.0, 8.0)
    # mu-law companding quantization levels (lower = more codec-like crunch).
    mulaw_levels: tuple[int, int] = (64, 256)
    # Broadband noise floor SNR (dB) relative to signal RMS.
    noise_floor_snr_db: tuple[float, float] = (20.0, 40.0)


class RecordingAugment:
    """Sample a recording chain, then apply its linear/mixture-only parts."""

    def __init__(self, cfg: AugConfig, sr: int):
        self.cfg = cfg
        self.sr = sr

    # ---- parameter sampling -------------------------------------------------
    def sample_params(self, rng: np.random.Generator) -> dict:
        c = self.cfg
        p: dict = {}
        p["eq"] = (
            float(rng.uniform(*c.eq_tilt_db)) if rng.random() < c.eq_prob else None
        )
        p["lowpass"] = (
            float(rng.uniform(*c.lowpass_hz)) if rng.random() < c.bandlimit_prob else None
        )
        p["clip"] = (
            float(rng.uniform(*c.clip_drive)) if rng.random() < c.clip_prob else None
        )
        p["mulaw"] = (
            int(rng.integers(c.mulaw_levels[0], c.mulaw_levels[1] + 1))
            if rng.random() < c.mulaw_prob else None
        )
        p["noise_floor"] = (
            float(rng.uniform(*c.noise_floor_snr_db))
            if rng.random() < c.noise_floor_prob else None
        )
        return p

    # ---- linear ops (apply identically to mixture AND target) ---------------
    def apply_linear(self, wav: np.ndarray, params: dict) -> np.ndarray:
        out = wav
        if params.get("eq") is not None:
            out = self._spectral_tilt(out, params["eq"])
        if params.get("lowpass") is not None:
            out = self._lowpass(out, params["lowpass"])
        return out.astype(np.float32, copy=False)

    # ---- mixture-only ops (degradations to be cleaned off) ------------------
    def apply_mixture_only(
        self, wav: np.ndarray, params: dict, rng: np.random.Generator
    ) -> np.ndarray:
        out = wav
        if params.get("clip") is not None:
            out = self._soft_clip(out, params["clip"])
        if params.get("mulaw") is not None:
            out = self._mulaw(out, params["mulaw"])
        if params.get("noise_floor") is not None:
            out = self._add_noise_floor(out, params["noise_floor"], rng)
        return out.astype(np.float32, copy=False)

    # ---- individual effects -------------------------------------------------
    def _spectral_tilt(self, wav: np.ndarray, tilt_db: float) -> np.ndarray:
        # Frequency-domain first-order tilt: linear gain ramp from -tilt/2 at DC
        # to +tilt/2 at Nyquist (dB), applied to the magnitude spectrum.
        n = len(wav)
        if n < 8:
            return wav
        spec = np.fft.rfft(wav)
        ramp = np.linspace(-0.5, 0.5, spec.shape[0])
        gain = 10 ** ((tilt_db * ramp) / 20.0)
        return np.fft.irfft(spec * gain, n=n)

    def _lowpass(self, wav: np.ndarray, cutoff_hz: float) -> np.ndarray:
        nyq = self.sr / 2.0
        cutoff = min(max(cutoff_hz, 500.0), nyq * 0.99)
        sos = butter(6, cutoff / nyq, btype="low", output="sos")
        return sosfilt(sos, wav)

    def _soft_clip(self, wav: np.ndarray, drive: float) -> np.ndarray:
        peak = np.max(np.abs(wav)) + EPS
        x = wav / peak
        y = np.tanh(drive * x) / np.tanh(drive)
        return y * peak

    def _mulaw(self, wav: np.ndarray, levels: int) -> np.ndarray:
        peak = np.max(np.abs(wav)) + EPS
        x = np.clip(wav / peak, -1.0, 1.0)
        mu = float(levels - 1)
        comp = np.sign(x) * np.log1p(mu * np.abs(x)) / np.log1p(mu)  # encode
        q = np.round((comp + 1) / 2 * (levels - 1)) / (levels - 1) * 2 - 1  # quantize
        dec = np.sign(q) * (1.0 / mu) * (np.power(1 + mu, np.abs(q)) - 1)  # decode
        return dec * peak

    def _add_noise_floor(
        self, wav: np.ndarray, snr_db: float, rng: np.random.Generator
    ) -> np.ndarray:
        sig_rms = np.sqrt(np.mean(wav**2) + EPS)
        noise = rng.standard_normal(len(wav)).astype(np.float32)
        noise_rms = np.sqrt(np.mean(noise**2) + EPS)
        target_noise_rms = sig_rms / (10 ** (snr_db / 20.0))
        return wav + noise * (target_noise_rms / noise_rms)
