"""Speech quality metrics for evaluating extracted audio.

- SI-SDR: already in vanta.losses. Re-exported here for a single metrics API.
- STOI:   Short-Time Objective Intelligibility. Numpy-based (pystoi).
- PESQ:   Perceptual Evaluation of Speech Quality. Pure-torch (torch-pesq).

All metrics expect float32 waveforms at 16 kHz.
"""

from __future__ import annotations

import numpy as np
import torch

from vanta.losses import si_sdr

SR = 16000


def stoi_np(estimate: np.ndarray, reference: np.ndarray, extended: bool = False) -> float:
    """Single-utterance STOI in [0, 1]. Higher = more intelligible."""
    from pystoi import stoi as _stoi

    return float(_stoi(reference, estimate, SR, extended=extended))


# torch-pesq has expensive setup; build once and reuse.
_PESQ_LOSS = None


def pesq_torch(estimate: torch.Tensor, reference: torch.Tensor) -> torch.Tensor:
    """PESQ (wb) on 16 kHz float32 tensors. Shapes (B, T) -> (B,).

    torch-pesq returns a *loss* (higher = worse). The public API here returns
    the PESQ *score* itself (higher = better), so we negate and shift.
    The library's output is `4.5 - MOS`, so score = 4.5 - loss.
    """
    global _PESQ_LOSS
    if _PESQ_LOSS is None:
        from torch_pesq import PesqLoss

        _PESQ_LOSS = PesqLoss(factor=1.0, sample_rate=SR).to(estimate.device)

    _PESQ_LOSS.to(estimate.device)
    with torch.no_grad():
        loss = _PESQ_LOSS(reference, estimate)   # (B,)
    return 4.5 - loss


def batch_metrics(
    estimate: torch.Tensor, reference: torch.Tensor
) -> dict[str, torch.Tensor]:
    """Compute all metrics on a batch. Returns per-sample tensors (shape (B,))."""
    est_cpu = estimate.detach().cpu()
    ref_cpu = reference.detach().cpu()

    si = si_sdr(estimate, reference).detach().cpu()
    pesq = pesq_torch(estimate, reference).detach().cpu()
    stoi_vals = torch.tensor(
        [stoi_np(e.numpy(), r.numpy()) for e, r in zip(est_cpu, ref_cpu)]
    )
    return {"si_sdr": si, "pesq": pesq, "stoi": stoi_vals}
