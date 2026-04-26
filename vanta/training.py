"""Training loop for Vanta."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import torch
from torch.utils.data import DataLoader, Subset
from tqdm import tqdm

from vanta.losses import si_sdr, si_sdr_loss


@dataclass
class TrainConfig:
    lr: float = 1e-3
    batch_size: int = 4
    val_batch_size: int = 4
    num_epochs: int = 10
    grad_clip: float = 5.0
    val_every: int = 1          # epochs
    save_every: int = 1         # epochs (saves "last.pt" and "best.pt")
    num_workers: int = 0        # Windows + speechbrain + multiprocessing is fragile
    log_every: int = 10         # iterations
    # Mixed precision cuts activation memory ~2x and speeds up matmul/conv
    # heavy models on Ampere/Ada. Essential for Vanta on the 8 GB 4060.
    amp: bool = True
    amp_dtype: str = "bf16"     # "bf16" (no scaler needed, stable) or "fp16"
    # Regularization — added after run 1 overfit hard (val peaked at epoch 4
    # and then slid backward for 6 epochs).
    weight_decay: float = 1e-5
    lr_schedule: str = "cosine"  # "cosine" (anneal to lr_min) or "constant"
    lr_min: float = 1e-5
    # Early stopping: stop after `patience` epochs with no val improvement.
    # Keeps training ~on budget and avoids picking a bad "best" by chance.
    early_stop_patience: int = 5
    # SpecAugment-style time masking on the *encoded* features (not spectrogram).
    # Two time masks per sample, each zeroing up to `specaug_max_width` frames.
    # Applied only during training; off during validation/inference.
    specaug_num_masks: int = 2
    specaug_max_width: int = 40  # at stride 8 and 16 kHz, ~20ms per frame


def _default_collate(batch: list[dict]) -> dict:
    """Stack tensors; drop non-tensor fields (keep speaker id for logging)."""
    return {
        "mixture": torch.stack([b["mixture"] for b in batch]),
        "target": torch.stack([b["target"] for b in batch]),
        "enrollment": torch.stack([b["enrollment"] for b in batch]),
        "target_speaker": [b["target_speaker"] for b in batch],
    }


def train_val_split(dataset, val_fraction: float, seed: int = 0):
    n = len(dataset)
    n_val = int(round(n * val_fraction))
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(n, generator=g).tolist()
    val_idx = perm[:n_val]
    train_idx = perm[n_val:]
    return Subset(dataset, train_idx), Subset(dataset, val_idx)


def _amp_dtype(name: str) -> torch.dtype:
    return {"bf16": torch.bfloat16, "fp16": torch.float16}[name]


def _validate(model, loader, device, cfg: "TrainConfig") -> dict:
    model.eval()
    si_values = []
    amp_on = cfg.amp and device.type == "cuda"
    autocast_ctx = (
        torch.autocast(device_type="cuda", dtype=_amp_dtype(cfg.amp_dtype))
        if amp_on else torch.autocast(device_type="cpu", enabled=False)
    )
    with torch.no_grad(), autocast_ctx:
        for batch in loader:
            mix = batch["mixture"].to(device)
            tgt = batch["target"].to(device)
            enr = batch["enrollment"].to(device)
            est = model(mix, enrollment=enr)
            # Cast back to fp32 for metric computation (log10 on bf16 is lossy).
            si_values.append(si_sdr(est.float(), tgt).cpu())
    si = torch.cat(si_values)
    return {
        "si_sdr_mean": float(si.mean()),
        "si_sdr_median": float(si.median()),
        "loss": float(-si.mean()),
        "n": int(len(si)),
    }


def train(
    model: torch.nn.Module,
    train_ds,
    val_ds,
    cfg: TrainConfig,
    out_dir: Path,
    device: torch.device | None = None,
    resume: bool = False,
) -> dict:
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Only update trainable params — speaker encoder is frozen.
    trainable = [p for p in model.parameters() if p.requires_grad]
    # AdamW applies weight decay correctly (decoupled from gradient step).
    optimizer = torch.optim.AdamW(trainable, lr=cfg.lr, weight_decay=cfg.weight_decay)
    scheduler = (
        torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=cfg.num_epochs, eta_min=cfg.lr_min
        )
        if cfg.lr_schedule == "cosine"
        else None
    )

    # Optional resume from last.pt. We load model + optimizer + scheduler state
    # and pick up from `epoch + 1`. best_si_sdr comes from best.pt if it exists
    # so early-stopping patience is honored across restarts.
    start_epoch = 1
    if resume:
        last_ckpt = out_dir / "last.pt"
        if not last_ckpt.exists():
            print(f"[resume] no last.pt in {out_dir}; starting fresh")
        else:
            ck = torch.load(last_ckpt, map_location=device, weights_only=False)
            model.load_state_dict(ck["model_state"])
            optimizer.load_state_dict(ck["optimizer_state"])
            if scheduler is not None and ck.get("scheduler_state") is not None:
                scheduler.load_state_dict(ck["scheduler_state"])
            start_epoch = int(ck["epoch"]) + 1
            print(f"[resume] loaded epoch {ck['epoch']} from {last_ckpt}; resuming at epoch {start_epoch}")

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
        collate_fn=_default_collate,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=cfg.val_batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
        collate_fn=_default_collate,
    )

    log_path = out_dir / "train_log.jsonl"
    best_si_sdr = float("-inf")
    epochs_since_best = 0
    history = []
    (out_dir / "config.json").write_text(json.dumps(asdict(cfg), indent=2))

    # Restore best val SI-SDR across restarts so early stopping stays meaningful.
    if resume and (out_dir / "best.pt").exists():
        try:
            prev_best = torch.load(
                out_dir / "best.pt", map_location="cpu", weights_only=False
            )
            if prev_best.get("val"):
                best_si_sdr = float(prev_best["val"].get("si_sdr_mean", float("-inf")))
                print(f"[resume] previous best val SI-SDR: {best_si_sdr:+.3f} dB")
        except Exception:
            pass

    amp_on = cfg.amp and device.type == "cuda"
    amp_dtype = _amp_dtype(cfg.amp_dtype)
    # fp16 needs a gradient scaler to avoid underflow; bf16 doesn't.
    scaler = torch.amp.GradScaler("cuda", enabled=amp_on and amp_dtype == torch.float16)

    for epoch in range(start_epoch, cfg.num_epochs + 1):
        model.train()
        running = 0.0
        running_n = 0
        t0 = time.time()
        bar = tqdm(train_loader, desc=f"epoch {epoch}/{cfg.num_epochs}", leave=False)
        for it, batch in enumerate(bar, 1):
            mix = batch["mixture"].to(device)
            tgt = batch["target"].to(device)
            enr = batch["enrollment"].to(device)

            optimizer.zero_grad(set_to_none=True)
            if amp_on:
                with torch.autocast(device_type="cuda", dtype=amp_dtype):
                    est = model(mix, enrollment=enr)
                    # SI-SDR involves a log that's unstable in low precision;
                    # compute the loss in fp32.
                    loss = si_sdr_loss(est.float(), tgt)
            else:
                est = model(mix, enrollment=enr)
                loss = si_sdr_loss(est, tgt)

            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(trainable, cfg.grad_clip)
            scaler.step(optimizer)
            scaler.update()

            running += loss.item() * mix.size(0)
            running_n += mix.size(0)
            if it % cfg.log_every == 0:
                bar.set_postfix(loss=f"{running / running_n:.3f}")

        train_loss = running / max(running_n, 1)

        val = _validate(model, val_loader, device, cfg) if epoch % cfg.val_every == 0 else None
        epoch_time = time.time() - t0
        current_lr = optimizer.param_groups[0]["lr"]
        entry = {
            "epoch": epoch,
            "train_loss": train_loss,
            "train_si_sdr": -train_loss,
            "val": val,
            "seconds": epoch_time,
            "lr": current_lr,
        }
        history.append(entry)
        with log_path.open("a") as f:
            f.write(json.dumps(entry) + "\n")

        msg = f"[e{epoch}] train SI-SDR {-train_loss:+.2f}  lr={current_lr:.1e}  ({epoch_time:.1f}s)"
        if val is not None:
            msg += f"  |  val SI-SDR {val['si_sdr_mean']:+.2f}  (median {val['si_sdr_median']:+.2f})"
        print(msg)

        # LR schedule advances after logging so we log the LR actually used.
        if scheduler is not None:
            scheduler.step()

        if epoch % cfg.save_every == 0:
            torch.save(
                {
                    "epoch": epoch,
                    "model_state": model.state_dict(),
                    "optimizer_state": optimizer.state_dict(),
                    "scheduler_state": scheduler.state_dict() if scheduler else None,
                    "config": asdict(cfg),
                },
                out_dir / "last.pt",
            )
            improved = val is not None and val["si_sdr_mean"] > best_si_sdr
            if improved:
                best_si_sdr = val["si_sdr_mean"]
                epochs_since_best = 0
                torch.save(
                    {"epoch": epoch, "model_state": model.state_dict(), "val": val},
                    out_dir / "best.pt",
                )
            elif val is not None:
                epochs_since_best += 1

        if (
            cfg.early_stop_patience > 0
            and epochs_since_best >= cfg.early_stop_patience
        ):
            print(
                f"[early stop] val SI-SDR hasn't improved in "
                f"{cfg.early_stop_patience} epochs; best = {best_si_sdr:+.3f} dB"
            )
            break

    return {"history": history, "best_val_si_sdr": best_si_sdr}
