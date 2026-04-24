"""CLI entry point for training Vanta.

Usage:
    python scripts/train.py --manifest datasets/vanta/dev/manifest.jsonl \\
        --out checkpoints/smoke --epochs 5 --batch-size 4
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import torch

from vanta.data.dataset import VantaDataset
from vanta.models.vanta import Vanta, VantaConfig
from vanta.training import TrainConfig, train, train_val_split


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument(
        "--val-manifest",
        type=Path,
        default=None,
        help="optional separate val manifest (e.g. held-out speakers). "
             "If omitted, a random val-fraction of --manifest is held out.",
    )
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--val-fraction", type=float, default=0.1)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--no-amp", action="store_true", help="disable mixed precision")
    p.add_argument("--amp-dtype", choices=["bf16", "fp16"], default="bf16")
    p.add_argument("--repeats", type=int, default=2, help="TCN R (total blocks = R*X=R*8)")
    p.add_argument("--dropout", type=float, default=0.0, help="Dropout1d prob in TCN blocks")
    p.add_argument("--weight-decay", type=float, default=1e-5)
    p.add_argument("--lr-schedule", choices=["cosine", "constant"], default="cosine")
    p.add_argument("--lr-min", type=float, default=1e-5, help="cosine floor")
    p.add_argument("--patience", type=int, default=5, help="early-stop patience in epochs")
    p.add_argument(
        "--resume",
        action="store_true",
        help="resume from <out>/last.pt if it exists (model+optimizer+LR+epoch)",
    )
    args = p.parse_args()

    torch.manual_seed(args.seed)

    if args.val_manifest is not None:
        train_ds = VantaDataset(args.manifest)
        val_ds = VantaDataset(args.val_manifest)
    else:
        dataset = VantaDataset(args.manifest)
        train_ds, val_ds = train_val_split(dataset, args.val_fraction, seed=args.seed)
    print(f"train={len(train_ds)}  val={len(val_ds)}")

    model = Vanta(VantaConfig(repeats=args.repeats, dropout=args.dropout))
    cfg = TrainConfig(
        lr=args.lr,
        batch_size=args.batch_size,
        num_epochs=args.epochs,
        amp=not args.no_amp,
        amp_dtype=args.amp_dtype,
        weight_decay=args.weight_decay,
        lr_schedule=args.lr_schedule,
        lr_min=args.lr_min,
        early_stop_patience=args.patience,
    )
    result = train(model, train_ds, val_ds, cfg, out_dir=args.out, resume=args.resume)
    print(f"\nbest val SI-SDR: {result['best_val_si_sdr']:+.3f} dB")


if __name__ == "__main__":
    main()
