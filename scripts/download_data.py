"""Download and extract the raw datasets Vanta needs.

Sources:
  - LibriSpeech dev-clean  (speech corpus)     OpenSLR #12
  - MUSAN                  (noise corpus)      OpenSLR #17
  - RIR_NOISES             (room impulse resp) OpenSLR #28

Supports resumable downloads (HTTP Range) and skips already-extracted sets.

Usage:
    python scripts/download_data.py                 # all datasets
    python scripts/download_data.py --only librispeech
    python scripts/download_data.py --only musan,rirs
"""

from __future__ import annotations

import argparse
import sys
import tarfile
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

import requests
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from vanta.config import DATA_DIR


@dataclass(frozen=True)
class Dataset:
    key: str
    url: str
    archive_name: str
    extract_marker: str  # relative path that exists once extraction succeeded
    approx_size_mb: int


DATASETS: dict[str, Dataset] = {
    "librispeech": Dataset(
        key="librispeech",
        url="https://www.openslr.org/resources/12/dev-clean.tar.gz",
        archive_name="dev-clean.tar.gz",
        extract_marker="LibriSpeech/dev-clean",
        approx_size_mb=337,
    ),
    "librispeech-train": Dataset(
        key="librispeech-train",
        url="https://www.openslr.org/resources/12/train-clean-100.tar.gz",
        archive_name="train-clean-100.tar.gz",
        extract_marker="LibriSpeech/train-clean-100",
        approx_size_mb=6_300,
    ),
    "librispeech-train-360": Dataset(
        key="librispeech-train-360",
        url="https://www.openslr.org/resources/12/train-clean-360.tar.gz",
        archive_name="train-clean-360.tar.gz",
        extract_marker="LibriSpeech/train-clean-360",
        approx_size_mb=23_000,
    ),
    "musan": Dataset(
        key="musan",
        url="https://www.openslr.org/resources/17/musan.tar.gz",
        archive_name="musan.tar.gz",
        extract_marker="musan/noise",
        approx_size_mb=11_000,
    ),
    "rirs": Dataset(
        key="rirs",
        url="https://www.openslr.org/resources/28/rirs_noises.zip",
        archive_name="rirs_noises.zip",
        extract_marker="RIRS_NOISES/simulated_rirs",
        approx_size_mb=1_000,
    ),
}


def _download_once(url: str, dest: Path) -> None:
    existing = dest.stat().st_size if dest.exists() else 0
    headers = {"Range": f"bytes={existing}-"} if existing else {}
    with requests.get(url, headers=headers, stream=True, timeout=60) as resp:
        # 416 = range past end; file is already fully downloaded.
        if resp.status_code == 416:
            return
        # 206 = partial (resuming), 200 = full download
        if resp.status_code not in (200, 206):
            resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0)) + existing
        mode = "ab" if resp.status_code == 206 else "wb"
        with open(dest, mode) as f, tqdm(
            total=total,
            initial=existing,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc=dest.name,
        ) as bar:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                if not chunk:
                    continue
                f.write(chunk)
                bar.update(len(chunk))


def download(url: str, dest: Path, max_retries: int = 8) -> None:
    """Stream-download with resume support and automatic retry.

    OpenSLR frequently drops connections for large files (MUSAN is 10 GB), so we
    retry with exponential backoff. Each retry resumes from the current file
    size via HTTP Range.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(max_retries):
        try:
            _download_once(url, dest)
            return
        except (requests.exceptions.RequestException, ConnectionError) as e:
            wait = min(60, 2**attempt)
            print(f"\n[retry {attempt + 1}/{max_retries}] {type(e).__name__}: {e}")
            print(f"  waiting {wait}s then resuming from {dest.stat().st_size} bytes")
            time.sleep(wait)
    raise RuntimeError(f"exhausted retries downloading {url}")


def extract(archive: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as zf:
            members = zf.infolist()
            for m in tqdm(members, desc=f"extract {archive.name}"):
                zf.extract(m, out_dir)
    else:
        with tarfile.open(archive, "r:*") as tf:
            members = tf.getmembers()
            for m in tqdm(members, desc=f"extract {archive.name}"):
                tf.extract(m, out_dir, filter="data")


def fetch(ds: Dataset) -> None:
    marker = DATA_DIR / ds.extract_marker
    if marker.exists():
        print(f"[skip] {ds.key}: already extracted at {marker}")
        return

    archive = DATA_DIR / ds.archive_name
    print(f"[{ds.key}] target ~{ds.approx_size_mb} MB -> {archive}")
    download(ds.url, archive)

    print(f"[{ds.key}] extracting...")
    extract(archive, DATA_DIR)

    if not marker.exists():
        raise RuntimeError(f"{ds.key}: extraction finished but marker missing: {marker}")
    print(f"[{ds.key}] done")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only",
        default="",
        help="comma-separated subset of: " + ",".join(DATASETS),
    )
    parser.add_argument(
        "--keep-archives",
        action="store_true",
        help="keep .tar.gz/.zip after extraction (default: delete)",
    )
    args = parser.parse_args()

    selected = [k.strip() for k in args.only.split(",") if k.strip()] or list(DATASETS)
    for key in selected:
        if key not in DATASETS:
            sys.exit(f"unknown dataset: {key}. valid: {list(DATASETS)}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    for key in selected:
        ds = DATASETS[key]
        fetch(ds)
        if not args.keep_archives:
            archive = DATA_DIR / ds.archive_name
            if archive.exists():
                archive.unlink()
                print(f"[{key}] removed archive")


if __name__ == "__main__":
    main()
