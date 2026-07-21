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

    @staticmethod
    def load(
        checkpoint: "Path | str | None" = None,
        freeze: bool = True,
        run_opts: dict | None = None,
    ) -> nn.Module:
        """Return a speaker encoder: ours if a checkpoint is given, else pretrained.

        Both expose the same contract — (B, T) waveform at 16 kHz in, (B, 192)
        embedding out — so the separator is indifferent to which one it gets.
        Note that a separator trained against one encoder's embedding space is
        not automatically compatible with another's; see TrainedSpeakerEncoder.
        """
        if checkpoint is None:
            return SpeakerEncoder(freeze=freeze, run_opts=run_opts)
        return TrainedSpeakerEncoder(checkpoint, freeze=freeze)

    def _apply(self, fn, *args, **kwargs):
        # speechbrain's EncoderClassifier keeps its OWN `device` attribute and
        # moves incoming audio onto it. nn.Module.to()/.cpu()/.cuda() only move
        # the weights, so without this the two drift apart and you get
        # "Input type (torch.cuda.FloatTensor) and weight type (torch.FloatTensor)
        # should be the same" — which breaks CPU-only deployments.
        out = super()._apply(fn, *args, **kwargs)
        try:
            dev = next(self.encoder.parameters()).device
            self.encoder.device = dev
            if hasattr(self.encoder, "mods"):
                self.encoder.mods.to(dev)
        except StopIteration:
            pass
        return out


class TrainedSpeakerEncoder(nn.Module):
    """Our own ECAPA-TDNN, trained from scratch (scripts/train_speaker_encoder.py).

    Drop-in replacement for the pretrained wrapper above: same (B, T) -> (B, 192)
    contract, so `Vanta` can take either.

    Compatibility caveat, and it matters: a separator learns to read the specific
    embedding space it trained against. Both encoders emit 192 numbers, but the
    *meaning* of those numbers differs — swapping encoders under a separator that
    never saw this one is a domain shift, not a like-for-like exchange. Expect to
    re-train (or at least fine-tune) the separator after switching.
    """

    def __init__(self, checkpoint: "Path | str", freeze: bool = True):
        super().__init__()
        from vanta.models.ecapa_tdnn import EcapaTdnn

        ck = torch.load(str(checkpoint), map_location="cpu", weights_only=False)
        self.encoder = EcapaTdnn(
            embed_dim=ck.get("embed_dim", ECAPA_EMBED_DIM),
            channels=ck.get("channels", 512),
        )
        self.encoder.load_state_dict(ck["model_state"])
        self.embed_dim = ck.get("embed_dim", ECAPA_EMBED_DIM)
        self.freeze = freeze
        if freeze:
            for p in self.encoder.parameters():
                p.requires_grad_(False)
            self.encoder.eval()

    def forward(self, wav: torch.Tensor) -> torch.Tensor:
        if wav.dim() == 3:
            wav = wav.squeeze(1)
        if self.freeze:
            with torch.no_grad():
                return self.encoder(wav)
        return self.encoder(wav)

    def train(self, mode: bool = True):
        super().train(mode)
        if self.freeze:
            self.encoder.eval()
        return self
