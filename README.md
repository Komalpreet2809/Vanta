# Vanta — Target Speaker Extraction

![Vanta](vantaimage.png)

A neural system that isolates one specific voice from a noisy recording. Give it a short reference clip of the target speaker and a messy mixture; it returns only that person's voice, plus a residue track of everything it removed.

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
7. [Deployment](#deployment)
8. [Limitations](#limitations)

---

## How it works

Unlike blind noise cancellation (Krisp, Zoom), Vanta is **informed** — it needs a voice fingerprint to know *who* to keep.

| Input | Description |
|---|---|
| **Reference** | 5 seconds of the target speaker, alone |
| **Mixture** | The noisy recording (up to 30 seconds) |

The model produces a cleaned track containing only the target speaker, and optionally a residue track of everything removed.

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
reference ─▶ ECAPA-TDNN ─▶ 192-d ──▶ TCN Separator
              (frozen)              16 dilated-conv blocks
                                    speaker-conditioned (additive bias per block)
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

**Design decisions:**

| Choice | Reason |
|---|---|
| Time-domain 1-D conv encoder | Preserves phase — no metallic reconstruction artifacts from STFT |
| Frozen ECAPA-TDNN (VoxCeleb) | 192-d fingerprint that survives speaker mixtures without retraining |
| Per-block speaker conditioning | Fingerprint injected at every TCN block; model is reminded *who* to keep at every layer |
| Global Layer Norm between blocks | Amplitude stability across blocks |
| SI-SDR loss | Ignores volume differences; optimises waveform shape and purity only |

---

## Training

### Data sources

| Corpus | Purpose |
|---|---|
| [LibriSpeech](https://openslr.org/12) `train-clean-100` | 251 speakers, 100 h of English audiobooks |
| [MUSAN](https://openslr.org/17) noise subset | 930 ambient noise clips |
| [RIRS_NOISES](https://openslr.org/28) | 60,000 simulated room impulse responses |

### Mixture synthesis

[`vanta/data/synthesize.py`](vanta/data/synthesize.py) generates training mixtures on-the-fly:

```
y = s_target + α · s_interference + β · noise
```

- Random target and interference speakers (different speakers per mixture)
- Independent RIRs convolved on each voice (80% probability)
- SNR: [−5, +5] dB (target vs. interference), [+5, +20] dB (target vs. noise)
- A separate clean enrollment clip from the same target speaker

20,000 mixtures for training; 500 held-out on fully unseen speakers from `dev-clean`.

### Training run (v2)

| Setting | Value |
|---|---|
| Hardware | RTX 4060 Laptop, 8 GB VRAM |
| Precision | bf16 mixed (fp32 OOMs at batch 2) |
| Batch size | 4 |
| Optimiser | AdamW — lr 1e-3, weight decay 1e-5 |
| LR schedule | Cosine |
| Regularisation | Dropout 0.1, gradient clip norm 5.0 |
| Early stopping | Patience 5 — triggered at epoch 7 |
| Total time | ~6 hours |

---

## Results

Evaluated on 500 held-out mixtures from speakers never seen in training, using
the realistic benchmark (real noise, real and simulated room impulse responses,
turn-taking, recording-chain degradation):

| Metric | Value |
|---|---|
| SI-SDR (mean) | **+8.45 dB** |
| SI-SDR (median) | **+9.28 dB** |
| Improvement over input mixture | **+5.50 dB** |
| PESQ | 1.247 |
| STOI | 0.751 |

### No pretrained weights

Both learned components are trained from scratch in this repository — 9.5M
parameters total, none of them borrowed:

| Component | Params | Training |
|---|---|---|
| Separator (Conv-TasNet style) | 3.5M | 40 epochs, 952 speakers |
| Speaker encoder (ECAPA-TDNN) | 6.0M | 20 epochs, 1583 speakers |

Replacing the pretrained ECAPA with our own encoder *improved* every metric
(+7.93 → +8.45 dB SI-SDR, PESQ 1.182 → 1.247, STOI 0.739 → 0.751) and made CPU
inference ~6× faster. Measured head-to-head against the pretrained encoder on
40 held-out speakers (`scripts/compare_encoders.py`):

| | ours | pretrained ECAPA |
|---|---|---|
| clean margin | **+0.607** | +0.526 |
| clean pair-accuracy | **99.8%** | 99.2% |
| degraded margin | **+0.538** | +0.449 |
| degraded pair-accuracy | 98.0% | **99.2%** |

The pretrained encoder remains slightly more reliable on hard degraded pairs,
which is what VoxCeleb's ~4× larger speaker count buys. Note also that this
evaluation is LibriSpeech throughout — the domain our encoder trained on — so it
does not settle behaviour on arbitrary real-world recordings.

### Which model is actually serving

The deployment runs the from-scratch models described above. A pretrained
SepFormer backend also exists in the codebase, but it is **not active in
production** and there is deliberately no automatic fallback: silently serving
pretrained output while presenting it as the trained model would misrepresent
what users receive. Switching is a manual operator decision, and
[`/health`](https://komalsohal-vanta.hf.space/health) always reports which
backend is live.

---

## Repository layout

```
vanta/
├── config.py              # Paths, sample rate (16 kHz)
├── losses.py              # SI-SDR loss
├── metrics.py             # SI-SDR + PESQ + STOI
├── training.py            # Train loop — AMP, cosine LR, early stop, resume
├── inference.py           # Load checkpoint + extract speaker (used by server)
├── data/
│   ├── indexer.py         # Speaker/Noise/RIR indices cached to JSON
│   ├── synthesize.py      # Mixture synthesiser
│   └── dataset.py         # PyTorch Dataset over the manifest
├── models/
│   ├── audio_encoder.py   # 1-D Conv encoder + transposed-conv decoder
│   ├── speaker_encoder.py # Frozen ECAPA-TDNN wrapper (speechbrain)
│   ├── separator.py       # TCN blocks, gLN, speaker-conditioned mask
│   └── vanta.py           # Top-level model
└── utils/audio.py         # Load/save, resample, SNR scaling, peak norm

scripts/
├── download_data.py       # Resumable download of all corpora
├── build_dataset.py       # Generate N mixture triples → manifest.jsonl
├── train.py               # CLI entry point for training
├── evaluate.py            # SI-SDR / PESQ / STOI on a manifest
├── bench_step.py          # Per-batch throughput + VRAM benchmark
└── test_*.py              # Smoke tests for encoders and full model

server.py                  # FastAPI — /health and /extract endpoints

web/                       # Next.js + Tailwind frontend
└── src/
    ├── app/               # Layout + page
    ├── components/        # AudioCard, EngineCenter, VantaApp
    └── lib/api.ts         # API client

deploy/hf-space/           # Docker bundle pushed to Hugging Face Spaces
```

---

## Running locally

**Prerequisites:** Python 3.11+, Node 20+, git-lfs, CUDA GPU (for training only)

```bash
# 1. Python environment
python -m venv .venv
.venv/Scripts/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
.venv/Scripts/pip install -r requirements.txt

# 2. Download datasets (~12 GB total, resumable)
.venv/Scripts/python scripts/download_data.py

# 3. Build training mixtures
.venv/Scripts/python scripts/build_dataset.py --n 20000 --out datasets/vanta --split train --source train-clean-100
.venv/Scripts/python scripts/build_dataset.py --n 500   --out datasets/vanta --split dev   --source dev-clean

# 4. Train
.venv/Scripts/python scripts/train.py \
  --manifest datasets/vanta/train/manifest.jsonl \
  --val-manifest datasets/vanta/dev/manifest.jsonl \
  --out checkpoints/run1 \
  --epochs 20 --batch-size 4 --repeats 2 --dropout 0.1 --amp-dtype bf16

# 5. Start the inference server
.venv/Scripts/python -m uvicorn server:app --port 8000

# 6. Start the frontend
cd web && npm install && npm run dev   # http://localhost:3000
```

---

## Deployment

**Backend** — ships as a Docker image to a Hugging Face Space. See [`deploy/hf-space/`](deploy/hf-space/). The `build.sh` script copies the minimal inference subset into the Space bundle; `git push` uploads the model checkpoint via Git LFS.

**Frontend** — deployed to Vercel from the `web/` directory. Set the `NEXT_PUBLIC_VANTA_API` environment variable to the Hugging Face Space URL at build time.

---

## Limitations

- **File-based only** — no real-time or streaming inference
- **English-only** — trained on LibriSpeech; degrades on other languages
- **Reverb preserved** — model keeps room acoustics by design; dereverb is a separate task
- **Objective metrics only** — no MOS-rated user study conducted
