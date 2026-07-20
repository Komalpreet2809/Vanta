"""Cut AMI headset recordings into short single-speaker clips.

Why not use AMI room mics as real mixtures: measured on this corpus, a
close-talking headset explains only a fraction of the room mic even after
time-alignment (correlation ~0.2-0.4) because the two are related by a
reverberant filter and the room mic contains every speaker plus the room. An
SI-SDR target built that way is unreachable, so real-mixture training on AMI is
a dead end without much heavier machinery.

What AMI *does* give us that LibriSpeech cannot: genuine conversational speech.
LibriSpeech is people reading audiobooks calmly; AMI is people in meetings —
interruptions, laughter, filler words, uneven pacing, real emotional range. This
script extracts active single-speaker segments from the headset mics so the
synthesis engine can draw conversational voices with exact ground truth intact.

Output layout mirrors LibriSpeech (speaker/session/clip.wav) so SpeakerIndex
reads it unchanged.

Usage:
    python scripts/segment_ami.py --seconds 8 --max-per-speaker 120
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vanta.config import DATA_DIR, SAMPLE_RATE
from vanta.utils.audio import EPS, peak_normalize


def active_segments(
    wav: np.ndarray,
    sr: int,
    seg_n: int,
    min_rms: float,
    min_active_frac: float,
    max_segments: int,
) -> list[np.ndarray]:
    """Return non-overlapping windows where the speaker is genuinely talking.

    AMI headsets are recorded at wildly different gains (file peaks range from
    0.02 to 0.9 across speakers), so a fixed RMS threshold either finds nothing
    on quiet channels or accepts silence on loud ones. We normalize per file and
    set the speech threshold relative to that file's own loud percentile.
    """
    frame = int(0.05 * sr)
    n_frames = len(wav) // frame
    if n_frames == 0:
        return []
    fr = wav[: n_frames * frame].reshape(n_frames, frame)
    rms = np.sqrt((fr**2).mean(axis=1) + EPS)
    # p95 approximates this speaker's talking level; anything well below it is
    # silence, breath, or bleed from across the table.
    speech_level = float(np.percentile(rms, 95))
    if speech_level <= EPS:
        return []
    thresh = max(min_rms * speech_level, 1e-5)
    active = rms > thresh

    frames_per_seg = max(seg_n // frame, 1)
    out: list[np.ndarray] = []
    f = 0
    while f + frames_per_seg <= n_frames and len(out) < max_segments:
        if active[f : f + frames_per_seg].mean() >= min_active_frac:
            start = f * frame
            seg = wav[start : start + seg_n]
            if len(seg) == seg_n:
                out.append(peak_normalize(seg.astype(np.float32), peak=0.95))
            f += frames_per_seg  # non-overlapping
        else:
            f += 1
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ami-root", type=Path, default=DATA_DIR / "ami")
    p.add_argument("--out", type=Path, default=DATA_DIR / "ami_clips")
    p.add_argument("--seconds", type=float, default=8.0)
    p.add_argument("--max-per-speaker", type=int, default=120)
    p.add_argument("--min-rms", type=float, default=0.15,
                   help="speech threshold as a FRACTION of this file's p95 frame RMS")
    p.add_argument("--min-active-frac", type=float, default=0.6)
    p.add_argument("--min-peak", type=float, default=0.05,
                   help="skip headset channels whose peak is below this (dead mic)")
    args = p.parse_args()

    seg_n = int(args.seconds * SAMPLE_RATE)
    total = 0
    speakers = 0

    meetings = sorted(d for d in args.ami_root.iterdir() if d.is_dir())
    for mdir in meetings:
        meeting = mdir.name
        for spk in range(4):
            src = mdir / f"{meeting}.Headset-{spk}.wav"
            if not src.exists():
                continue
            wav, file_sr = sf.read(str(src), dtype="float32", always_2d=False)
            if wav.ndim > 1:
                wav = wav.mean(axis=1)
            if file_sr != SAMPLE_RATE:
                import soxr

                wav = soxr.resample(wav, file_sr, SAMPLE_RATE, quality="HQ")
            wav = wav.astype(np.float32)

            # Some AMI headset channels barely recorded anything (dead mic or
            # wrong gain) — a file peaking at 0.02 is noise, not speech.
            if float(np.max(np.abs(wav))) < args.min_peak:
                print(f"  {meeting} spk{spk}: skipped (peak too low)")
                continue
            # Normalize so the relative threshold inside active_segments is
            # comparable across speakers.
            wav = peak_normalize(wav, peak=0.95)

            segs = active_segments(
                wav, SAMPLE_RATE, seg_n, args.min_rms,
                args.min_active_frac, args.max_per_speaker,
            )
            if len(segs) < 2:  # need >=2 clips: one for mixture, one for enrollment
                continue

            # speaker/session/clip.wav — same shape as LibriSpeech.
            # AMI meeting ids share a series prefix (ES2002a/b/c/d are the SAME
            # four people in different sessions), so the speaker id drops the
            # trailing session letter. Otherwise one person appears under
            # several ids and can be sampled as their own interferer.
            series = meeting.rstrip("abcdefgh")
            sdir = args.out / f"AMI{series}s{spk}" / meeting
            sdir.mkdir(parents=True, exist_ok=True)
            for i, seg in enumerate(segs):
                sf.write(str(sdir / f"{i:04d}.wav"), seg, SAMPLE_RATE, subtype="PCM_16")
            speakers += 1
            total += len(segs)
            print(f"  {meeting} spk{spk}: {len(segs)} clips")

    hrs = total * args.seconds / 3600
    print(f"\n{speakers} conversational speakers, {total} clips (~{hrs:.1f} h) -> {args.out}")


if __name__ == "__main__":
    main()
