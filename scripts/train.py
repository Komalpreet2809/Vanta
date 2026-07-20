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

import json

import torch

from vanta.config import SAMPLE_RATE
from vanta.data.dataset import VantaDataset
from vanta.data.dynamic_dataset import DynamicMixDataset
from vanta.data.indexer import build_default_indices
from vanta.data.synthesize import MixConfig
from vanta.models.vanta import Vanta, VantaConfig
from vanta.training import TrainConfig, train, train_val_split


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, default=None,
                   help="training manifest (frozen dataset). Omit when using --dynamic.")
    # --- dynamic (on-the-fly) mixing: the fix for the memorization problem ---
    p.add_argument("--dynamic", action="store_true",
                   help="generate fresh mixtures live each step instead of reading a frozen manifest")
    p.add_argument("--train-source", default="train-clean-100",
                   help="LibriSpeech split to draw training voices from (dynamic mode)")
    p.add_argument("--epoch-size", type=int, default=2000,
                   help="fresh mixtures per epoch (dynamic mode) — a validate/checkpoint cadence knob")
    p.add_argument("--clip-seconds", type=float, default=4.0,
                   help="training clip length (dynamic mode). Shorter = less VRAM/faster. "
                        "Model is convolutional, so validation still uses full-length clips.")
    p.add_argument("--intf-snr", type=float, nargs=2, default=None, metavar=("MIN", "MAX"),
                   help="target-vs-interference SNR range in dB (dynamic mode). "
                        "Default keeps MixConfig's (-5, 5); use '0 10' for the realistic "
                        "regime where the target is never quieter than the interferer.")
    p.add_argument("--augment", action="store_true",
                   help="recording-chain augmentation: degrade mixtures to mimic real "
                        "recordings (mic EQ, band-limiting, codec, room tone). Closes the "
                        "LibriSpeech->real-audio domain gap.")
    p.add_argument("--partial-overlap", type=float, default=0.0, metavar="PROB",
                   help="probability of turn-taking mixtures (each speaker active only in "
                        "a random span). Teaches 'output silence when target is silent' — "
                        "required for real conversations.")
    p.add_argument("--num-workers", type=int, default=0,
                   help="DataLoader workers. >0 overlaps CPU mixing with GPU training.")
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
    p.add_argument("--grad-accum", type=int, default=1,
                   help="accumulate grads over N batches; effective batch = batch-size * N")
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--val-fraction", type=float, default=0.1)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--no-amp", action="store_true", help="disable mixed precision")
    p.add_argument("--amp-dtype", choices=["bf16", "fp16"], default="bf16")
    p.add_argument("--repeats", type=int, default=2, help="TCN R (total blocks = R*X=R*8)")
    p.add_argument("--dropout", type=float, default=0.0, help="Dropout1d prob in TCN blocks")
    p.add_argument("--specaug-masks", type=int, default=0,
                   help="SpecAugment: number of time masks per sample (0 = off)")
    p.add_argument("--specaug-width", type=int, default=40,
                   help="SpecAugment: max mask width in encoded frames")
    p.add_argument("--weight-decay", type=float, default=1e-5)
    p.add_argument("--lr-schedule", choices=["cosine", "constant"], default="cosine")
    p.add_argument("--lr-min", type=float, default=1e-5, help="cosine floor")
    p.add_argument("--patience", type=int, default=5, help="early-stop patience in epochs")
    p.add_argument(
        "--resume",
        action="store_true",
        help="resume from <out>/last.pt if it exists (model+optimizer+LR+epoch)",
    )
    p.add_argument(
        "--init-from",
        type=Path,
        default=None,
        help="warm-start: load model weights from this checkpoint but start a FRESH "
             "optimizer/schedule/epoch. Use to fine-tune a trained model on new data "
             "(e.g. augmented) without forgetting what it learned.",
    )
    args = p.parse_args()

    torch.manual_seed(args.seed)

    if args.dynamic:
        # Live-mixing training set; validation must come from a fixed manifest so
        # val SI-SDR is comparable across runs.
        if args.val_manifest is None:
            p.error("--dynamic requires --val-manifest (a fixed held-out set)")
        indices = build_default_indices(librispeech_split=args.train_source)
        if "speakers" not in indices:
            sys.exit(f"no speaker index for '{args.train_source}' (LibriSpeech split missing?)")
        mix_cfg = MixConfig(sr=SAMPLE_RATE, clip_seconds=args.clip_seconds)
        if args.intf_snr is not None:
            mix_cfg.interference_snr_db = (args.intf_snr[0], args.intf_snr[1])
        if args.augment:
            mix_cfg.augment.enabled = True
        if args.partial_overlap > 0:
            mix_cfg.partial_overlap_prob = args.partial_overlap
        train_ds = DynamicMixDataset(
            mix_cfg,
            speakers=indices["speakers"],
            noise=indices.get("noise"),
            rirs=indices.get("rirs"),
            epoch_size=args.epoch_size,
            base_seed=args.seed,
        )
        val_ds = VantaDataset(args.val_manifest)
        print(f"[dynamic] source={args.train_source}  speakers={len(indices['speakers'])}  "
              f"epoch_size={args.epoch_size}  workers={args.num_workers}")
    elif args.manifest is None:
        p.error("either --manifest or --dynamic is required")
    elif args.val_manifest is not None:
        train_ds = VantaDataset(args.manifest)
        val_ds = VantaDataset(args.val_manifest)
    else:
        dataset = VantaDataset(args.manifest)
        train_ds, val_ds = train_val_split(dataset, args.val_fraction, seed=args.seed)
    print(f"train={len(train_ds)}  val={len(val_ds)}")

    model_cfg = VantaConfig(
        repeats=args.repeats,
        dropout=args.dropout,
        specaug_num_masks=args.specaug_masks,
        specaug_max_width=args.specaug_width,
    )
    model = Vanta(model_cfg)
    if args.init_from is not None:
        ck = torch.load(args.init_from, map_location="cpu", weights_only=False)
        model.load_state_dict(ck["model_state"])
        print(f"[init-from] warm-started model weights from {args.init_from} "
              f"(epoch {ck.get('epoch', '?')}); fresh optimizer/schedule")
    cfg = TrainConfig(
        lr=args.lr,
        batch_size=args.batch_size,
        grad_accum=args.grad_accum,
        num_epochs=args.epochs,
        num_workers=args.num_workers,
        amp=not args.no_amp,
        amp_dtype=args.amp_dtype,
        weight_decay=args.weight_decay,
        lr_schedule=args.lr_schedule,
        lr_min=args.lr_min,
        early_stop_patience=args.patience,
    )
    # Record the model architecture too — the old runs only saved TrainConfig,
    # so we couldn't tell afterwards which model size produced a checkpoint.
    args.out.mkdir(parents=True, exist_ok=True)
    from dataclasses import asdict
    (args.out / "model_config.json").write_text(json.dumps(asdict(model_cfg), indent=2))

    result = train(model, train_ds, val_ds, cfg, out_dir=args.out, resume=args.resume)
    print(f"\nbest val SI-SDR: {result['best_val_si_sdr']:+.3f} dB")


if __name__ == "__main__":
    main()
