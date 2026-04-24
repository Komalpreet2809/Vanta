"""SI-SDR: Scale-Invariant Signal-to-Distortion Ratio.

Standard SI-SDR decomposition (Le Roux et al., 2019):
    s_target = (<estimate, reference> / ||reference||^2) * reference
    e_noise  = estimate - s_target
    SI-SDR   = 10 * log10(||s_target||^2 / ||e_noise||^2)

Why scale-invariant: a volume-matched estimate shouldn't be penalized. Plain
MSE penalizes magnitude differences that are inaudible.

We train by *maximizing* SI-SDR, so the training loss is its negation.

We also zero-mean both signals: a constant DC offset would change ||s||^2 but
is inaudible, and removing it makes the metric more robust.
"""

from __future__ import annotations

import torch

EPS = 1e-8


def _zero_mean(x: torch.Tensor) -> torch.Tensor:
    return x - x.mean(dim=-1, keepdim=True)


def si_sdr(estimate: torch.Tensor, reference: torch.Tensor) -> torch.Tensor:
    """Per-sample SI-SDR in dB. Shapes (B, T) -> (B,)."""
    est = _zero_mean(estimate)
    ref = _zero_mean(reference)

    # Project est onto ref: s_target = (<est, ref> / ||ref||^2) * ref
    dot = (est * ref).sum(dim=-1, keepdim=True)
    ref_energy = (ref * ref).sum(dim=-1, keepdim=True) + EPS
    s_target = dot / ref_energy * ref

    e_noise = est - s_target
    ratio = (s_target.pow(2).sum(dim=-1) + EPS) / (e_noise.pow(2).sum(dim=-1) + EPS)
    return 10 * torch.log10(ratio)


def si_sdr_loss(estimate: torch.Tensor, reference: torch.Tensor) -> torch.Tensor:
    """Mean negative SI-SDR over a batch. Lower is better (goal: minimize)."""
    return -si_sdr(estimate, reference).mean()
