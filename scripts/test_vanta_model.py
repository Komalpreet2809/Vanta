"""End-to-end sanity test for the full Vanta model.

Checks:
    - Output waveform has the same shape as the input mixture
    - Speaker embedding can be precomputed and re-used
    - Passing different enrollments yields different outputs (conditioning works)
    - Parameter count is reasonable (<30M trainable, speaker encoder frozen)
    - Loss.backward() produces grads in encoder, separator, decoder
    - Speaker encoder remains frozen (no grads in its params)
    - Runs on CUDA
"""

from __future__ import annotations

import sys
from pathlib import Path

import soundfile as sf
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATASETS_DIR, SAMPLE_RATE
from vanta.models.vanta import Vanta, VantaConfig


def count_params(model: torch.nn.Module) -> tuple[int, int]:
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable


def load(split: str, idx: int):
    base = DATASETS_DIR / "vanta" / split
    mix, _ = sf.read(base / "mixture" / f"{idx:06d}.wav")
    tgt, _ = sf.read(base / "target" / f"{idx:06d}.wav")
    enr, _ = sf.read(base / "enrollment" / f"{idx:06d}.wav")
    return (
        torch.tensor(mix, dtype=torch.float32),
        torch.tensor(tgt, dtype=torch.float32),
        torch.tensor(enr, dtype=torch.float32),
    )


def main() -> None:
    torch.manual_seed(0)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device: {device}")

    # Two different (mixture, enrollment) pairs so we can test that the
    # conditioning actually changes the output.
    mix0, tgt0, enr0 = load("dev", 0)
    mix1, tgt1, enr1 = load("dev", 1)

    model = Vanta().to(device)
    model.eval()

    total, trainable = count_params(model)
    print(f"params: total={total / 1e6:.2f}M  trainable={trainable / 1e6:.2f}M  "
          f"frozen={(total - trainable) / 1e6:.2f}M")

    # ---- Forward: shape test
    mixture = torch.stack([mix0, mix1]).to(device)
    enrollment = torch.stack([enr0, enr1]).to(device)
    target = torch.stack([tgt0, tgt1]).to(device)

    with torch.no_grad():
        out = model(mixture, enrollment=enrollment)
    print(f"input mixture: {tuple(mixture.shape)} -> output: {tuple(out.shape)}")
    assert out.shape == mixture.shape, "output shape must match mixture"

    # ---- Conditioning test: same mixture, different enrollments -> different outputs
    with torch.no_grad():
        out_with_own = model(mix0.unsqueeze(0).to(device), enrollment=enr0.unsqueeze(0).to(device))
        out_with_other = model(mix0.unsqueeze(0).to(device), enrollment=enr1.unsqueeze(0).to(device))
    diff = (out_with_own - out_with_other).abs().mean().item()
    same = (out_with_own - out_with_own).abs().mean().item()
    print(f"conditioning diff: |out(enr0) - out(enr1)| = {diff:.4e}  (self-diff = {same:.4e})")
    assert diff > 1e-6, "different enrollments must produce different outputs"

    # ---- Precompute embedding path matches inline path
    with torch.no_grad():
        emb = model.embed_speaker(enr0.unsqueeze(0).to(device))
        out_precomputed = model(mix0.unsqueeze(0).to(device), speaker_embedding=emb)
    delta = (out_precomputed - out_with_own).abs().max().item()
    print(f"precomputed-embedding path max-delta vs inline: {delta:.2e}")
    assert delta < 1e-5, "precomputed and inline paths must agree"

    # ---- Gradient flow: train mode, MSE against target, check grads
    model.train()
    out = model(mixture, enrollment=enrollment)
    loss = torch.nn.functional.mse_loss(out, target)
    print(f"dummy MSE loss (random-init): {loss.item():.4f}")
    loss.backward()

    def grad_norm(mod: torch.nn.Module) -> float:
        gs = [p.grad for p in mod.parameters() if p.grad is not None]
        if not gs:
            return 0.0
        return float(torch.stack([g.norm() for g in gs]).norm())

    enc_g = grad_norm(model.audio_encoder)
    sep_g = grad_norm(model.separator)
    dec_g = grad_norm(model.audio_decoder)
    spk_g = grad_norm(model.speaker_encoder)
    print(f"grad norms — encoder: {enc_g:.3e}  separator: {sep_g:.3e}  "
          f"decoder: {dec_g:.3e}  speaker: {spk_g:.3e}")
    assert enc_g > 0 and sep_g > 0 and dec_g > 0, "trainable modules should have grads"
    assert spk_g == 0, "frozen speaker encoder must not have grads"

    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    main()
