"""PyTorch Dataset over a manifest.jsonl produced by build_dataset.py."""

from __future__ import annotations

import json
from pathlib import Path

import soundfile as sf
import torch
from torch.utils.data import Dataset


class VantaDataset(Dataset):
    """Reads (mixture, target, enrollment) triples from a manifest.

    All clips are fixed-length at build time, so there is no padding logic
    here and no need for a custom collate_fn beyond the default stacker.
    """

    def __init__(self, manifest_path: str | Path, base_dir: str | Path | None = None):
        manifest_path = Path(manifest_path)
        # Manifest paths are stored relative to the dataset root (datasets/vanta/),
        # i.e. one level above the split dir. If not given, infer it.
        self.base = Path(base_dir) if base_dir else manifest_path.parent.parent
        with manifest_path.open() as f:
            self.entries = [json.loads(line) for line in f]

    def __len__(self) -> int:
        return len(self.entries)

    def _read(self, rel: str) -> torch.Tensor:
        # Windows-style backslashes in manifest -> forward slashes
        p = self.base / rel.replace("\\", "/")
        wav, _ = sf.read(p, dtype="float32")
        return torch.from_numpy(wav)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor | str]:
        e = self.entries[idx]
        return {
            "mixture": self._read(e["mixture"]),
            "target": self._read(e["target"]),
            "enrollment": self._read(e["enrollment"]),
            "target_speaker": e["target_speaker"],
        }
