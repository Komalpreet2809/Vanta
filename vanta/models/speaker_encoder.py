"""Pretrained ECAPA-TDNN speaker encoder.

Wraps speechbrain's VoxCeleb-trained ECAPA-TDNN. Given an enrollment clip,
returns a 192-d speaker embedding (the "voice fingerprint").

Frozen by default: fine-tuning speaker encoders during TSE training tends to
destabilize the identity space. We want the fingerprint to stay recognizable.

The checkpoint (~25 MB) downloads on first use to `data/_models/ecapa_voxceleb/`.
"""

from __future__ import annotations

from pathlib import Path

import torch
import torch.nn as nn

from vanta.config import DATA_DIR

ECAPA_EMBED_DIM = 192


class SpeakerEncoder(nn.Module):
    def __init__(
        self,
        savedir: Path | None = None,
        freeze: bool = True,
        run_opts: dict | None = None,
    ):
        super().__init__()
        # Lazy import: loading speechbrain pulls in a lot; we only want it when
        # this class is actually instantiated.
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy

        savedir = savedir or (DATA_DIR / "_models" / "ecapa_voxceleb")
        savedir.mkdir(parents=True, exist_ok=True)
        # COPY instead of SYMLINK — Windows refuses symlinks without admin or
        # Developer Mode, so defaulting to COPY is portable.
        self.encoder = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=str(savedir),
            run_opts=run_opts or {},
            local_strategy=LocalStrategy.COPY,
        )
        self.embed_dim = ECAPA_EMBED_DIM
        self.freeze = freeze
        if freeze:
            for p in self.encoder.parameters():
                p.requires_grad_(False)
            self.encoder.eval()

    def forward(self, wav: torch.Tensor) -> torch.Tensor:
        """wav: (B, T) at 16 kHz. Returns (B, 192) speaker embeddings."""
        if wav.dim() == 3:
            wav = wav.squeeze(1)
        # ECAPA expects (B, T). speechbrain returns (B, 1, 192) -> squeeze.
        if self.freeze:
            with torch.no_grad():
                emb = self.encoder.encode_batch(wav)
        else:
            emb = self.encoder.encode_batch(wav)
        return emb.squeeze(1)

    def train(self, mode: bool = True):
        # If frozen, keep batchnorm/running stats in eval regardless of parent.
        super().train(mode)
        if self.freeze:
            self.encoder.eval()
        return self
