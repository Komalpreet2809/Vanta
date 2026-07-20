"""Index AMI windows where a target speaker is actually talking.

Writes a JSONL manifest consumed by vanta.data.ami.AmiDataset. Also holds out
whole meetings for validation so val speakers/rooms are unseen at train time.

Usage:
    python scripts/build_ami_index.py --val-meetings 3
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATA_DIR, SAMPLE_RATE
from vanta.data.ami import build_index


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ami-root", type=Path, default=DATA_DIR / "ami")
    p.add_argument("--out-dir", type=Path, default=DATA_DIR / "ami_index")
    p.add_argument("--clip-seconds", type=float, default=3.0)
    p.add_argument("--hop-seconds", type=float, default=2.0)
    p.add_argument("--val-meetings", type=int, default=3,
                   help="whole meetings held out for validation (unseen speakers+room)")
    args = p.parse_args()

    entries = build_index(
        args.ami_root,
        clip_seconds=args.clip_seconds,
        hop_seconds=args.hop_seconds,
        sr=SAMPLE_RATE,
    )
    if not entries:
        sys.exit(f"no windows indexed under {args.ami_root} (download still running?)")

    meetings = sorted({e["meeting"] for e in entries})
    val_set = set(meetings[-args.val_meetings :]) if args.val_meetings else set()
    train = [e for e in entries if e["meeting"] not in val_set]
    val = [e for e in entries if e["meeting"] in val_set]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in (("train", train), ("val", val)):
        path = args.out_dir / f"{name}.jsonl"
        with path.open("w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
        hrs = len(rows) * args.clip_seconds / 3600
        print(f"{name}: {len(rows)} windows (~{hrs:.1f} h) -> {path}")

    print(f"meetings: {len(meetings)} total, {len(val_set)} held out for val")
    if val_set:
        print("  val meetings:", ", ".join(sorted(val_set)))


if __name__ == "__main__":
    main()
