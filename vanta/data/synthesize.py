"""The Vanta synthesis engine.

Produces training triples:
    mixture       = RIR(s_target) + alpha * RIR(s_interference) + beta * noise
    clean_target  = RIR(s_target)                               (reverberant label)
    enrollment    = s_target_other_clip                         (clean, different utterance)

Why the label is the *reverberant* target, not the dry one: the model's job is to
isolate who is speaking in this specific acoustic scene. Asking it to also
dereverberate is a separate (harder) task.

Why the enrollment is clean: in deployment, the user provides a good-quality
reference clip. Keeping it clean matches that use case.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

from vanta.data.augment import AugConfig, RecordingAugment
from vanta.data.indexer import NoiseIndex, RirIndex, SpeakerIndex
from vanta.utils.audio import (
    EPS,
    fix_length,
    load_audio,
    peak_normalize,
    random_crop,
    rms,
    scale_to_snr,
)


@dataclass
class MixConfig:
    sr: int = 16000
    clip_seconds: float = 4.0
    enroll_seconds: float = 5.0
    # SNR ranges are (min, max) in dB; sampled uniformly.
    interference_snr_db: tuple[float, float] = (-5.0, 5.0)
    noise_snr_db: tuple[float, float] = (5.0, 20.0)
    use_noise: bool = True
    use_rir: bool = True
    rir_prob: float = 0.8
    # Mixture peak to prevent clipping on save. Label/enrollment get the same
    # scalar applied, so the loss remains consistent.
    mixture_peak: float = 0.95
    # Recording-chain augmentation — degrades mixtures to mimic real recordings
    # (mic coloration, band-limiting, codec crunch, room tone) so the model
    # generalizes off LibriSpeech. Disabled by default; enable via AugConfig.
    augment: AugConfig = field(default_factory=AugConfig)
    # Partial-overlap (turn-taking) augmentation. Real conversations alternate;
    # fully-overlapped training never teaches "output silence when the target
    # is silent", so the model passes alternating speech straight through.
    # With this prob, each speaker is active only in a random contiguous span.
    partial_overlap_prob: float = 0.0
    # Each speaker's active span covers at least this fraction of the clip.
    min_active_frac: float = 0.35

    @property
    def clip_samples(self) -> int:
        return int(self.sr * self.clip_seconds)

    @property
    def enroll_samples(self) -> int:
        return int(self.sr * self.enroll_seconds)


@dataclass
class MixResult:
    mixture: np.ndarray
    target: np.ndarray
    enrollment: np.ndarray
    meta: dict = field(default_factory=dict)


class Mixer:
    def __init__(
        self,
        cfg: MixConfig,
        speakers: SpeakerIndex,
        noise: NoiseIndex | None = None,
        rirs: RirIndex | None = None,
        seed: int = 0,
    ):
        self.cfg = cfg
        self.speakers = speakers
        self.noise = noise if (noise is not None and cfg.use_noise) else None
        self.rirs = rirs if (rirs is not None and cfg.use_rir) else None
        self.rng = np.random.default_rng(seed)
        self.augment = (
            RecordingAugment(cfg.augment, cfg.sr) if cfg.augment.enabled else None
        )

    def _load_clip(self, path: Path, n_samples: int) -> np.ndarray:
        wav = load_audio(path, self.cfg.sr)
        return random_crop(wav, n_samples, self.rng)

    def _apply_rir(self, wav: np.ndarray) -> np.ndarray:
        """Convolve with a random RIR, then re-trim to original length.

        We keep only the first len(wav) samples of the convolution. This drops
        the RIR tail but preserves exact alignment with the dry signal, which
        matters for SI-SDR training.
        """
        if self.rirs is None or self.rng.random() > self.cfg.rir_prob:
            return wav
        rir_path = self.rirs.sample(self.rng)
        rir = load_audio(rir_path, self.cfg.sr)
        # Normalize RIR energy so convolution doesn't explode volumes.
        rir = rir / (np.max(np.abs(rir)) + EPS)
        conv = fftconvolve(wav, rir, mode="full")[: len(wav)]
        return conv.astype(np.float32)

    def _sample_snr(self, lo_hi: tuple[float, float]) -> float:
        lo, hi = lo_hi
        return float(self.rng.uniform(lo, hi))

    def _activity_mask(self, n: int) -> np.ndarray:
        """Random contiguous active span covering >= min_active_frac of the clip,
        with 50 ms fade ramps so masking doesn't click."""
        frac = float(self.rng.uniform(self.cfg.min_active_frac, 1.0))
        span = int(n * frac)
        start = int(self.rng.integers(0, n - span + 1))
        mask = np.zeros(n, dtype=np.float32)
        mask[start : start + span] = 1.0
        ramp = min(int(0.05 * self.cfg.sr), max(span // 4, 1))
        fade = np.linspace(0.0, 1.0, ramp, dtype=np.float32)
        mask[start : start + ramp] *= fade
        mask[start + span - ramp : start + span] *= fade[::-1]
        return mask

    def mix(self) -> MixResult:
        cfg = self.cfg

        # --- target (mixture clip + enrollment clip, same speaker, different utterances)
        tgt_id = self.speakers.sample_speaker(self.rng)
        tgt_mix_path, enroll_path = self.speakers.sample_two_clips(tgt_id, self.rng)
        target_dry = self._load_clip(tgt_mix_path, cfg.clip_samples)
        enrollment = self._load_clip(enroll_path, cfg.enroll_samples)

        # --- interference (different speaker)
        intf_id = self.speakers.sample_interference_speaker(tgt_id, self.rng)
        intf_path, _ = self.speakers.sample_two_clips(intf_id, self.rng)
        intf_dry = self._load_clip(intf_path, cfg.clip_samples)

        # --- apply (independent) RIRs to each source in the scene
        target = self._apply_rir(target_dry)
        intf = self._apply_rir(intf_dry)

        # --- scale interference to hit a random target-vs-interference SNR
        snr_intf = self._sample_snr(cfg.interference_snr_db)
        intf_scaled = scale_to_snr(target, intf, snr_intf)

        # --- partial-overlap (turn-taking): each speaker active only in a random
        # span. The label is the MASKED target, so the model learns to output
        # silence where the target isn't speaking — the behavior real
        # conversations demand and full-overlap training never teaches.
        overlapped = self.rng.random() < cfg.partial_overlap_prob
        if overlapped:
            target = target * self._activity_mask(len(target))
            intf_scaled = intf_scaled * self._activity_mask(len(intf_scaled))

        # --- optional non-speech noise
        noise_scaled = np.zeros_like(target)
        snr_noise = None
        if self.noise is not None:
            noise_path = self.noise.sample(self.rng)
            noise_raw = load_audio(noise_path, cfg.sr)
            if len(noise_raw) == 0 or rms(noise_raw) < EPS:
                pass  # silent or empty noise file; leave as zeros
            else:
                noise_crop = random_crop(noise_raw, cfg.clip_samples, self.rng)
                snr_noise = self._sample_snr(cfg.noise_snr_db)
                # SNR is target-vs-noise, not (target+intf)-vs-noise, so the
                # noise level stays consistent regardless of interference.
                noise_scaled = scale_to_snr(target, noise_crop, snr_noise)

        # --- mix and scale everything so the mixture peak is within bounds.
        # The same scalar is applied to the label, so amplitude ratios are
        # preserved end-to-end.
        mixture = target + intf_scaled + noise_scaled

        # --- recording-chain augmentation (mimic real recordings) ---
        if self.augment is not None:
            # Linear coloring (EQ/band-limit) applies to mixture AND target with
            # the SAME params: the model works within the recorded band instead
            # of being asked to invent bandwidth the "mic" never captured.
            lin = self.augment.sample_params(self.rng)
            mixture = self.augment.apply_linear(mixture, lin)
            target = self.augment.apply_linear(target, lin)
            # Non-linear junk (clip/codec/room-tone) is captured signal to clean
            # off — mixture only, target stays the clean reference.
            mixture = self.augment.apply_mixture_only(mixture, lin, self.rng)
            # Enrollment gets its own independent chain so the speaker fingerprint
            # is robust to a real-mic reference clip.
            enr_params = self.augment.sample_params(self.rng)
            enrollment = self.augment.apply_linear(enrollment, enr_params)
            enrollment = self.augment.apply_mixture_only(enrollment, enr_params, self.rng)

        peak = float(np.max(np.abs(mixture)))
        if peak > cfg.mixture_peak:
            scale = cfg.mixture_peak / peak
            mixture = mixture * scale
            target = target * scale

        enrollment = peak_normalize(enrollment, peak=0.95)
        enrollment = fix_length(enrollment, cfg.enroll_samples)

        return MixResult(
            mixture=mixture.astype(np.float32),
            target=target.astype(np.float32),
            enrollment=enrollment.astype(np.float32),
            meta={
                "target_speaker": tgt_id,
                "interference_speaker": intf_id,
                "target_mix_clip": str(tgt_mix_path),
                "enroll_clip": str(enroll_path),
                "interference_clip": str(intf_path),
                "snr_interference_db": snr_intf,
                "snr_noise_db": snr_noise,
                "rir_applied": self.rirs is not None,
                "partial_overlap": overlapped,
            },
        )
