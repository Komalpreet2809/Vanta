"""Learnable time-domain encoder/decoder pair (Conv-TasNet style).

Why a learnable encoder instead of STFT: STFT discards phase, so reconstructions
sound metallic. A 1D-Conv "plays the role" of a filter bank and learns features
that preserve enough information to rebuild clean audio via its transposed twin.

Conv-TasNet defaults (Luo & Mesgarani, 2019):
    num_filters = 512
    kernel_size = 16   (1 ms at 16 kHz)
    stride      = 8    (50% overlap)
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class AudioEncoder(nn.Module):
    """Raw waveform -> non-negative feature map (B, N, T')."""

    def __init__(self, num_filters: int = 512, kernel_size: int = 16, stride: int = 8):
        super().__init__()
        self.num_filters = num_filters
        self.kernel_size = kernel_size
        self.stride = stride
        # bias=False: the output goes through ReLU, a learnable bias adds nothing.
        self.conv = nn.Conv1d(
            in_channels=1,
            out_channels=num_filters,
            kernel_size=kernel_size,
            stride=stride,
            padding=0,
            bias=False,
        )

    def forward(self, wav: torch.Tensor) -> torch.Tensor:
        """wav: (B, T) or (B, 1, T). Returns features (B, N, T')."""
        if wav.dim() == 2:
            wav = wav.unsqueeze(1)
        feat = self.conv(wav)
        # ReLU keeps features non-negative. Masking (later in the TCN) expects
        # the mask to shrink/keep features, not invert their sign.
        return F.relu(feat)


class AudioDecoder(nn.Module):
    """Feature map (B, N, T') -> raw waveform (B, T).

    The transpose of the encoder. We match its kernel_size/stride so that a
    perfectly trained encoder/decoder pair can reconstruct the waveform losslessly.
    """

    def __init__(self, num_filters: int = 512, kernel_size: int = 16, stride: int = 8):
        super().__init__()
        self.num_filters = num_filters
        self.kernel_size = kernel_size
        self.stride = stride
        self.deconv = nn.ConvTranspose1d(
            in_channels=num_filters,
            out_channels=1,
            kernel_size=kernel_size,
            stride=stride,
            padding=0,
            bias=False,
        )

    def forward(self, feat: torch.Tensor) -> torch.Tensor:
        """feat: (B, N, T'). Returns waveform (B, T)."""
        wav = self.deconv(feat)
        return wav.squeeze(1)


def n_frames_for(samples: int, kernel_size: int = 16, stride: int = 8) -> int:
    """Frames produced by a Conv1d with no padding."""
    return (samples - kernel_size) // stride + 1


def expected_output_samples(n_frames: int, kernel_size: int = 16, stride: int = 8) -> int:
    """Samples produced by a ConvTranspose1d (no padding, no output_padding)."""
    return (n_frames - 1) * stride + kernel_size
