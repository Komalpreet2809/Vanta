"""Train the ECAPA-TDNN speaker encoder from scratch.

Trains a speaker-classification task over every speaker we have; the
classification head is discarded and the 192-d embedding is what Vanta uses.

Validation is the metric that actually matters for the downstream job, not
classification accuracy: for held-out speakers never seen in training, we
measure the cosine margin between same-speaker and different-speaker pairs.
That margin is precisely what the separator's conditioning and the SepFormer
selector rely on, and it is directly comparable to the pretrained ECAPA
baseline from scripts/bench_speaker_encoder.py.

Usage:
    python scripts/train_speaker_encoder.py --epochs 30 --batch-size 64
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATA_DIR, SAMPLE_RATE
from vanta.data.indexer import NoiseIndex, RirIndex, SpeakerIndex
from vanta.data.speaker_dataset import SpeakerClsDataset
from vanta.models.ecapa_tdnn import AAMSoftmax, EcapaTdnn
from vanta.utils.audio import load_audio, peak_normalize, random_crop


def build_speaker_pool(splits: list[str], include_ami: bool) -> SpeakerIndex:
    """Merge every available LibriSpeech split (+ AMI clips) into one pool."""
    pool: SpeakerIndex | None = None
    for split in splits:
        root = DATA_DIR / "LibriSpeech" / split
        if not root.exists():
            print(f"  [skip] {split} not present")
            continue
        idx = SpeakerIndex.from_librispeech(root)
        print(f"  {split}: {len(idx)} speakers")
        pool = idx if pool is None else pool.merge(idx)
    if include_ami and (DATA_DIR / "ami_clips").exists():
        ami = SpeakerIndex.from_dir(DATA_DIR / "ami_clips")
        print(f"  AMI conversational: {len(ami)} speakers")
        pool = ami if pool is None else pool.merge(ami)
    if pool is None:
        sys.exit("no speaker data found")
    return pool


@torch.no_grad()
def validate(model, val_index: SpeakerIndex, device, trials=300, seconds=4.0, seed=0):
    """Cosine margin on held-out speakers — same protocol as the ECAPA baseline."""
    model.eval()
    rng = np.random.default_rng(seed)
    n = int(seconds * SAMPLE_RATE)
    ids = val_index.ids

    def emb(path):
        w = peak_normalize(random_crop(load_audio(path, SAMPLE_RATE), n, rng))
        t = torch.from_numpy(np.ascontiguousarray(w))[None].to(device)
        return F.normalize(model(t), dim=-1)

    same, diff = [], []
    for _ in range(trials):
        a = ids[int(rng.integers(0, len(ids)))]
        b = a
        while b == a:
            b = ids[int(rng.integers(0, len(ids)))]
        p1, p2 = val_index.sample_two_clips(a, rng)
        q1, _ = val_index.sample_two_clips(b, rng)
        e = emb(p1)
        same.append(float((e * emb(p2)).sum()))
        diff.append(float((e * emb(q1)).sum()))

    same_a, diff_a = np.array(same), np.array(diff)
    model.train()
    return {
        "same": float(same_a.mean()),
        "diff": float(diff_a.mean()),
        "margin": float(same_a.mean() - diff_a.mean()),
        "pair_acc": float((same_a > diff_a).mean()),
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--splits", nargs="+",
                   default=["train-clean-100", "train-clean-360", "train-other-500"])
    p.add_argument("--no-ami", action="store_true")
    p.add_argument("--val-split", default="dev-clean", help="held-out speakers for margin eval")
    p.add_argument("--out", type=Path, default=Path("checkpoints/spk_encoder"))
    p.add_argument("--epochs", type=int, default=30)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--seconds", type=float, default=3.0)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--lr-min", type=float, default=1e-5)
    p.add_argument("--weight-decay", type=float, default=2e-5)
    p.add_argument("--margin", type=float, default=0.2)
    p.add_argument("--scale", type=float, default=30.0)
    p.add_argument("--embed-dim", type=int, default=192)
    p.add_argument("--channels", type=int, default=512)
    p.add_argument("--num-workers", type=int, default=4)
    p.add_argument("--no-augment", action="store_true")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--resume", action="store_true")
    args = p.parse_args()

    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    args.out.mkdir(parents=True, exist_ok=True)

    print("building speaker pool...")
    speakers = build_speaker_pool(args.splits, include_ami=not args.no_ami)
    noise = NoiseIndex.combined(DATA_DIR)
    rirs = RirIndex.from_rirs_noises(DATA_DIR / "RIRS_NOISES")

    ds = SpeakerClsDataset(
        speakers, noise=noise, rirs=rirs, sr=SAMPLE_RATE,
        seconds=args.seconds, augment=not args.no_augment, seed=args.seed,
    )
    print(f"TOTAL: {ds.n_classes} speakers, {len(ds)} clips, "
          f"{len(noise)} noise, {len(rirs)} rirs")

    val_index = SpeakerIndex.from_librispeech(DATA_DIR / "LibriSpeech" / args.val_split)
    print(f"val (held-out): {len(val_index)} speakers")

    loader = DataLoader(
        ds, batch_size=args.batch_size, shuffle=True, drop_last=True,
        num_workers=args.num_workers, pin_memory=True,
        persistent_workers=args.num_workers > 0,
    )

    model = EcapaTdnn(embed_dim=args.embed_dim, channels=args.channels,
                      sample_rate=SAMPLE_RATE).to(device)
    head = AAMSoftmax(args.embed_dim, ds.n_classes,
                      margin=args.margin, scale=args.scale).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"model: {n_params/1e6:.1f}M params")

    opt = torch.optim.AdamW(
        list(model.parameters()) + list(head.parameters()),
        lr=args.lr, weight_decay=args.weight_decay,
    )
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(
        opt, T_max=args.epochs, eta_min=args.lr_min
    )
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")

    start_epoch, best_margin = 1, float("-inf")
    if args.resume and (args.out / "last.pt").exists():
        ck = torch.load(args.out / "last.pt", map_location=device, weights_only=False)
        model.load_state_dict(ck["model_state"])
        head.load_state_dict(ck["head_state"])
        opt.load_state_dict(ck["optimizer_state"])
        sched.load_state_dict(ck["scheduler_state"])
        start_epoch = ck["epoch"] + 1
        best_margin = ck.get("best_margin", float("-inf"))
        print(f"[resume] from epoch {ck['epoch']}, best margin {best_margin:+.3f}")

    (args.out / "config.json").write_text(json.dumps(vars(args), indent=2, default=str))
    log_path = args.out / "train_log.jsonl"

    for epoch in range(start_epoch, args.epochs + 1):
        model.train()
        run_loss, run_correct, run_n = 0.0, 0, 0
        t0 = time.time()
        bar = tqdm(loader, desc=f"epoch {epoch}/{args.epochs}", leave=False)
        for wav, label in bar:
            wav, label = wav.to(device, non_blocking=True), label.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", dtype=torch.bfloat16,
                                enabled=device.type == "cuda"):
                emb = model(wav)
            # AAM in fp32: the margin arithmetic is sensitive in low precision.
            loss = head(emb.float(), label)
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(
                list(model.parameters()) + list(head.parameters()), 5.0
            )
            scaler.step(opt)
            scaler.update()

            with torch.no_grad():
                pred = F.linear(F.normalize(emb.float()),
                                F.normalize(head.weight)).argmax(dim=1)
                run_correct += int((pred == label).sum())
            run_loss += float(loss) * wav.size(0)
            run_n += wav.size(0)
            bar.set_postfix(loss=f"{run_loss/run_n:.3f}", acc=f"{run_correct/run_n:.2%}")

        val = validate(model, val_index, device, seed=args.seed + epoch)
        sched.step()
        entry = {
            "epoch": epoch,
            "loss": run_loss / max(run_n, 1),
            "train_acc": run_correct / max(run_n, 1),
            "val": val,
            "lr": opt.param_groups[0]["lr"],
            "seconds": time.time() - t0,
        }
        with log_path.open("a") as f:
            f.write(json.dumps(entry) + "\n")
        print(f"[e{epoch}] loss {entry['loss']:.3f}  acc {entry['train_acc']:.2%}  "
              f"| val margin {val['margin']:+.3f} (same {val['same']:+.3f} "
              f"diff {val['diff']:+.3f}) pair-acc {val['pair_acc']:.1%}  "
              f"({entry['seconds']:.0f}s)")

        ckpt = {
            "epoch": epoch, "model_state": model.state_dict(),
            "head_state": head.state_dict(), "optimizer_state": opt.state_dict(),
            "scheduler_state": sched.state_dict(), "val": val,
            "best_margin": max(best_margin, val["margin"]),
            "embed_dim": args.embed_dim, "channels": args.channels,
            "n_classes": ds.n_classes,
        }
        torch.save(ckpt, args.out / "last.pt")
        if val["margin"] > best_margin:
            best_margin = val["margin"]
            torch.save(ckpt, args.out / "best.pt")

    print(f"\nbest val margin: {best_margin:+.3f}  "
          f"(pretrained ECAPA baseline: +0.537, pair-acc 99.5%)")


if __name__ == "__main__":
    main()
