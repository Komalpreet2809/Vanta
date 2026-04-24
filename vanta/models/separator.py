"""TCN separator with speaker conditioning — the "neural spotlight" of Vanta.

Architecture (Conv-TasNet-style):
    encoded mixture (B, N, T')
        -> gLN + bottleneck 1x1 Conv (N -> B_chan)
        -> [R repeats of X stacked TCN blocks with exponentially growing dilation]
           at every block input, add a projected speaker embedding.
        -> PReLU + 1x1 Conv (B_chan -> N) -> ReLU
        -> mask (B, N, T')

The mask is multiplied elementwise with the encoded mixture to produce
speaker-masked features, which the audio decoder turns back into a waveform.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class GlobalLayerNorm(nn.Module):
    """Normalize over both channel and time dimensions (cumulative over time).

    Standard LayerNorm normalizes per time-step, which is brittle when audio
    volume drifts (e.g., someone whispers then shouts). gLN pools stats across
    the entire utterance, giving a single (mean, var) per example — matches the
    "we care about texture, not volume" invariant the plan describes.
    """

    def __init__(self, channels: int, eps: float = 1e-8):
        super().__init__()
        self.eps = eps
        # learnable affine (gamma, beta) per channel
        self.gamma = nn.Parameter(torch.ones(1, channels, 1))
        self.beta = nn.Parameter(torch.zeros(1, channels, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, C, T)
        mean = x.mean(dim=(1, 2), keepdim=True)
        var = x.var(dim=(1, 2), keepdim=True, unbiased=False)
        x = (x - mean) / torch.sqrt(var + self.eps)
        return x * self.gamma + self.beta


class TCNBlock(nn.Module):
    """One dilated convolutional block with speaker conditioning.

    Layout (input -> output):
        + speaker embedding (broadcast over time)
        1x1 Conv  (B_chan -> H)
        PReLU + gLN
        Depthwise 1D Conv with dilation d, kernel P
        PReLU + gLN
        1x1 Conv  (H -> B_chan)                -> residual
    """

    def __init__(
        self,
        b_chan: int,
        h_chan: int,
        kernel: int,
        dilation: int,
        dropout: float = 0.0,
    ):
        super().__init__()
        padding = (kernel - 1) * dilation // 2  # "same" padding for odd kernel

        self.pointwise_in = nn.Conv1d(b_chan, h_chan, kernel_size=1)
        self.prelu1 = nn.PReLU(h_chan)
        self.norm1 = GlobalLayerNorm(h_chan)

        self.depthwise = nn.Conv1d(
            h_chan,
            h_chan,
            kernel_size=kernel,
            padding=padding,
            dilation=dilation,
            groups=h_chan,  # depthwise
        )
        self.prelu2 = nn.PReLU(h_chan)
        self.norm2 = GlobalLayerNorm(h_chan)

        # Channel-wise dropout on the block's output path. Zeros an entire
        # feature channel (not random elements), which preserves the temporal
        # structure the next block expects — the standard choice for 1-D conv
        # nets since Dropout1d. Disabled (p=0) when loading legacy checkpoints
        # so no behavior change at inference.
        self.dropout = nn.Dropout1d(dropout) if dropout > 0 else nn.Identity()

        self.pointwise_out = nn.Conv1d(h_chan, b_chan, kernel_size=1)

    def forward(self, x: torch.Tensor, spk_bias: torch.Tensor) -> torch.Tensor:
        """x: (B, B_chan, T'). spk_bias: (B, B_chan, 1) broadcasts over time."""
        residual = x
        h = x + spk_bias  # the "neural spotlight" reminder
        h = self.pointwise_in(h)
        h = self.norm1(self.prelu1(h))
        h = self.depthwise(h)
        h = self.norm2(self.prelu2(h))
        h = self.dropout(h)
        h = self.pointwise_out(h)
        return residual + h


class Separator(nn.Module):
    """Mask predictor: encoded mixture + speaker embedding -> mask."""

    def __init__(
        self,
        enc_channels: int = 512,        # N — must match AudioEncoder.num_filters
        bottleneck: int = 128,          # B
        hidden: int = 512,              # H
        kernel: int = 3,                # P
        blocks_per_repeat: int = 8,     # X
        repeats: int = 3,               # R
        speaker_dim: int = 192,         # ECAPA-TDNN embedding dim
        dropout: float = 0.0,           # per-block Dropout1d probability
    ):
        super().__init__()
        self.enc_channels = enc_channels

        self.in_norm = GlobalLayerNorm(enc_channels)
        self.in_proj = nn.Conv1d(enc_channels, bottleneck, kernel_size=1)

        # One speaker projection, reused at every block. Fewer params than
        # per-block projections and works just as well in practice.
        self.speaker_proj = nn.Linear(speaker_dim, bottleneck)

        self.blocks = nn.ModuleList()
        for _ in range(repeats):
            for x in range(blocks_per_repeat):
                self.blocks.append(
                    TCNBlock(
                        b_chan=bottleneck,
                        h_chan=hidden,
                        kernel=kernel,
                        dilation=2**x,
                        dropout=dropout,
                    )
                )

        self.out_prelu = nn.PReLU(bottleneck)
        self.out_proj = nn.Conv1d(bottleneck, enc_channels, kernel_size=1)

    def forward(
        self, enc_mix: torch.Tensor, spk_emb: torch.Tensor
    ) -> torch.Tensor:
        """enc_mix: (B, N, T'). spk_emb: (B, speaker_dim). Returns mask (B, N, T')."""
        h = self.in_proj(self.in_norm(enc_mix))

        # Speaker bias computed once; shape (B, B_chan, 1) broadcasts to (B, B_chan, T').
        spk_bias = self.speaker_proj(spk_emb).unsqueeze(-1)

        for block in self.blocks:
            h = block(h, spk_bias)

        mask = self.out_proj(self.out_prelu(h))
        return F.relu(mask)
