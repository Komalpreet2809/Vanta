"""Index audio corpora into (id -> file list) maps and cache to JSON.

Three corpora sit behind different interfaces:
  - SpeakerIndex  : LibriSpeech, grouped by speaker_id. The key Vanta constraint
                    is that we can draw two *different* clips from the same
                    speaker (mixture clip vs. enrollment clip).
  - NoiseIndex    : flat list of noise clips. `combined()` merges every source
                    on disk — MUSAN, RIRS_NOISES pointsource/isotropic, WHAM!.
  - RirIndex      : RIRS_NOISES impulse responses, simulated and real measured.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from vanta.config import DATA_DIR


def _speaker_id_from_librispeech_path(p: Path) -> str:
    # LibriSpeech layout: dev-clean/{speaker}/{chapter}/{speaker}-{chapter}-{utt}.flac
    return p.parts[-3]


class SpeakerIndex:
    """Speaker -> list of clip paths. Supports sampling two distinct clips."""

    def __init__(self, speakers: dict[str, list[str]]):
        # keep only speakers with >=2 clips (need two distinct for mix+enroll)
        self.speakers: dict[str, list[Path]] = {
            sid: [Path(p) for p in clips]
            for sid, clips in speakers.items()
            if len(clips) >= 2
        }
        self.ids: list[str] = sorted(self.speakers)
        if not self.ids:
            raise ValueError("SpeakerIndex is empty")

    @classmethod
    def from_librispeech(cls, root: Path) -> "SpeakerIndex":
        grouped: dict[str, list[str]] = defaultdict(list)
        for flac in root.rglob("*.flac"):
            grouped[_speaker_id_from_librispeech_path(flac)].append(str(flac))
        return cls(dict(grouped))

    @classmethod
    def from_dir(cls, root: Path, pattern: str = "*.wav") -> "SpeakerIndex":
        """Index any speaker/session/clip tree (same layout as LibriSpeech).

        Used for the AMI conversational clips, whose speaker id is the directory
        two levels above the clip — identical to the LibriSpeech convention.
        """
        grouped: dict[str, list[str]] = defaultdict(list)
        for clip in root.rglob(pattern):
            grouped[clip.parts[-3]].append(str(clip))
        return cls(dict(grouped))

    def merge(self, other: "SpeakerIndex") -> "SpeakerIndex":
        """Union two speaker pools (ids are disjoint by construction)."""
        merged = {sid: [str(p) for p in clips] for sid, clips in self.speakers.items()}
        for sid, clips in other.speakers.items():
            merged.setdefault(sid, []).extend(str(p) for p in clips)
        return SpeakerIndex(merged)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {sid: [str(p) for p in clips] for sid, clips in self.speakers.items()},
                indent=2,
            )
        )

    @classmethod
    def load(cls, path: Path) -> "SpeakerIndex":
        return cls(json.loads(path.read_text()))

    def sample_speaker(self, rng: np.random.Generator) -> str:
        return self.ids[int(rng.integers(0, len(self.ids)))]

    def sample_two_clips(
        self, speaker_id: str, rng: np.random.Generator
    ) -> tuple[Path, Path]:
        """Draw two different clips from the same speaker."""
        clips = self.speakers[speaker_id]
        i, j = rng.choice(len(clips), size=2, replace=False)
        return clips[int(i)], clips[int(j)]

    def sample_interference_speaker(
        self, exclude: str, rng: np.random.Generator
    ) -> str:
        while True:
            sid = self.sample_speaker(rng)
            if sid != exclude:
                return sid

    def __len__(self) -> int:
        return len(self.ids)


class _FlatIndex:
    """Shared base for flat collections of audio files (noise, RIR)."""

    def __init__(self, files: list[str]):
        self.files: list[Path] = [Path(f) for f in files]
        if not self.files:
            raise ValueError(f"{type(self).__name__} is empty")

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps([str(p) for p in self.files], indent=2))

    @classmethod
    def load(cls, path: Path) -> "_FlatIndex":
        return cls(json.loads(path.read_text()))

    def sample(self, rng: np.random.Generator) -> Path:
        return self.files[int(rng.integers(0, len(self.files)))]

    def __len__(self) -> int:
        return len(self.files)


class NoiseIndex(_FlatIndex):
    """Non-speech ambient noise clips from MUSAN `noise/` subfolder."""

    @classmethod
    def from_musan(cls, root: Path) -> "NoiseIndex":
        noise_dir = root / "noise"
        files = [str(p) for p in noise_dir.rglob("*.wav")]
        return cls(files)

    @classmethod
    def combined(cls, data_dir: Path) -> "NoiseIndex":
        """Merge every available noise source into one pool:
        MUSAN + RIRS_NOISES pointsource/isotropic + WHAM! real ambient noise."""
        files: list[str] = []
        musan = data_dir / "musan" / "noise"
        if musan.exists():
            files += [str(p) for p in musan.rglob("*.wav")]
        rn = data_dir / "RIRS_NOISES"
        if (rn / "pointsource_noises").exists():
            files += [str(p) for p in (rn / "pointsource_noises").glob("*.wav")]
        real_dir = rn / "real_rirs_isotropic_noises"
        if real_dir.exists():
            files += [str(p) for p in real_dir.glob("*.wav") if "noise" in p.name.lower()]
        # WHAM!: real ambient recordings (cafés, streets). tr + cv go into
        # training; tt stays out as a held-out pool for any future WHAM eval.
        for split in ("tr", "cv"):
            wham = data_dir / "wham_noise" / split
            if wham.exists():
                files += [str(p) for p in wham.glob("*.wav")]
        return cls(files)


class RirIndex(_FlatIndex):
    """Room impulse responses from RIRS_NOISES."""

    @classmethod
    def from_rirs_noises(cls, root: Path) -> "RirIndex":
        sim_dir = root / "simulated_rirs"
        files = [str(p) for p in sim_dir.rglob("*.wav")]
        # Real measured RIRs (RVB2014/RWCP/AIR): fewer but real rooms — exactly
        # the acoustics simulated RIRs approximate. Same dir also holds
        # isotropic *noise* recordings; keep only impulse responses.
        real_dir = root / "real_rirs_isotropic_noises"
        files += [str(p) for p in real_dir.glob("*.wav") if "rir" in p.name.lower()]
        return cls(files)


def build_default_indices(
    cache_dir: Path | None = None,
    librispeech_split: str = "dev-clean",
    include_ami: bool = True,
) -> dict:
    """Build all available indices from DATA_DIR and cache them to JSON.

    `librispeech_split` selects which subdirectory to index. Use "train-clean-100"
    for training data and "dev-clean" for validation (40 speakers,
    disjoint from training).
    """
    cache_dir = cache_dir or (DATA_DIR / "_index")
    cache_dir.mkdir(parents=True, exist_ok=True)

    result: dict[str, object] = {}

    ls_root = DATA_DIR / "LibriSpeech" / librispeech_split
    if ls_root.exists():
        idx = SpeakerIndex.from_librispeech(ls_root)
        # AMI conversational clips: LibriSpeech is read audiobook speech, AMI is
        # real meeting speech (interruptions, laughter, fillers, uneven pace).
        # Merging both gives speaker variety *and* conversational realism.
        ami_root = DATA_DIR / "ami_clips"
        if include_ami and ami_root.exists():
            ami_idx = SpeakerIndex.from_dir(ami_root)
            idx = idx.merge(ami_idx)
        # Cache file name includes split to avoid overwriting dev with train.
        idx.save(cache_dir / f"speakers_{librispeech_split}.json")
        result["speakers"] = idx

    if (DATA_DIR / "musan").exists() or (DATA_DIR / "RIRS_NOISES").exists():
        idx = NoiseIndex.combined(DATA_DIR)
        idx.save(cache_dir / "noise.json")
        result["noise"] = idx

    rir_root = DATA_DIR / "RIRS_NOISES"
    if rir_root.exists():
        idx = RirIndex.from_rirs_noises(rir_root)
        idx.save(cache_dir / "rirs.json")
        result["rirs"] = idx

    return result


if __name__ == "__main__":
    indices = build_default_indices()
    for name, idx in indices.items():
        print(f"{name}: {len(idx)} entries")
