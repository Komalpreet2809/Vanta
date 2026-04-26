#!/usr/bin/env bash
# Copy the files the HF Space needs into this directory, overwriting any stale
# copies from a previous build. Run from the repo root:
#
#   bash deploy/hf-space/build.sh
#
# After running, `deploy/hf-space/` is self-contained and ready to `git push`
# to Hugging Face. Re-run any time the model code or checkpoint changes.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

cd "$ROOT"

echo "[build] copying vanta package..."
rm -rf "$HERE/vanta"
mkdir -p "$HERE/vanta"
# Only files needed at inference time — leaves training scripts out of the image.
cp vanta/__init__.py "$HERE/vanta/"
cp vanta/_compat.py "$HERE/vanta/"
cp vanta/config.py "$HERE/vanta/"
cp vanta/inference.py "$HERE/vanta/"
mkdir -p "$HERE/vanta/utils"
cp vanta/utils/__init__.py "$HERE/vanta/utils/"
cp vanta/utils/audio.py "$HERE/vanta/utils/"
mkdir -p "$HERE/vanta/models"
cp vanta/models/__init__.py "$HERE/vanta/models/"
cp vanta/models/audio_encoder.py "$HERE/vanta/models/"
cp vanta/models/separator.py "$HERE/vanta/models/"
cp vanta/models/speaker_encoder.py "$HERE/vanta/models/"
cp vanta/models/vanta.py "$HERE/vanta/models/"
cp vanta/models/sepformer_tse.py "$HERE/vanta/models/"

echo "[build] copying server..."
cp server.py "$HERE/"

echo "[build] copying checkpoint..."
mkdir -p "$HERE/checkpoints"
cp checkpoints/real_v2/best.pt "$HERE/checkpoints/best.pt"

echo "[build] done. contents:"
cd "$HERE" && ls -la
echo
echo "Next: push this directory to your HF Space (see README in repo root)."
