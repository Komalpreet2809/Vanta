"""Audio I/O and level/SNR helpers."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

EPS = 1e-8


def load_audio(path: str | Path, sr: int) -> np.ndarray:
    """Load a mono waveform at `sr` Hz. Resamples if needed."""
    wav, file_sr = sf.read(str(path), dtype="float32", always_2d=False)
    if wav.ndim > 1:
        wav = wav.mean(axis=1)
    if file_sr != sr:
        wav = _resample(wav, file_sr, sr)
    return wav.astype(np.float32, copy=False)


def save_audio(path: str | Path, wav: np.ndarray, sr: int) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), wav, sr, subtype="PCM_16")


def _resample(wav: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    import soxr

    return soxr.resample(wav, src_sr, dst_sr, quality="HQ")


def rms(wav: np.ndarray) -> float:
    return float(np.sqrt(np.mean(wav**2) + EPS))


def fix_length(wav: np.ndarray, n_samples: int) -> np.ndarray:
    """Pad with zeros or right-trim so the length equals n_samples."""
    if len(wav) >= n_samples:
        return wav[:n_samples]
    out = np.zeros(n_samples, dtype=wav.dtype)
    out[: len(wav)] = wav
    return out


def random_crop(
    wav: np.ndarray, n_samples: int, rng: np.random.Generator
) -> np.ndarray:
    """Crop a random n_samples window, or pad if too short."""
    if len(wav) <= n_samples:
        return fix_length(wav, n_samples)
    start = int(rng.integers(0, len(wav) - n_samples + 1))
    return wav[start : start + n_samples]


def scale_to_snr(
    signal: np.ndarray, noise: np.ndarray, snr_db: float
) -> np.ndarray:
    """Return `noise` scaled so that signal-vs-noise SNR equals `snr_db`.

    SNR = 10 * log10(P_signal / P_noise), so:
        P_noise_target = P_signal / 10^(SNR/10)
        scale = sqrt(P_noise_target / P_noise)
    """
    p_sig = np.mean(signal**2) + EPS
    p_noise = np.mean(noise**2) + EPS
    target_p_noise = p_sig / (10 ** (snr_db / 10))
    scale = np.sqrt(target_p_noise / p_noise)
    return noise * scale


def peak_normalize(wav: np.ndarray, peak: float = 0.95) -> np.ndarray:
    """Scale so that max|wav| == peak. Prevents clipping on save."""
    m = np.max(np.abs(wav))
    if m < EPS:
        return wav
    return wav * (peak / m)
