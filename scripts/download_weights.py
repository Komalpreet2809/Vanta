"""Fetch the trained weights so a fresh clone can actually run.

The checkpoints are ~110 MB and stay out of git, but they are public: the
Hugging Face Space serves the exact pair that production runs. Without this,
cloning the repo leaves you with no model and the only documented path to one
is an 11-hour training run.

The two files are a matched set — the separator was trained against this
specific speaker encoder, and pairing it with a different one costs ~2.8 dB
(see README). Both are downloaded together for that reason.

Usage:
    python scripts/download_weights.py
    python scripts/download_weights.py --force    # re-download
"""

from __future__ import annotations

import argparse
import shutil
import sys

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import CHECKPOINTS_DIR

BASE = "https://huggingface.co/spaces/komalsohal/vanta/resolve/main/checkpoints"

# (url filename, destination relative to checkpoints/, approx size)
WEIGHTS = [
    ("best.pt", "fully_ours/best.pt", "37 MB", "separator"),
    ("spk_encoder.pt", "spk_encoder/best.pt", "73 MB", "speaker encoder"),
]


def fetch(url: str, dest: Path, label: str, attempts: int = 4) -> None:
    """Stream to a .part file, then move into place, so an interrupted download
    never leaves a truncated checkpoint that torch.load would choke on.

    Retries because these are ~100 MB over whatever connection the user has, and
    a transient TLS or network blip a minute in should not mean starting over by
    hand.
    """
    import time

    import requests  # urllib trips over proxy CA chains that requests handles

    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")

    for attempt in range(1, attempts + 1):
        try:
            with requests.get(url, stream=True, timeout=60, allow_redirects=True) as r:
                r.raise_for_status()
                total = int(r.headers.get("content-length", 0))
                done = 0
                with tmp.open("wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        f.write(chunk)
                        done += len(chunk)
                        if total:
                            pct = done / total * 100
                            bar = "#" * int(pct / 2.5)
                            print(
                                f"\r  {label:16s} [{bar:<40s}] {pct:5.1f}%",
                                end="", flush=True,
                            )
            if total and done < total:
                raise OSError(f"truncated: got {done} of {total} bytes")
            print()
            shutil.move(str(tmp), str(dest))
            return
        except Exception as e:
            tmp.unlink(missing_ok=True)
            if attempt == attempts:
                raise
            wait = 2 ** attempt
            print(f"\n  {label:16s} attempt {attempt} failed ({e.__class__.__name__}); "
                  f"retrying in {wait}s")
            time.sleep(wait)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--force", action="store_true", help="re-download even if present")
    p.add_argument("--out", type=Path, default=CHECKPOINTS_DIR)
    args = p.parse_args()

    print(f"Fetching trained weights into {args.out}\n")
    for remote, rel, size, label in WEIGHTS:
        dest = args.out / rel
        if dest.exists() and not args.force:
            print(f"  {label:16s} already present ({dest})")
            continue
        print(f"  {label:16s} {size}")
        try:
            fetch(f"{BASE}/{remote}", dest, label)
        except Exception as e:
            sys.exit(f"\nfailed to download {remote}: {e}")

    print("\nDone. Start the server with:")
    print("    python -m uvicorn server:app --port 8000")


if __name__ == "__main__":
    main()
