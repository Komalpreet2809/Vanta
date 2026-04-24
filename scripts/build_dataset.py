"""Build a Vanta training dataset by running the synthesis engine N times.

Each sample produces three .wav files in `<out_dir>/{mixture,target,enrollment}/`
named by a zero-padded index, plus a `manifest.jsonl` with per-sample metadata.

Usage:
    python scripts/build_dataset.py --n 500 --out datasets/vanta_dev --split dev
    python scripts/build_dataset.py --n 100 --no-noise --no-rir   # minimal test
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATASETS_DIR, SAMPLE_RATE
from vanta.data.indexer import build_default_indices
from vanta.data.synthesize import MixConfig, Mixer
from vanta.utils.audio import save_audio


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=100, help="number of mixtures")
    p.add_argument("--out", type=Path, default=DATASETS_DIR / "vanta_dev")
    p.add_argument("--split", default="dev")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--no-noise", action="store_true")
    p.add_argument("--no-rir", action="store_true")
    p.add_argument(
        "--source",
        default="dev-clean",
        help="LibriSpeech subdir to draw voices from "
        "(e.g. 'dev-clean' for validation, 'train-clean-100' for training)",
    )
    args = p.parse_args()

    indices = build_default_indices(librispeech_split=args.source)
    if "speakers" not in indices:
        sys.exit("no speaker index (LibriSpeech missing?)")

    cfg = MixConfig(
        sr=SAMPLE_RATE,
        use_noise=not args.no_noise,
        use_rir=not args.no_rir,
    )
    # Warn when a requested augmentation has no data backing it.
    if cfg.use_noise and "noise" not in indices:
        print("[warn] --no-noise not set but noise index missing; disabling noise")
        cfg.use_noise = False
    if cfg.use_rir and "rirs" not in indices:
        print("[warn] --no-rir not set but RIR index missing; disabling RIR")
        cfg.use_rir = False

    mixer = Mixer(
        cfg,
        speakers=indices["speakers"],
        noise=indices.get("noise"),
        rirs=indices.get("rirs"),
        seed=args.seed,
    )

    out = args.out / args.split
    for sub in ("mixture", "target", "enrollment"):
        (out / sub).mkdir(parents=True, exist_ok=True)

    manifest_path = out / "manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as mf:
        for i in tqdm(range(args.n), desc=f"building {args.split}"):
            result = mixer.mix()
            stem = f"{i:06d}.wav"
            mix_p = out / "mixture" / stem
            tgt_p = out / "target" / stem
            enr_p = out / "enrollment" / stem
            save_audio(mix_p, result.mixture, cfg.sr)
            save_audio(tgt_p, result.target, cfg.sr)
            save_audio(enr_p, result.enrollment, cfg.sr)

            entry = {
                "id": i,
                "mixture": str(mix_p.relative_to(args.out)),
                "target": str(tgt_p.relative_to(args.out)),
                "enrollment": str(enr_p.relative_to(args.out)),
                **result.meta,
            }
            mf.write(json.dumps(entry) + "\n")

    print(f"wrote {args.n} samples to {out}")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    main()
