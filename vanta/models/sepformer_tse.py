"""TSE backbone built on top of SpeechBrain's pretrained SepFormer.

Why this exists:
    Our from-scratch separator hit a hard ceiling at ~+1 dB val SI-SDR because
    20k mixtures of 251 speakers isn't enough variety. SepFormer was pretrained
    by SpeechBrain on much larger speech-separation data. Plugging it in here
    gives us a strong separation backbone; our ECAPA-based speaker selector on
    top is what makes it *target* speaker extraction.

Pipeline:
    mixture_16k                      enrollment_16k
        │                                  │
        ▼                                  ▼
   resample 16→8                     ECAPA-TDNN
        │                                  │
        ▼                                  │
    SepFormer ── 2 separated sources       │
        │       (at 8 kHz)                 │
        ▼                                  │
   resample 8→16                           │
        │                                  │
        ▼                                  │
    ECAPA on each source ──── cosine sim ──┘
        │
        ▼
    pick highest-similarity source = extracted target
    other source                  = residue
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from vanta.config import DATA_DIR, SAMPLE_RATE
from vanta.models.speaker_encoder import SpeakerEncoder

# SpeechBrain's SepFormer family was trained at 8 kHz. We resample on the fly
# so the rest of our pipeline (16 kHz) stays unchanged.
SEPFORMER_SR = 8000

# Default checkpoint. Trained on LibriMix-2mix (clean speech), which is the
# closest match to our LibriSpeech-style mixtures. Other options:
#   "speechbrain/sepformer-wsj02mix"  — WSJ0-2mix
#   "speechbrain/sepformer-whamr"     — WHAMR (with noise+reverb)
#   "speechbrain/sepformer-wham"      — WHAM (with noise)
DEFAULT_SEPFORMER = "speechbrain/sepformer-libri2mix"


def _resample(wav: torch.Tensor, src_sr: int, dst_sr: int) -> torch.Tensor:
    """Resample (B, T) tensors. soxr-on-numpy is faster than torchaudio for
    short clips and our pipeline is already numpy-friendly elsewhere."""
    if src_sr == dst_sr:
        return wav
    import soxr

    device = wav.device
    arr = wav.detach().cpu().numpy().astype(np.float32, copy=False)
    out = np.stack(
        [soxr.resample(x, src_sr, dst_sr, quality="HQ") for x in arr], axis=0
    )
    return torch.from_numpy(out).to(device)


class SepFormerTSE(nn.Module):
    """Pretrained separation + custom speaker selection.

    Inference-only: SepFormer is frozen, ECAPA is frozen. There's nothing here
    to train; this module is a swap-in replacement for the from-scratch model
    when we care about output quality more than "I trained the whole thing."
    """

    def __init__(
        self,
        sepformer_source: str = DEFAULT_SEPFORMER,
        savedir: Path | None = None,
        device: str | torch.device = "auto",
    ):
        super().__init__()
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)

        # Lazy import — speechbrain pulls in a lot.
        from speechbrain.inference.separation import SepformerSeparation
        from speechbrain.utils.fetching import LocalStrategy

        savedir = savedir or (DATA_DIR / "_models" / "sepformer")
        savedir.mkdir(parents=True, exist_ok=True)
        # COPY linker — Windows refuses symlinks without admin.
        self.separator = SepformerSeparation.from_hparams(
            source=sepformer_source,
            savedir=str(savedir),
            run_opts={"device": str(self.device)},
            local_strategy=LocalStrategy.COPY,
        )
        for p in self.separator.parameters():
            p.requires_grad_(False)

        self.speaker_encoder = SpeakerEncoder(freeze=True)
        self.speaker_encoder.to(self.device)

    @torch.no_grad()
    def forward(
        self, mixture: torch.Tensor, enrollment: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, dict]:
        """mixture, enrollment: (B, T) at 16 kHz. Returns (extracted, residue, meta)
        both shaped (B, T) at 16 kHz."""
        if mixture.dim() == 1:
            mixture = mixture.unsqueeze(0)
        if enrollment.dim() == 1:
            enrollment = enrollment.unsqueeze(0)
        mixture = mixture.to(self.device)
        enrollment = enrollment.to(self.device)

        target_len = mixture.shape[-1]

        # Down to SepFormer's native rate, separate, back up to 16 kHz.
        mix_8k = _resample(mixture, SAMPLE_RATE, SEPFORMER_SR)
        # SepFormer's separate_batch returns (B, T, num_sources).
        sources_8k = self.separator.separate_batch(mix_8k)
        # -> (num_sources, B, T) for easier indexing
        num_sources = sources_8k.shape[-1]
        sources_8k = sources_8k.permute(2, 0, 1).contiguous()
        sources_16k = torch.stack(
            [_resample(sources_8k[i], SEPFORMER_SR, SAMPLE_RATE) for i in range(num_sources)],
            dim=0,
        )
        # Trim/pad each source to mixture length.
        if sources_16k.shape[-1] > target_len:
            sources_16k = sources_16k[..., :target_len]
        elif sources_16k.shape[-1] < target_len:
            pad = target_len - sources_16k.shape[-1]
            sources_16k = F.pad(sources_16k, (0, pad))

        # Speaker fingerprints: enrollment, plus one per separated source.
        target_emb = self.speaker_encoder(enrollment)            # (B, 192)
        # source embeddings: shape (num_sources, B, 192)
        src_embs = torch.stack(
            [self.speaker_encoder(sources_16k[i]) for i in range(num_sources)], dim=0
        )

        # Cosine similarity between each source and the target fingerprint.
        # Normalize for numerical stability.
        target_norm = F.normalize(target_emb, dim=-1)
        src_norms = F.normalize(src_embs, dim=-1)
        # (num_sources, B)
        sims = (src_norms * target_norm.unsqueeze(0)).sum(dim=-1)

        # Per-batch-item: pick the source with the highest similarity.
        best_idx = sims.argmax(dim=0)                            # (B,)
        B = mixture.shape[0]
        extracted = torch.stack(
            [sources_16k[best_idx[b], b] for b in range(B)], dim=0
        )
        # Residue = the SUM of all sources that weren't picked. With SepFormer's
        # 2-source output, that's just "the other one." Using mixture-extracted
        # would let target leakage from imperfect separation contaminate the
        # residue (the bug the user reported).
        residue = torch.zeros_like(extracted)
        for b in range(B):
            for i in range(num_sources):
                if i != int(best_idx[b].item()):
                    residue[b] = residue[b] + sources_16k[i, b]

        meta = {
            "num_sources": int(num_sources),
            "similarities": sims.detach().cpu().tolist(),
            "selected": best_idx.detach().cpu().tolist(),
        }
        return extracted, residue, meta
