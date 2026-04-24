"""Time one full training step (forward + backward) with/without AMP.

Tells us the real bottleneck before committing to a long training run.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.losses import si_sdr_loss
from vanta.models.vanta import Vanta, VantaConfig


def bench(name: str, model, mix, tgt, enr, amp_dtype: torch.dtype | None, iters: int = 10):
    opt = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=1e-3)
    # warmup
    for _ in range(3):
        opt.zero_grad(set_to_none=True)
        if amp_dtype is not None:
            with torch.autocast(device_type="cuda", dtype=amp_dtype):
                est = model(mix, enrollment=enr)
                loss = si_sdr_loss(est.float(), tgt)
        else:
            est = model(mix, enrollment=enr)
            loss = si_sdr_loss(est, tgt)
        loss.backward()
        opt.step()
    torch.cuda.synchronize()

    t0 = time.time()
    for _ in range(iters):
        opt.zero_grad(set_to_none=True)
        if amp_dtype is not None:
            with torch.autocast(device_type="cuda", dtype=amp_dtype):
                est = model(mix, enrollment=enr)
                loss = si_sdr_loss(est.float(), tgt)
        else:
            est = model(mix, enrollment=enr)
            loss = si_sdr_loss(est, tgt)
        loss.backward()
        opt.step()
    torch.cuda.synchronize()
    dt = (time.time() - t0) / iters
    mem_mb = torch.cuda.max_memory_allocated() / (1024**2)
    print(f"{name:<15}  {dt*1000:7.1f} ms/step  |  peak mem {mem_mb:7.1f} MB")
    torch.cuda.reset_peak_memory_stats()


def try_config(repeats: int, batch: int) -> None:
    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats()
    device = torch.device("cuda")

    cfg = VantaConfig(repeats=repeats)
    model = Vanta(cfg).to(device)
    mix = torch.randn(batch, 64000, device=device)
    tgt = torch.randn(batch, 64000, device=device)
    enr = torch.randn(batch, 80000, device=device)
    try:
        bench(f"R={repeats} B={batch} bf16", model, mix, tgt, enr, torch.bfloat16)
    except torch.cuda.OutOfMemoryError:
        print(f"R={repeats} B={batch} bf16  OOM")
    finally:
        del model, mix, tgt, enr
        torch.cuda.empty_cache()


def main() -> None:
    torch.manual_seed(0)
    # Compare block count (repeats R × X=8) and batch size to find the knee.
    for repeats in (3, 2):
        print(f"\n--- repeats={repeats} (total blocks = {repeats * 8}) ---")
        for batch in (2, 3, 4, 6):
            try_config(repeats, batch)


if __name__ == "__main__":
    main()
