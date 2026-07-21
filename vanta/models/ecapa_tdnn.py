"""ECAPA-TDNN speaker encoder, built from scratch.

This replaces the pretrained SpeechBrain ECAPA with our own implementation and
our own weights, so every learned component in Vanta is trained here.

Architecture (Desplanques et al., 2020 — "ECAPA-TDNN: Emphasized Channel
Attention, Propagation and Aggregation"):

    mel-filterbank (80)
      -> Conv1d + ReLU + BN                          (frame-level features)
      -> 3x SE-Res2Block with dilations 2, 3, 4      (multi-scale temporal context)
      -> Multi-layer Feature Aggregation (concat all 3 block outputs)
      -> Conv1d 1536 + ReLU
      -> Attentive Statistics Pooling                (weighted mean + std over time)
      -> BN -> Linear -> BN                          (192-d embedding)

Three ideas do the heavy lifting, and each has a reason:

  Res2Net inside each block splits channels into groups processed at different
  effective receptive fields. Speaker identity lives at several timescales at
  once — glottal texture over milliseconds, prosody over hundreds — and a plain
  TDNN sees only one scale per layer.

  Squeeze-Excitation rescales channels using a summary of the whole utterance,
  letting the network suppress channels dominated by the recording channel
  rather than the speaker.

  Attentive Statistics Pooling learns *which frames matter* when collapsing a
  variable-length utterance to one vector. Silence and noise get low weight;
  voiced, speaker-distinctive frames get high weight. Uniform mean-pooling
  dilutes identity with whatever else is in the clip.

Training uses AAM-Softmax (see AAMSoftmax below), not plain softmax: identity
verification needs an embedding space where *angles* separate speakers, which
plain cross-entropy does not enforce.
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F


class SERes2Block(nn.Module):
    """Dilated Res2Net block with squeeze-excitation, as used in ECAPA-TDNN."""

    def __init__(self, channels: int, kernel: int, dilation: int, scale: int = 8):
        super().__init__()
        assert channels % scale == 0, "channels must divide evenly into scale groups"
        self.scale = scale
        width = channels // scale

        self.conv_in = nn.Conv1d(channels, channels, kernel_size=1)
        self.bn_in = nn.BatchNorm1d(channels)

        # Res2Net: scale-1 convs, each fed the previous group's output, which
        # compounds receptive field within a single block.
        pad = (kernel - 1) * dilation // 2
        self.convs = nn.ModuleList(
            nn.Conv1d(width, width, kernel_size=kernel, dilation=dilation, padding=pad)
            for _ in range(scale - 1)
        )
        self.bns = nn.ModuleList(nn.BatchNorm1d(width) for _ in range(scale - 1))

        self.conv_out = nn.Conv1d(channels, channels, kernel_size=1)
        self.bn_out = nn.BatchNorm1d(channels)

        # Squeeze-excitation over the time-averaged signal.
        bottleneck = max(channels // 8, 16)
        self.se = nn.Sequential(
            nn.Conv1d(channels, bottleneck, kernel_size=1),
            nn.ReLU(),
            nn.Conv1d(bottleneck, channels, kernel_size=1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = F.relu(self.bn_in(self.conv_in(x)))

        chunks = torch.chunk(out, self.scale, dim=1)
        pieces = [chunks[0]]
        prev = None
        for i, (conv, bn) in enumerate(zip(self.convs, self.bns)):
            inp = chunks[i + 1] if prev is None else chunks[i + 1] + prev
            prev = F.relu(bn(conv(inp)))
            pieces.append(prev)
        out = torch.cat(pieces, dim=1)

        out = F.relu(self.bn_out(self.conv_out(out)))
        out = out * self.se(out.mean(dim=2, keepdim=True))
        return out + residual


class AttentiveStatsPool(nn.Module):
    """Pool (B, C, T) -> (B, 2C) as attention-weighted mean and std.

    Attention sees each frame alongside the utterance-level mean and std, so it
    can judge a frame relative to its context rather than in isolation.
    """

    def __init__(self, channels: int, attention_channels: int = 128):
        super().__init__()
        self.attention = nn.Sequential(
            nn.Conv1d(channels * 3, attention_channels, kernel_size=1),
            nn.ReLU(),
            nn.BatchNorm1d(attention_channels),
            nn.Tanh(),
            nn.Conv1d(attention_channels, channels, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        t = x.shape[-1]
        mean = x.mean(dim=2, keepdim=True).expand(-1, -1, t)
        std = x.var(dim=2, keepdim=True).clamp(min=1e-8).sqrt().expand(-1, -1, t)
        alpha = torch.softmax(self.attention(torch.cat([x, mean, std], dim=1)), dim=2)

        w_mean = (x * alpha).sum(dim=2)
        w_var = (x.pow(2) * alpha).sum(dim=2) - w_mean.pow(2)
        return torch.cat([w_mean, w_var.clamp(min=1e-8).sqrt()], dim=1)


class EcapaTdnn(nn.Module):
    """Waveform (B, T) at 16 kHz -> (B, embed_dim) speaker embedding."""

    def __init__(
        self,
        embed_dim: int = 192,
        channels: int = 512,
        n_mels: int = 80,
        sample_rate: int = 16000,
    ):
        super().__init__()
        self.n_mels = n_mels
        self.sample_rate = sample_rate

        # Torchaudio builds the mel filterbank on the fly; registering it as a
        # submodule keeps it on the right device automatically.
        import torchaudio

        self.melspec = torchaudio.transforms.MelSpectrogram(
            sample_rate=sample_rate,
            n_fft=512,
            win_length=400,   # 25 ms
            hop_length=160,   # 10 ms
            f_min=20.0,
            f_max=7600.0,
            n_mels=n_mels,
            power=2.0,
        )

        self.conv1 = nn.Conv1d(n_mels, channels, kernel_size=5, padding=2)
        self.bn1 = nn.BatchNorm1d(channels)

        self.block1 = SERes2Block(channels, kernel=3, dilation=2)
        self.block2 = SERes2Block(channels, kernel=3, dilation=3)
        self.block3 = SERes2Block(channels, kernel=3, dilation=4)

        # Multi-layer feature aggregation: concatenate every block's output so
        # the pooling layer sees shallow and deep representations together.
        self.mfa = nn.Conv1d(channels * 3, 1536, kernel_size=1)
        self.pool = AttentiveStatsPool(1536)
        self.bn_pool = nn.BatchNorm1d(3072)
        self.fc = nn.Linear(3072, embed_dim)
        self.bn_embed = nn.BatchNorm1d(embed_dim)

    def features(self, wav: torch.Tensor) -> torch.Tensor:
        """Log-mel with per-utterance mean normalization (removes channel bias)."""
        if wav.dim() == 3:
            wav = wav.squeeze(1)
        mel = self.melspec(wav).clamp(min=1e-10).log()
        return mel - mel.mean(dim=2, keepdim=True)

    def forward(self, wav: torch.Tensor) -> torch.Tensor:
        x = self.features(wav)
        x = F.relu(self.bn1(self.conv1(x)))

        x1 = self.block1(x)
        x2 = self.block2(x1)
        x3 = self.block3(x2)

        x = F.relu(self.mfa(torch.cat([x1, x2, x3], dim=1)))
        x = self.bn_pool(self.pool(x))
        return self.bn_embed(self.fc(x))


class AAMSoftmax(nn.Module):
    """Additive Angular Margin softmax (ArcFace) head — training only.

    Plain softmax only needs classes to be separable; it leaves no guarantee
    that *unseen* speakers land far apart, which is exactly what verification
    needs. AAM-Softmax L2-normalizes both embeddings and class weights so logits
    become cosines, then subtracts an angular margin from the true class before
    scaling. The model must clear the margin, producing tight within-speaker
    clusters and wide between-speaker angles — the geometry the cosine
    similarity at inference actually relies on.
    """

    def __init__(
        self,
        embed_dim: int,
        n_classes: int,
        margin: float = 0.2,
        scale: float = 30.0,
    ):
        super().__init__()
        self.weight = nn.Parameter(torch.empty(n_classes, embed_dim))
        nn.init.xavier_normal_(self.weight)
        self.margin = margin
        self.scale = scale
        self.cos_m = math.cos(margin)
        self.sin_m = math.sin(margin)
        # Beyond this angle, cos(theta + m) starts increasing again; fall back to
        # a linear penalty to keep gradients pointing the right way.
        self.threshold = math.cos(math.pi - margin)
        self.mm = math.sin(math.pi - margin) * margin

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        cosine = F.linear(
            F.normalize(embeddings), F.normalize(self.weight)
        ).clamp(-1.0 + 1e-7, 1.0 - 1e-7)
        sine = (1.0 - cosine.pow(2)).clamp(min=1e-9).sqrt()
        phi = cosine * self.cos_m - sine * self.sin_m
        phi = torch.where(cosine > self.threshold, phi, cosine - self.mm)

        one_hot = torch.zeros_like(cosine).scatter_(1, labels.view(-1, 1), 1.0)
        logits = (one_hot * phi + (1.0 - one_hot) * cosine) * self.scale
        return F.cross_entropy(logits, labels)
