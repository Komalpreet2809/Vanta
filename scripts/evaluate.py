"""Evaluate a Vanta checkpoint on a manifest.

Reports per-sample and aggregate SI-SDR / PESQ / STOI, plus an "improvement"
metric (estimate vs. mixture) so you can see how much Vanta actually helped.

Usage:
    python scripts/evaluate.py \\
        --checkpoint checkpoints/smoke/best.pt \\
        --manifest datasets/vanta/dev/manifest.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.data.dataset import VantaDataset
from vanta.metrics import batch_metrics
from vanta.models.vanta import Vanta, VantaConfig


def _collate(batch):
    return {
        "mixture": torch.stack([b["mixture"] for b in batch]),
        "target": torch.stack([b["target"] for b in batch]),
        "enrollment": torch.stack([b["enrollment"] for b in batch]),
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", type=Path, default=None, help="optional; random init if omitted")
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--limit", type=int, default=None, help="evaluate at most N samples")
    p.add_argument("--out", type=Path, default=None, help="optional JSON output path")
    p.add_argument("--repeats", type=int, default=2, help="TCN R used at training time")
    args = p.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = Vanta(VantaConfig(repeats=args.repeats)).to(device)
    if args.checkpoint is not None:
        ck = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ck["model_state"])
        print(f"loaded checkpoint: {args.checkpoint} (epoch {ck.get('epoch', '?')})")
    else:
        print("no checkpoint — evaluating random-initialized model (baseline)")
    model.eval()

    ds = VantaDataset(args.manifest)
    if args.limit is not None:
        ds.entries = ds.entries[: args.limit]
    loader = DataLoader(ds, batch_size=args.batch_size, shuffle=False, collate_fn=_collate)

    per_sample = {"si_sdr": [], "pesq": [], "stoi": [], "si_sdr_mix": []}
    with torch.no_grad():
        for batch in tqdm(loader, desc="evaluate"):
            mix = batch["mixture"].to(device)
            tgt = batch["target"].to(device)
            enr = batch["enrollment"].to(device)
            est = model(mix, enrollment=enr)

            m = batch_metrics(est, tgt)
            per_sample["si_sdr"].append(m["si_sdr"])
            per_sample["pesq"].append(m["pesq"])
            per_sample["stoi"].append(m["stoi"])

            # Mixture-vs-target SI-SDR = "how bad does the input start out?"
            # est SI-SDR minus this = improvement Vanta actually provided.
            from vanta.losses import si_sdr
            per_sample["si_sdr_mix"].append(si_sdr(mix, tgt).detach().cpu())

    si = torch.cat(per_sample["si_sdr"])
    si_mix = torch.cat(per_sample["si_sdr_mix"])
    pesq = torch.cat(per_sample["pesq"])
    stoi = torch.cat(per_sample["stoi"])
    improvement = si - si_mix

    def stats(t: torch.Tensor) -> dict:
        return {
            "mean": float(t.mean()),
            "median": float(t.median()),
            "std": float(t.std()),
            "min": float(t.min()),
            "max": float(t.max()),
        }

    report = {
        "n_samples": int(len(si)),
        "si_sdr": stats(si),
        "si_sdr_input_mixture": stats(si_mix),
        "si_sdr_improvement": stats(improvement),
        "pesq": stats(pesq),
        "stoi": stats(stoi),
    }
    print(json.dumps(report, indent=2))

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2))
        print(f"wrote report to {args.out}")


if __name__ == "__main__":
    main()
