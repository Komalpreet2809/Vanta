"""Benchmark speaker-embedding discriminability under recording degradation.

Why this exists:
    Analysis of a real phone recording showed the frozen ECAPA encoder gave only
    a ~0.15 cosine margin between the target speaker and the interferer, where
    clean audio typically gives 0.3-0.5. A separator conditioned on an uncertain
    fingerprint hedges — it attenuates everything a little instead of removing
    the interferer. So the embedding, not the separator, is the bottleneck.

What it measures (the number we optimize):
    margin = mean cos(enroll, same-speaker utt) - mean cos(enroll, other-speaker utt)

    Reported for clean audio and for degraded audio (recording-chain augmentation),
    plus an equal-error-rate style accuracy: how often is the same-speaker pair
    scored above the different-speaker pair.

Usage:
    python scripts/bench_speaker_encoder.py --n-speakers 40 --trials 200
    python scripts/bench_speaker_encoder.py --encoder checkpoints/spk_robust/best.pt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import SAMPLE_RATE
from vanta.data.augment import AugConfig, RecordingAugment
from vanta.data.indexer import build_default_indices
from vanta.utils.audio import load_audio, peak_normalize, random_crop


def embed(encoder, wav: np.ndarray, device) -> torch.Tensor:
    t = torch.from_numpy(np.ascontiguousarray(wav))[None].to(device)
    with torch.no_grad():
        e = encoder(t)
    return F.normalize(e, dim=-1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--split", default="dev-clean", help="LibriSpeech split (held-out)")
    p.add_argument("--n-speakers", type=int, default=40)
    p.add_argument("--trials", type=int, default=200)
    p.add_argument("--seconds", type=float, default=5.0)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument(
        "--encoder",
        type=Path,
        default=None,
        help="optional fine-tuned encoder state_dict; default = frozen pretrained ECAPA",
    )
    args = p.parse_args()

    rng = np.random.default_rng(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    idx = build_default_indices(librispeech_split=args.split)
    speakers = idx["speakers"]
    ids = speakers.ids[: args.n_speakers]

    from vanta.models.speaker_encoder import SpeakerEncoder

    enc = SpeakerEncoder(freeze=True).to(device)
    if args.encoder is not None:
        ck = torch.load(args.encoder, map_location=device, weights_only=False)
        state = ck.get("encoder_state", ck.get("model_state", ck))
        enc.load_state_dict(state)
        print(f"loaded fine-tuned encoder: {args.encoder}")
    else:
        print("using frozen pretrained ECAPA (baseline)")
    enc.eval()

    aug = RecordingAugment(AugConfig(enabled=True), SAMPLE_RATE)
    n_samples = int(args.seconds * SAMPLE_RATE)

    def clip_for(spk_id: str) -> tuple[np.ndarray, np.ndarray]:
        a, b = speakers.sample_two_clips(spk_id, rng)
        wa = peak_normalize(random_crop(load_audio(a, SAMPLE_RATE), n_samples, rng))
        wb = peak_normalize(random_crop(load_audio(b, SAMPLE_RATE), n_samples, rng))
        return wa, wb

    def degrade(w: np.ndarray) -> np.ndarray:
        params = aug.sample_params(rng)
        out = aug.apply_linear(w, params)
        out = aug.apply_mixture_only(out, params, rng)
        return peak_normalize(out.astype(np.float32))

    results = {}
    for condition in ("clean", "degraded"):
        same, diff = [], []
        for _ in range(args.trials):
            spk = ids[int(rng.integers(0, len(ids)))]
            other = spk
            while other == spk:
                other = ids[int(rng.integers(0, len(ids)))]

            enroll, same_utt = clip_for(spk)
            other_utt, _ = clip_for(other)

            if condition == "degraded":
                # Enrollment stays as recorded by the user; the *mixture-side*
                # audio is what's degraded — matching deployment.
                same_utt = degrade(same_utt)
                other_utt = degrade(other_utt)

            e = embed(enc, enroll, device)
            same.append(float((e * embed(enc, same_utt, device)).sum()))
            diff.append(float((e * embed(enc, other_utt, device)).sum()))

        same_arr, diff_arr = np.array(same), np.array(diff)
        margin = same_arr.mean() - diff_arr.mean()
        acc = float((same_arr > diff_arr).mean())
        results[condition] = (same_arr.mean(), diff_arr.mean(), margin, acc)
        print(
            f"{condition:9s}  same {same_arr.mean():+.3f}  diff {diff_arr.mean():+.3f}"
            f"  MARGIN {margin:+.3f}  pair-acc {acc:.1%}"
        )

    c, d = results["clean"][2], results["degraded"][2]
    print(f"\ndegradation costs {c - d:+.3f} margin ({(1 - d / c) * 100:.0f}% of clean)")


if __name__ == "__main__":
    main()
