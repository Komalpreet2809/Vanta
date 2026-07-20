"""On-the-fly mixing dataset — the fix for the memorization problem.

The old pipeline froze 20k mixtures to disk (build_dataset.py) and trained on
that same fixed set every epoch, so the model memorized it (train SI-SDR climbed
while val stayed pinned at ~+1 dB). This dataset instead calls the synthesis
engine *live*: every __getitem__ produces a brand-new random mixture, so the
model never sees the same example twice and has to learn to separate voices
rather than memorize files.

Only the *training* set should be dynamic. Keep validation on a fixed manifest
(VantaDataset) so val numbers are comparable across runs.

Freshness across epochs:
    We reseed the per-process mixer from torch.initial_seed(), which PyTorch
    varies per (epoch, worker). With num_workers=0 the mixer is created once and
    its RNG simply keeps advancing across epochs — either way, no epoch ever
    repeats the previous epoch's mixtures.
"""

from __future__ import annotations

import torch
from torch.utils.data import Dataset, get_worker_info

from vanta.data.indexer import NoiseIndex, RirIndex, SpeakerIndex
from vanta.data.synthesize import MixConfig, Mixer


class DynamicMixDataset(Dataset):
    def __init__(
        self,
        mix_cfg: MixConfig,
        speakers: SpeakerIndex,
        noise: NoiseIndex | None,
        rirs: RirIndex | None,
        epoch_size: int,
        base_seed: int = 0,
    ):
        self.mix_cfg = mix_cfg
        self.speakers = speakers
        self.noise = noise
        self.rirs = rirs
        self.epoch_size = int(epoch_size)
        self.base_seed = int(base_seed)
        # Lazily built per process so each DataLoader worker gets its own RNG.
        self._mixer: Mixer | None = None

    def __len__(self) -> int:
        # Nominal length = how many fresh mixtures make up one "epoch". Purely a
        # cadence knob (when to validate / checkpoint); the data is unbounded.
        return self.epoch_size

    def _mixer_for_process(self) -> Mixer:
        if self._mixer is None:
            info = get_worker_info()
            if info is None:
                # Main process (num_workers=0): seed once; the RNG advances
                # across epochs because this object persists, so data stays fresh.
                seed = self.base_seed
            else:
                # Worker process: torch.initial_seed() is set by PyTorch per
                # (epoch, worker), so reseeding from it gives fresh data every
                # epoch even when workers are torn down and recreated.
                seed = torch.initial_seed() % (2**31)
            self._mixer = Mixer(
                self.mix_cfg,
                speakers=self.speakers,
                noise=self.noise,
                rirs=self.rirs,
                seed=seed,
            )
        return self._mixer

    def __getitem__(self, idx: int) -> dict:
        # idx is ignored — every call is a new random draw.
        r = self._mixer_for_process().mix()
        return {
            "mixture": torch.from_numpy(r.mixture),
            "target": torch.from_numpy(r.target),
            "enrollment": torch.from_numpy(r.enrollment),
            "target_speaker": r.meta["target_speaker"],
        }
