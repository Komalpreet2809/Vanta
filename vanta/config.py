"""Global constants for Vanta."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATASETS_DIR = ROOT / "datasets"
CHECKPOINTS_DIR = ROOT / "checkpoints"

SAMPLE_RATE = 16000
CLIP_SECONDS = 4.0
ENROLL_SECONDS = 5.0
