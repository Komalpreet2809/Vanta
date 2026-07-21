# Vanta — Target Speaker Extraction

![Vanta](vantaimage.png)

A neural system that isolates one specific voice from a noisy recording. Give it a short reference clip of the target speaker and a messy mixture; it returns only that person's voice, plus a residue track of everything it removed.

Both learned components — the separator and the speaker encoder — are **trained from scratch in this repository**. No pretrained weights run in production.

**Live demo** → [vanta.komalpreet.me](https://vanta.komalpreet.me)
**Backend API** → [komalsohal-vanta.hf.space](https://komalsohal-vanta.hf.space) (FastAPI on Hugging Face Spaces)

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Architecture](#architecture)
3. [Training](#training)
4. [Results](#results)
5. [Repository layout](#repository-layout)
6. [Running locally](#running-locally)
7. [Reproducing the training](#reproducing-the-training)
8. [Deployment](#deployment)
9. [Limitations](#limitations)

---

## How it works

Unlike blind noise cancellation (Krisp, Zoom), Vanta is **informed** — it needs a voice fingerprint to know *who* to keep.

| Input | Description |
|---|---|
| **Reference** | ~5 seconds of the target speaker, alone |
| **Mixture** | The noisy recording (up to 30 seconds) |

The model returns the target speaker's voice, and optionally a residue track. Because the estimate is aligned to the mixture before subtracting, `extracted + residue` reconstructs the input exactly.

Nothing here is speaker-specific: neither model has seen the people it is used on. Identity arrives at inference time as the reference clip, so any voice works.

---

## Architecture

```
                            mixture wav (B, T)
                                   │
                                   ▼
                      ┌────────────────────────┐
                      │ 1-D Conv Audio Encoder │  512 filters, kernel 16, stride 8
                      └────────────┬───────────┘
                                   │  (B, 512, T')
                                   ▼
reference ─▶ ECAPA-TDNN  ─▶ 192-d ──▶ TCN Separator
             (ours, 6.0M,           24 dilated-conv blocks (3 × 8, dilation 2^k)
              trained here)         speaker-conditioned (additive bias per block)
                                   │
                                   ▼
                          predicted mask (B, 512, T')
                                   │
                            enc × mask
                                   │
                      ┌────────────▼───────────┐
                      │  Transposed 1-D Conv   │  (decoder, mirror of encoder)
                      └────────────┬───────────┘
                                   │
                                   ▼
                          extracted wav (B, T)
```

**9.5M parameters total** — 3.5M separator + 6.0M speaker encoder, all trained here.

### Speaker encoder ([`vanta/models/ecapa_tdnn.py`](vanta/models/ecapa_tdnn.py))

ECAPA-TDNN following Desplanques et al. (2020): SE-Res2Net blocks at dilations 2/3/4, multi-layer feature aggregation, attentive statistics pooling → 192-d embedding. Trained with **AAM-Softmax** rather than plain softmax, because verification needs an embedding space where *angles* separate unseen speakers — cross-entropy alone only requires that training classes be separable.

### Design decisions

| Choice | Reason |
|---|---|
| Time-domain 1-D conv encoder | Learns its own basis; no STFT phase to reconstruct, unlike spectrogram masking (VoiceFilter) |
| Per-block speaker conditioning | Fingerprint injected at every TCN block, so the model is reminded *who* to keep at every layer |
| Global Layer Norm between blocks | Pools statistics across the whole utterance — texture matters, absolute volume does not |
| SI-SDR loss | Scale-invariant, so a volume-matched estimate isn't penalised |
| Attentive stats pooling (encoder) | Learns which frames carry identity; uniform mean-pooling dilutes it with silence |

---

## Training

Both models train on synthetic mixtures. Real recordings cannot supply the per-source ground truth SI-SDR needs — this was verified on AMI, where a close-talking headset explains only ~0.2–0.4 correlation of the room mic even after time alignment, because the two are related by a reverberant filter.

### Data sources

| Corpus | Contribution |
|---|---|
| [LibriSpeech](https://openslr.org/12) `train-clean-100/360/500` | 1,552 speakers of read English |
| [AMI Meeting Corpus](https://groups.inf.ed.ac.uk/ami/corpus/) headsets | 31 speakers of *conversational* speech — interruptions, laughter, fillers |
| [WHAM!](http://wham.whisper.ai/) | 15,000 real ambient recordings (cafés, streets, offices) |
| [MUSAN](https://openslr.org/17) noise | 930 ambient clips |
| [RIRS_NOISES](https://openslr.org/28) | 60,218 room impulse responses, simulated **and** real measured rooms |

### Mixture synthesis

[`vanta/data/synthesize.py`](vanta/data/synthesize.py) generates a **fresh mixture per training step** — nothing is cached to disk, so the model cannot memorise a fixed set:

```
y = mask_t · RIR(s_target) + mask_i · α · RIR(s_interference) + β · noise
```

| Stage | Detail |
|---|---|
| Speakers | Target and interferer drawn from different speakers |
| Reverberation | Independent RIR per source, 80% probability |
| Interference SNR | **[0, +10] dB** — the target is never quieter than the interferer |
| Noise SNR | [+5, +20] dB |
| Turn-taking | 50% of mixtures mask each speaker to a random active span |
| Recording chain | Mic EQ tilt, band-limiting, soft clipping, µ-law codec, noise floor |
| Enrollment | A separate clip of the same target speaker |

Two of these deserve explanation, because both came from diagnosed failures:

**Interference SNR excludes the target being quieter.** Training on [−5, +5] dB — where the interferer can be *louder* — produced a model that scored **+1.2 dB** and hedged on everything. Restricting to the realistic regime, where the target is the prominent speaker, took it to **+7.1 dB**. The cost is honest: extracting a voice buried under a louder one is out of distribution.

**Turn-taking exists because full-overlap training never teaches silence.** With both speakers always active, the model never learns to output *nothing* when the target stops — so on real conversation it passed the other person's turns straight through. Masking each speaker to a random span fixes that, and the label is masked identically so the target is genuinely silent where it should be.

Recording-chain augmentation ([`vanta/data/augment.py`](vanta/data/augment.py)) splits into linear ops (EQ, band-limiting) applied to mixture **and** target alike — the model shouldn't be asked to invent bandwidth the mic never captured — and mixture-only ops (clipping, codec, noise floor) that become artifacts to clean off.

### Training runs

Both models were trained on a single **RTX 4060 Laptop (8 GB)**.

| | Separator | Speaker encoder |
|---|---|---|
| Params | 3.5M | 6.0M |
| Speakers | 952 | 1,583 |
| Epochs | 40 (warm-started) | 20 |
| Batch | 4, 3-second clips | 64, 2.5-second clips |
| Optimiser | AdamW, cosine LR 5e-4 → 1e-5 | AdamW, cosine LR 1e-3 → 1e-5 |
| Loss | SI-SDR | AAM-Softmax (m=0.2, s=30) |
| Precision | bf16 mixed | bf16 mixed |
| Wall clock | ~4 h | ~7 h |

The 8 GB VRAM ceiling shapes several choices: 3-second training clips (4-second clips at 24 blocks push allocation past 91% and throughput collapses), gradient accumulation for a larger effective batch, and bf16 throughout.

---

## Results

Evaluated on 500 held-out mixtures from speakers never seen in training, on the realistic benchmark (real noise, real and simulated rooms, turn-taking, recording-chain degradation):

| Metric | Value |
|---|---|
| SI-SDR (mean) | **+8.45 dB** |
| SI-SDR (median) | **+9.28 dB** |
| Improvement over input mixture | **+5.50 dB** |
| PESQ | 1.247 |
| STOI | 0.751 |
| Target energy captured | 84.3% |

### Speaker encoder vs. pretrained ECAPA

Replacing SpeechBrain's pretrained ECAPA with the encoder trained here *improved* every separation metric (+7.93 → +8.45 dB SI-SDR, PESQ 1.182 → 1.247, STOI 0.739 → 0.751) and made CPU inference ~6× faster. Head-to-head on 40 held-out speakers ([`scripts/compare_encoders.py`](scripts/compare_encoders.py)):

| | ours | pretrained ECAPA |
|---|---|---|
| clean margin | **+0.607** | +0.526 |
| clean pair-accuracy | **99.8%** | 99.2% |
| degraded margin | **+0.538** | +0.449 |
| degraded pair-accuracy | 98.0% | **99.2%** |

The pretrained encoder stays slightly more reliable on hard degraded pairs — what VoxCeleb's ~4× larger speaker count buys. This evaluation is also LibriSpeech throughout, the domain our encoder trained on, so it does not settle behaviour on arbitrary real-world recordings.

Note that swapping encoders is not free: the separator learns to read one embedding space, and switching without retraining cost 2.8 dB (+8.00 → +5.23). The two checkpoints are trained together and deploy as a pair.

### Which model is actually serving

Production runs the from-scratch models above. A pretrained SepFormer backend also exists in the codebase but is **not active**, and there is deliberately **no automatic fallback** — silently serving pretrained output while presenting it as the trained model would misrepresent what users receive. Switching is a manual operator decision, and [`/health`](https://komalsohal-vanta.hf.space/health) always reports which backend is live.

---

## Repository layout

```
vanta/
├── config.py                # Paths, sample rate (16 kHz)
├── losses.py                # SI-SDR loss
├── metrics.py               # SI-SDR + PESQ + STOI
├── training.py              # Train loop — AMP, grad accumulation, cosine LR, resume
├── inference.py             # Checkpoint loading, audio decode, extract + residue
├── data/
│   ├── indexer.py           # Speaker/Noise/RIR indices, cached to JSON
│   ├── synthesize.py        # Mixture synthesiser (reverb, SNR, turn-taking)
│   ├── augment.py           # Recording-chain degradation
│   ├── dynamic_dataset.py   # Fresh mixture per __getitem__ (training)
│   ├── dataset.py           # Fixed manifest reader (validation)
│   ├── speaker_dataset.py   # Speaker-classification data for the encoder
│   └── ami.py               # AMI real-recording loader (see Training notes)
├── models/
│   ├── audio_encoder.py     # 1-D Conv encoder + transposed-conv decoder
│   ├── ecapa_tdnn.py        # Our ECAPA-TDNN + AAM-Softmax head
│   ├── speaker_encoder.py   # Encoder wrappers (ours / pretrained)
│   ├── separator.py         # TCN blocks, gLN, speaker-conditioned mask
│   ├── sepformer_tse.py     # Pretrained fallback backend (not active)
│   └── vanta.py             # Top-level model
└── utils/audio.py           # Load/save, resample, SNR scaling, peak norm

scripts/
├── download_data.py         # Resumable download of speech/noise/RIR corpora
├── download_ami.py          # AMI meeting audio
├── segment_ami.py           # AMI headsets → single-speaker clips
├── build_dataset.py         # Generate a fixed manifest (validation sets)
├── train.py                 # Separator training CLI
├── train_speaker_encoder.py # Speaker encoder training CLI
├── evaluate.py              # SI-SDR / PESQ / STOI on a manifest
├── compare_encoders.py      # Head-to-head vs. pretrained ECAPA
├── bench_speaker_encoder.py # Embedding discriminability under degradation
├── bench_step.py            # Per-batch throughput + VRAM
└── test_*.py                # Smoke tests for encoders and the full model

server.py                    # FastAPI — /health and /extract
web/                         # Next.js + Tailwind frontend
deploy/hf-space/             # Docker bundle pushed to Hugging Face Spaces
```

---

## Running locally

**Prerequisites:** Python 3.11+, Node 20+, git-lfs, CUDA GPU (training only)

```bash
python -m venv .venv
.venv/Scripts/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
.venv/Scripts/pip install -r requirements.txt

# Inference server — defaults to the from-scratch separator + encoder pair
.venv/Scripts/python -m uvicorn server:app --port 8000

# Frontend
cd web && npm install && npm run dev   # http://localhost:3000
```

`GET /health` reports which checkpoints are loaded. Environment overrides:

| Variable | Default | Meaning |
|---|---|---|
| `VANTA_BACKEND` | `trained` | `trained` or `sepformer` |
| `VANTA_CHECKPOINT` | `checkpoints/fully_ours/best.pt` | Separator weights |
| `VANTA_SPK_ENCODER` | `checkpoints/spk_encoder/best.pt` | Speaker encoder; unset uses pretrained ECAPA |

---

## Reproducing the training

```bash
# 1. Corpora (~50 GB; all resumable)
.venv/Scripts/python scripts/download_data.py
.venv/Scripts/python scripts/download_ami.py --meetings 20
.venv/Scripts/python scripts/segment_ami.py --seconds 8

# 2. Fixed validation set (training mixtures are generated on the fly)
.venv/Scripts/python scripts/build_dataset.py --n 500 --out datasets/vanta --split dev \
  --source dev-clean --intf-snr 0 10 --augment --partial-overlap 0.5

# 3. Speaker encoder
.venv/Scripts/python scripts/train_speaker_encoder.py \
  --splits train-clean-100 train-clean-360 train-other-500 \
  --out checkpoints/spk_encoder --epochs 20 --batch-size 64 --seconds 2.5

# 4. Separator, conditioned on that encoder
.venv/Scripts/python scripts/train.py --dynamic \
  --val-manifest datasets/vanta/dev/manifest.jsonl \
  --out checkpoints/separator --train-source train-clean-360 \
  --speaker-encoder checkpoints/spk_encoder/best.pt \
  --intf-snr 0 10 --augment --partial-overlap 0.5 \
  --epochs 40 --batch-size 4 --repeats 3 --clip-seconds 3.0 --lr 5e-4

# 5. Evaluate
.venv/Scripts/python scripts/evaluate.py --checkpoint checkpoints/separator/best.pt \
  --manifest datasets/vanta/dev/manifest.jsonl --repeats 3
.venv/Scripts/python scripts/compare_encoders.py
```

Both training scripts checkpoint every epoch and accept `--resume`.

---

## Deployment

**Backend** — Docker image pushed to a Hugging Face Space. [`deploy/hf-space/build.sh`](deploy/hf-space/build.sh) copies the minimal inference subset plus both checkpoints into the bundle; `git push` uploads them via Git LFS. CPU inference runs at ~0.2× realtime.

**Frontend** — Vercel, from `web/`. Set `NEXT_PUBLIC_VANTA_API` to the Space URL at build time.

---

## Limitations

- **Target must be the prominent speaker** — trained on [0, +10] dB interference SNR; a voice buried under a louder one is out of distribution
- **84% of target energy captured** — the remainder stays in the residue, audible at roughly −33 dB
- **Read-speech bias** — 1,552 of 1,583 speakers are LibriSpeech audiobooks; conversational coverage comes from only 31 AMI speakers
- **English-only** — degrades on other languages
- **File-based** — no real-time or streaming inference
- **Reverb preserved** — the model keeps room acoustics by design; dereverberation is a separate task
- **Objective metrics only** — no MOS-rated listening study
