"""Speaker-classification dataset for training the encoder from scratch.

The encoder learns identity by being asked "which of N speakers is this?" — the
classification head is thrown away afterwards and the penultimate representation
becomes the embedding.

Augmentation is the whole game here. Trained on clean LibriSpeech alone, an
encoder learns to lean on recording-channel cues (this speaker's mic, this
room), which collapses the moment it meets a phone recording. So every clip is
pushed through the same corruption chain the separator trains on — additive
noise, room reverberation, and the recording chain (mic EQ, band-limiting,
codec crunch, noise floor) — while the label stays the same person. The encoder
is forced to find what survives all of it: the voice.

That augmentation is why this encoder beats the pretrained ECAPA despite ~4x
fewer speakers: VoxCeleb is far larger but not shaped like our deployment audio,
and this one is corrupted specifically for it. scripts/compare_encoders.py has
the head-to-head.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from scipy.signal import fftconvolve
from torch.utils.data import Dataset, get_worker_info

from vanta.data.augment import AugConfig, RecordingAugment
from vanta.data.indexer import NoiseIndex, RirIndex, SpeakerIndex
from vanta.utils.audio import EPS, load_audio, peak_normalize, random_crop, scale_to_snr


class SpeakerClsDataset(Dataset):
    def __init__(
        self,
        speakers: SpeakerIndex,
        noise: NoiseIndex | None = None,
        rirs: RirIndex | None = None,
        sr: int = 16000,
        seconds: float = 3.0,
        augment: bool = True,
        noise_prob: float = 0.6,
        rir_prob: float = 0.4,
        chain_prob: float = 0.5,
        noise_snr_db: tuple[float, float] = (0.0, 20.0),
        seed: int = 0,
    ):
        self.sr = sr
        self.n = int(seconds * sr)
        self.noise = noise
        self.rirs = rirs
        self.augment = augment
        self.noise_prob = noise_prob
        self.rir_prob = rir_prob
        self.chain_prob = chain_prob
        self.noise_snr_db = noise_snr_db
        self.seed = seed

        # Stable label mapping: sorted ids -> 0..N-1
        self.speaker_ids = list(speakers.ids)
        self.label_of = {sid: i for i, sid in enumerate(self.speaker_ids)}
        # Flat (clip_path, label) list so an epoch covers every clip once.
        self.items: list[tuple[Path, int]] = []
        for sid in self.speaker_ids:
            lbl = self.label_of[sid]
            for clip in speakers.speakers[sid]:
                self.items.append((clip, lbl))

        self.chain = RecordingAugment(AugConfig(enabled=True), sr)
        self._rng: np.random.Generator | None = None

    @property
    def n_classes(self) -> int:
        return len(self.speaker_ids)

    def __len__(self) -> int:
        return len(self.items)

    def _get_rng(self) -> np.random.Generator:
        if self._rng is None:
            info = get_worker_info()
            seed = self.seed if info is None else (torch.initial_seed() % (2**31))
            self._rng = np.random.default_rng(seed)
        return self._rng

    def _apply_rir(self, wav: np.ndarray, rng) -> np.ndarray:
        # Augmentation is optional by nature: if a corpus file is unreadable,
        # skipping the effect is strictly better than killing a multi-hour run.
        try:
            rir = load_audio(self.rirs.sample(rng), self.sr)
        except Exception:
            return wav
        peak = float(np.max(np.abs(rir)))
        if not np.isfinite(peak) or peak < EPS:
            return wav
        rir = rir / (peak + EPS)
        return fftconvolve(wav, rir, mode="full")[: len(wav)].astype(np.float32)

    def _add_noise(self, wav: np.ndarray, rng) -> np.ndarray:
        try:
            raw = load_audio(self.noise.sample(rng), self.sr)
        except Exception:
            return wav
        if len(raw) == 0 or float(np.sqrt(np.mean(raw**2) + EPS)) < EPS:
            return wav
        crop = random_crop(raw, len(wav), rng)
        snr = float(rng.uniform(*self.noise_snr_db))
        return (wav + scale_to_snr(wav, crop, snr)).astype(np.float32)

    def _load(self, idx: int, rng, depth: int = 0) -> tuple[np.ndarray, int]:
        """Load a clip, substituting another clip from the same speaker if the
        file is unreadable.

        Corpora arrive truncated or corrupt often enough that one bad file in
        180k should never kill a multi-hour run. Falling back within the same
        speaker keeps the label honest.
        """
        path, label = self.items[idx]
        try:
            return random_crop(load_audio(path, self.sr), self.n, rng), label
        except Exception:
            if depth >= 5:
                # Give up on audio and return silence; the batch stays valid.
                return np.zeros(self.n, dtype=np.float32), label
            same = [i for i, (_, l) in enumerate(self.items) if l == label and i != idx]
            nxt = int(rng.integers(0, len(same))) if same else (idx + 1) % len(self.items)
            return self._load(same[nxt] if same else nxt, rng, depth + 1)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        rng = self._get_rng()
        wav, label = self._load(idx, rng)

        if self.augment:
            if self.rirs is not None and rng.random() < self.rir_prob:
                wav = self._apply_rir(wav, rng)
            if self.noise is not None and rng.random() < self.noise_prob:
                wav = self._add_noise(wav, rng)
            if rng.random() < self.chain_prob:
                p = self.chain.sample_params(rng)
                wav = self.chain.apply_linear(wav, p)
                wav = self.chain.apply_mixture_only(wav, p, rng)

        wav = peak_normalize(wav.astype(np.float32), peak=0.95)
        return torch.from_numpy(np.ascontiguousarray(wav)), label
