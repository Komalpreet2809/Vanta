"""The full Vanta model: encoder + separator + decoder + speaker encoder.

Forward pass:
    1. Speaker encoder (frozen ECAPA-TDNN) turns the enrollment into a 192-d
       fingerprint. Runs under no_grad so it doesn't train.
    2. Audio encoder turns the mixture into a (B, N, T') feature map.
    3. Separator predicts a mask (B, N, T'), conditioned on the fingerprint.
    4. Mask * features -> masked features.
    5. Audio decoder turns masked features back into a waveform.

Phase 3 deliverable: this runs end-to-end with random init. The weights are
trash (untrained), so the output is garbage audio, but shapes, gradients, and
conditioning pathways must all work.
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn

from vanta.models.audio_encoder import AudioEncoder, AudioDecoder, expected_output_samples
from vanta.models.separator import Separator
from vanta.models.speaker_encoder import SpeakerEncoder


@dataclass
class VantaConfig:
    enc_channels: int = 512
    enc_kernel: int = 16
    enc_stride: int = 8
    bottleneck: int = 128
    hidden: int = 512
    tcn_kernel: int = 3
    blocks_per_repeat: int = 8
    repeats: int = 3
    speaker_dim: int = 192
    freeze_speaker: bool = True
    dropout: float = 0.0


class Vanta(nn.Module):
    def __init__(self, cfg: VantaConfig | None = None):
        super().__init__()
        cfg = cfg or VantaConfig()
        self.cfg = cfg

        self.audio_encoder = AudioEncoder(
            num_filters=cfg.enc_channels,
            kernel_size=cfg.enc_kernel,
            stride=cfg.enc_stride,
        )
        self.audio_decoder = AudioDecoder(
            num_filters=cfg.enc_channels,
            kernel_size=cfg.enc_kernel,
            stride=cfg.enc_stride,
        )
        self.separator = Separator(
            enc_channels=cfg.enc_channels,
            bottleneck=cfg.bottleneck,
            hidden=cfg.hidden,
            kernel=cfg.tcn_kernel,
            blocks_per_repeat=cfg.blocks_per_repeat,
            repeats=cfg.repeats,
            speaker_dim=cfg.speaker_dim,
            dropout=cfg.dropout,
        )
        self.speaker_encoder = SpeakerEncoder(freeze=cfg.freeze_speaker)

    def embed_speaker(self, enrollment: torch.Tensor) -> torch.Tensor:
        """enrollment: (B, T_enroll). Returns (B, speaker_dim)."""
        return self.speaker_encoder(enrollment)

    def forward(
        self, mixture: torch.Tensor, enrollment: torch.Tensor | None = None,
        speaker_embedding: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """Extract the target speaker from the mixture.

        Pass either `enrollment` (we'll encode it) or a precomputed
        `speaker_embedding`. Precomputing is faster when the same enrollment is
        reused across many mixtures (inference-time trick).
        """
        if speaker_embedding is None:
            if enrollment is None:
                raise ValueError("must pass enrollment or speaker_embedding")
            speaker_embedding = self.embed_speaker(enrollment)

        enc = self.audio_encoder(mixture)                       # (B, N, T')
        mask = self.separator(enc, speaker_embedding)           # (B, N, T')
        masked = enc * mask
        wav = self.audio_decoder(masked)                        # (B, T_out)

        # ConvTranspose1d output length may differ from the input waveform by
        # up to (kernel - stride) samples. Align so downstream losses can use
        # the original mixture length directly.
        target_len = mixture.shape[-1]
        if wav.shape[-1] > target_len:
            wav = wav[..., :target_len]
        elif wav.shape[-1] < target_len:
            wav = torch.nn.functional.pad(wav, (0, target_len - wav.shape[-1]))
        return wav
