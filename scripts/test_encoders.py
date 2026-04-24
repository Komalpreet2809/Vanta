"""Smoke test: load a real sample from the dev set and run both encoders.

Checks:
    - AudioEncoder produces (B, 512, T') with the expected T' and non-negative
    - AudioDecoder round-trips shape: wav -> enc -> dec -> wav'
    - SpeakerEncoder produces (B, 192) and embeddings are finite
    - Gradient flows through AudioEncoder and AudioDecoder (they're trainable)
    - Gradient is blocked through SpeakerEncoder (frozen)
"""

from __future__ import annotations

import sys
from pathlib import Path

import soundfile as sf
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATASETS_DIR, SAMPLE_RATE
from vanta.models.audio_encoder import AudioEncoder, AudioDecoder, n_frames_for
from vanta.models.speaker_encoder import SpeakerEncoder


def load_sample(split: str = "dev", idx: int = 0):
    base = DATASETS_DIR / "vanta" / split
    mix, sr = sf.read(base / "mixture" / f"{idx:06d}.wav")
    tgt, _ = sf.read(base / "target" / f"{idx:06d}.wav")
    enr, _ = sf.read(base / "enrollment" / f"{idx:06d}.wav")
    assert sr == SAMPLE_RATE, f"expected {SAMPLE_RATE} Hz, got {sr}"
    return (
        torch.tensor(mix, dtype=torch.float32),
        torch.tensor(tgt, dtype=torch.float32),
        torch.tensor(enr, dtype=torch.float32),
    )


def main() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device: {device}")

    mix, tgt, enr = load_sample()
    # batch of 2 (duplicate sample) to prove it handles batching
    mix_b = mix.unsqueeze(0).repeat(2, 1).to(device)
    enr_b = enr.unsqueeze(0).repeat(2, 1).to(device)
    print(f"mixture batch: {tuple(mix_b.shape)}, enrollment batch: {tuple(enr_b.shape)}")

    # ---- AudioEncoder / AudioDecoder ----
    enc = AudioEncoder().to(device)
    dec = AudioDecoder().to(device)
    feat = enc(mix_b)
    print(f"AudioEncoder out: {tuple(feat.shape)}  (non-neg? {bool((feat >= 0).all())})")

    expected_frames = n_frames_for(mix_b.shape[-1])
    assert feat.shape == (2, 512, expected_frames), (
        f"expected (2, 512, {expected_frames}), got {tuple(feat.shape)}"
    )

    wav_back = dec(feat)
    print(f"AudioDecoder out: {tuple(wav_back.shape)}  (input was {tuple(mix_b.shape)})")
    assert wav_back.shape == mix_b.shape, (
        f"encoder->decoder should round-trip shape; got {tuple(wav_back.shape)}"
    )

    # Gradient flow: a dummy loss must push gradients into both modules.
    loss = (wav_back - mix_b).pow(2).mean()
    loss.backward()
    assert enc.conv.weight.grad is not None, "encoder did not receive grad"
    assert dec.deconv.weight.grad is not None, "decoder did not receive grad"
    print(
        f"grad check OK — enc|grad|={enc.conv.weight.grad.abs().mean():.2e}  "
        f"dec|grad|={dec.deconv.weight.grad.abs().mean():.2e}"
    )

    # ---- SpeakerEncoder ----
    spk = SpeakerEncoder().to(device)
    spk_any_trainable = any(p.requires_grad for p in spk.parameters())
    print(f"SpeakerEncoder frozen? {not spk_any_trainable}")

    emb = spk(enr_b)
    print(
        f"SpeakerEncoder out: {tuple(emb.shape)}  "
        f"finite? {bool(torch.isfinite(emb).all())}  "
        f"norm/sample: {emb.norm(dim=-1).tolist()}"
    )
    assert emb.shape == (2, 192), f"expected (2, 192), got {tuple(emb.shape)}"

    # Two identical enrollments -> (nearly) identical embeddings. Cosine sim ~ 1.
    cos = torch.nn.functional.cosine_similarity(emb[0:1], emb[1:2], dim=-1).item()
    print(f"cos-sim(same clip, same clip) = {cos:.4f}  (should be ~1.0)")
    assert cos > 0.999, "embeddings for identical input should be identical"

    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    main()
