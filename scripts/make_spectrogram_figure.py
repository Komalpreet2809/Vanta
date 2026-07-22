"""Render the mixture / extracted / residue spectrogram figure for the README.

Why a figure at all: GitHub cannot embed an audio player, so a reader has no way
to judge the model without leaving for the live demo. A spectrogram shows the
interfering speaker's energy disappearing, which is the claim the project makes.

Two choices that decide whether the figure is honest:

  Shared colour scale. Each panel is drawn against the same vmin/vmax, taken
  from the mixture. Letting matplotlib autoscale per panel would rescale the
  quiet residue up to full brightness and make a good separation look like a bad
  one (or vice versa) — the panels would no longer be comparable at all.

  Perceptually uniform colormap. 'magma' is monotonic in lightness and safe
  under colour-vision deficiency. The traditional 'jet' rainbow invents banding
  that reads as structure in the data.

Usage:
    python scripts/make_spectrogram_figure.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import SAMPLE_RATE

FG = "#e5e7eb"
MUTED = "#9ca3af"
SURFACE = "#0d1117"  # GitHub dark canvas, so the figure sits flush in the README


def spectrogram_db(wav: np.ndarray, n_fft: int = 512, hop: int = 128) -> np.ndarray:
    """Magnitude STFT in dB. Plain numpy — no extra dependency for one figure."""
    window = np.hanning(n_fft).astype(np.float32)
    frames = 1 + max(0, (len(wav) - n_fft) // hop)
    stft = np.empty((n_fft // 2 + 1, frames), dtype=np.float32)
    for i in range(frames):
        seg = wav[i * hop : i * hop + n_fft] * window
        stft[:, i] = np.abs(np.fft.rfft(seg))
    return 20.0 * np.log10(stft + 1e-6)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", type=Path, default=Path("checkpoints/fully_ours/best.pt"))
    p.add_argument("--speaker-encoder", type=Path, default=Path("checkpoints/spk_encoder/best.pt"))
    p.add_argument("--mixture", type=Path, default=Path("web/public/sample/mixture.wav"))
    p.add_argument("--reference", type=Path, default=Path("web/public/sample/reference.wav"))
    p.add_argument("--out", type=Path, default=Path("docs/spectrogram.png"))
    args = p.parse_args()

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    import torch

    from vanta.inference import _fit, _to_mono_16k, ENROLL_SECONDS
    from vanta.models.vanta import Vanta, VantaConfig
    from vanta.utils.audio import peak_normalize

    # Deliberately not VantaInference.extract(): that peak-normalises the
    # extracted and residue tracks independently so both are audible on
    # playback. Doing so here would gain the quiet residue up to full scale and
    # draw it as bright as the mixture, overstating what the model left behind.
    # The raw decomposition keeps the true relative levels, and satisfies
    # extracted + residue == mixture.
    device = "cuda" if torch.cuda.is_available() else "cpu"
    ck = torch.load(args.checkpoint, map_location=device, weights_only=False)
    model = Vanta(
        VantaConfig(repeats=3, speaker_encoder_ckpt=str(args.speaker_encoder))
    ).to(device)
    model.load_state_dict(ck["model_state"])
    model.eval()

    mixture = _to_mono_16k(args.mixture.read_bytes())
    enrollment = peak_normalize(
        _fit(_to_mono_16k(args.reference.read_bytes()), int(ENROLL_SECONDS * SAMPLE_RATE))
    )

    with torch.no_grad():
        est = model(
            torch.from_numpy(mixture)[None].to(device),
            enrollment=torch.from_numpy(enrollment)[None].to(device),
        ).float().squeeze(0).cpu().numpy()

    # Least-squares alignment, exactly as inference.py does before subtracting.
    alpha = float(np.dot(mixture[: len(est)], est)) / (float(np.dot(est, est)) + 1e-8)
    extracted = (alpha * est).astype(np.float32)
    residue = mixture[: len(extracted)] - extracted

    n = min(len(mixture), len(extracted), len(residue))
    panels = [
        ("Mixture (input)", mixture[:n]),
        ("Extracted (target speaker)", extracted[:n]),
        ("Residue (what was removed)", residue[:n]),
    ]
    specs = [(title, spectrogram_db(w)) for title, w in panels]

    # One scale for every panel, anchored to the mixture — see module docstring.
    ref = specs[0][1]
    vmax = float(np.percentile(ref, 99.5))
    vmin = vmax - 60.0

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.0), facecolor=SURFACE)
    duration = n / SAMPLE_RATE

    for ax, (title, spec) in zip(axes, specs):
        ax.imshow(
            spec, origin="lower", aspect="auto", cmap="magma", vmin=vmin, vmax=vmax,
            extent=(0.0, duration, 0.0, SAMPLE_RATE / 2000.0),
        )
        ax.set_facecolor(SURFACE)
        ax.set_title(title, color=FG, fontsize=11, pad=10, fontweight="bold", loc="left")
        ax.set_xlabel("time (s)", color=MUTED, fontsize=9)
        ax.tick_params(colors=MUTED, labelsize=8, length=3)
        for side in ax.spines.values():
            side.set_color("#30363d")

    axes[0].set_ylabel("frequency (kHz)", color=MUTED, fontsize=9)
    for ax in axes[1:]:
        ax.set_yticklabels([])

    fig.suptitle(
        "One colour scale across all panels, at true relative levels — brightness is comparable",
        color=MUTED, fontsize=9, y=0.02,
    )
    fig.tight_layout(rect=(0, 0.04, 1, 1))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.out, dpi=110, facecolor=SURFACE, bbox_inches="tight")
    print(f"wrote {args.out}  ({duration:.1f}s, {n} samples)")


if __name__ == "__main__":
    main()
