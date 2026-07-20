"""Download AMI Meeting Corpus audio — real recorded mixtures with ground truth.

Why AMI:
    Every synthetic mixture we train on is two independently-recorded voices added
    together, then degraded. Real recordings are different in kind: both voices
    travel the same room and the same mic, the mic's AGC pumps them together, and
    the speech is conversational rather than read. AMI is the fix, because each
    meeting is recorded twice, simultaneously:

      Headset-N  : close-talking mic on speaker N  -> near-clean ground truth
      Array1-01  : microphone in the room          -> the genuine messy mixture

    That gives (real mixture, real per-speaker target) pairs — the one thing
    synthesis cannot fake.

Each meeting downloads ~5 files x ~40 MB per 30-40 min of audio. Resumable:
re-running skips complete files and continues partial ones.

Usage:
    python scripts/download_ami.py --meetings 12
    python scripts/download_ami.py --list          # show planned meetings, no download
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATA_DIR

MIRROR = "https://groups.inf.ed.ac.uk/ami/AMICorpusMirror/amicorpus"

# ES = Edinburgh scenario meetings, 4 participants each, consistent mic layout.
# Ordered so a small --meetings count still spans different speaker groups.
MEETINGS = [
    "ES2002a", "ES2003a", "ES2004a", "ES2005a", "ES2006a", "ES2007a",
    "ES2008a", "ES2009a", "ES2010a", "ES2012a", "ES2013a", "ES2014a",
    "ES2002b", "ES2003b", "ES2004b", "ES2005b", "ES2006b", "ES2007b",
    "ES2008b", "ES2009b", "ES2010b", "ES2012b", "ES2013b", "ES2014b",
]

HEADSETS = [f"Headset-{i}" for i in range(4)]
ARRAY = "Array1-01"


def fetch(url: str, dest: Path) -> bool:
    """Resumable download. Returns True if the file is present and non-trivial."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return True
    r = subprocess.run(
        ["curl", "-sL", "-C", "-", "--max-time", "1800", "-o", str(dest), url],
        capture_output=True,
    )
    ok = r.returncode == 0 and dest.exists() and dest.stat().st_size > 1_000_000
    if not ok:
        print(f"  [warn] failed: {url}")
    return ok


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--meetings", type=int, default=12, help="how many meetings to fetch")
    p.add_argument("--out", type=Path, default=DATA_DIR / "ami")
    p.add_argument("--list", action="store_true", help="print plan and exit")
    args = p.parse_args()

    chosen = MEETINGS[: args.meetings]
    per_meeting = len(HEADSETS) + 1
    if args.list:
        print(f"{len(chosen)} meetings x {per_meeting} files (~{per_meeting * 40} MB each)")
        print(f"estimated total: ~{len(chosen) * per_meeting * 40 / 1024:.1f} GB")
        for m in chosen:
            print(" ", m)
        return

    done = 0
    for i, meeting in enumerate(chosen, 1):
        print(f"[{i}/{len(chosen)}] {meeting}")
        mdir = args.out / meeting
        got = 0
        for mic in HEADSETS + [ARRAY]:
            url = f"{MIRROR}/{meeting}/audio/{meeting}.{mic}.wav"
            if fetch(url, mdir / f"{meeting}.{mic}.wav"):
                got += 1
        print(f"    {got}/{per_meeting} files")
        if got == per_meeting:
            done += 1

    print(f"\ncomplete meetings: {done}/{len(chosen)} -> {args.out}")


if __name__ == "__main__":
    main()
