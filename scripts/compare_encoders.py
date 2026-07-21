"""Head-to-head: our from-scratch ECAPA-TDNN vs the pretrained SpeechBrain ECAPA.

Same held-out speakers, same pairs, measured on clean audio AND on audio pushed
through the recording-chain degradation. The degraded column is the one that
matters for Vanta: it's what real phone/laptop recordings look like, and it's
where a clean-audiobook-trained encoder could quietly fall apart.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATA_DIR, SAMPLE_RATE
from vanta.data.augment import AugConfig, RecordingAugment
from vanta.data.indexer import SpeakerIndex
from vanta.utils.audio import load_audio, peak_normalize, random_crop


def evaluate(embed_fn, val_index, aug, rng, trials, n):
    def clip(spk):
        a, b = val_index.sample_two_clips(spk, rng)
        wa = peak_normalize(random_crop(load_audio(a, SAMPLE_RATE), n, rng))
        wb = peak_normalize(random_crop(load_audio(b, SAMPLE_RATE), n, rng))
        return wa, wb

    def degrade(w):
        p = aug.sample_params(rng)
        return peak_normalize(aug.apply_mixture_only(aug.apply_linear(w, p), p, rng).astype(np.float32))

    out = {}
    for cond in ("clean", "degraded"):
        same, diff = [], []
        for _ in range(trials):
            s = val_index.ids[int(rng.integers(0, len(val_index.ids)))]
            o = s
            while o == s:
                o = val_index.ids[int(rng.integers(0, len(val_index.ids)))]
            enr, same_u = clip(s)
            diff_u, _ = clip(o)
            if cond == "degraded":
                same_u, diff_u = degrade(same_u), degrade(diff_u)
            e = embed_fn(enr)
            same.append(float((e * embed_fn(same_u)).sum()))
            diff.append(float((e * embed_fn(diff_u)).sum()))
        sa, da = np.array(same), np.array(diff)
        out[cond] = (sa.mean() - da.mean(), float((sa > da).mean()))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--val-split", default="dev-clean")
    ap.add_argument("--trials", type=int, default=400)
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--ours", type=Path, default=Path("checkpoints/spk_encoder/best.pt"))
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    n = int(args.seconds * SAMPLE_RATE)
    val = SpeakerIndex.from_librispeech(DATA_DIR / "LibriSpeech" / args.val_split)
    aug = RecordingAugment(AugConfig(enabled=True), SAMPLE_RATE)

    # ours
    from vanta.models.ecapa_tdnn import EcapaTdnn

    ck = torch.load(args.ours, map_location=device, weights_only=False)
    ours = EcapaTdnn(embed_dim=ck["embed_dim"], channels=ck["channels"]).to(device).eval()
    ours.load_state_dict(ck["model_state"])

    def emb_ours(w):
        t = torch.from_numpy(np.ascontiguousarray(w))[None].to(device)
        with torch.no_grad():
            return F.normalize(ours(t), dim=-1)

    # pretrained
    from vanta.models.speaker_encoder import SpeakerEncoder

    pre = SpeakerEncoder(freeze=True).to(device).eval()

    def emb_pre(w):
        t = torch.from_numpy(np.ascontiguousarray(w))[None].to(device)
        with torch.no_grad():
            return F.normalize(pre(t), dim=-1)

    r_ours = evaluate(emb_ours, val, aug, np.random.default_rng(0), args.trials, n)
    r_pre = evaluate(emb_pre, val, aug, np.random.default_rng(0), args.trials, n)

    print(f"\nHead-to-head on {len(val)} held-out speakers, {args.trials} trials each\n")
    print(f"{'':22}{'OURS (from scratch)':>22}{'pretrained ECAPA':>20}")
    for cond in ("clean", "degraded"):
        mo, ao = r_ours[cond]
        mp, ap_ = r_pre[cond]
        print(f"{cond+' margin':22}{mo:>+22.3f}{mp:>+20.3f}")
        print(f"{cond+' pair-acc':22}{ao:>21.1%}{ap_:>19.1%}")


if __name__ == "__main__":
    main()
