# Vanta — Target Speaker Extraction

A neural system that isolates one specific voice from messy audio. Give it a short reference clip of the person you want to hear, point it at a noisy recording, and it returns just that person's voice with interfering speakers and background noise removed.

**Live demo**: [vanta-henna.vercel.app](https://vanta-henna.vercel.app) (also [vanta.komalpreet.me](https://vanta.komalpreet.me) once DNS settles)
**Backend API**: [komalsohal-vanta.hf.space](https://komalsohal-vanta.hf.space) (FastAPI on a Hugging Face Space)

---

## What it does

Unlike blind noise cancellation (Krisp, Zoom), Vanta is **informed** — it needs a voice "fingerprint" to know *who* to keep. Given two inputs:

1. **Reference** — 5 seconds of the target speaker, alone
2. **Mixture** — the messy recording (up to 30 seconds)

…the model produces a cleaned version containing only the target speaker, plus a residue track of everything it removed.

## Architecture

```
                                mixture wav (B, T)
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │ 1-D Conv Audio Encoder │  (learnable, 512 filters)
                          │      kernel 16, stride 8      │
                          └────────────┬───────────┘
                                       │  (B, 512, T')
                                       ▼
reference wav ─▶ ECAPA-TDNN ─▶ 192-d ──▶ TCN Separator
                  (frozen)         │      16 dilated-conv blocks
                                   │      with per-block speaker
                                   │      conditioning (additive bias)
                                   │
                                   ▼
                          predicted mask (B, 512, T')
                                   │
                         enc × mask ▼
                                   ▼
                          ┌────────────────────────┐
                          │  Transposed 1-D Conv   │  (decoder, mirror of encoder)
                          └────────────┬───────────┘
                                       │
                                       ▼
                          extracted wav (B, T)
```

**Key choices and why:**
- **Time domain, not spectrograms** — learnable 1-D conv encoder (Conv-TasNet style) preserves phase, so reconstructions don't sound metallic.
- **ECAPA-TDNN speaker encoder** (frozen, pretrained on VoxCeleb) produces a 192-d "voice fingerprint" that survives mixtures of many speakers.
- **Per-block speaker conditioning** — the fingerprint is projected once to the bottleneck width and added at every TCN block input, reminding the model *who* to keep at every layer.
- **Global Layer Norm** between blocks for amplitude stability.
- **SI-SDR loss** (Scale-Invariant Signal-to-Distortion Ratio) — doesn't penalize the model for volume differences; only cares about the shape and purity of the extracted waveform.

## Training pipeline

Trained end-to-end from raw LibriSpeech + noise + impulse responses:

**Data sources**
- [LibriSpeech](https://openslr.org/12) `train-clean-100` (251 speakers, 100 hours of English audiobooks)
- [MUSAN](https://openslr.org/17) noise subset (930 ambient clips)
- [RIRS_NOISES](https://openslr.org/28) (60,000 simulated room impulse responses)

**Synthesis engine** — [`vanta/data/synthesize.py`](vanta/data/synthesize.py) generates training mixtures as:

```
y = s_target + α · s_interference + β · noise
```

with:
- Random target and (different) interference speakers
- Independent RIRs convolved on each voice (80% probability)
- SNR sampled from [−5, +5] dB (target vs. interference) and [+5, +20] dB (target vs. noise)
- A separate clean enrollment clip (different utterance, same speaker)

20,000 mixtures generated for training, 500 held-out for validation (on completely unseen speakers from `dev-clean`).

**Training run (v2)**
- 8 GB RTX 4060 Laptop GPU
- bf16 mixed precision (essential — fp32 OOMs at batch 2)
- Batch 4, AdamW (lr 1e-3, weight decay 1e-5), cosine LR schedule
- Dropout 0.1 in TCN blocks
- Gradient clipping at norm 5.0
- Early stopping (patience 5) — triggered at epoch 7
- ~6 hours total

## Results

On 500 held-out mixtures from 40 unseen speakers:

| metric | input mixture | Vanta output | improvement |
|---|---|---|---|
| SI-SDR (mean) | −0.62 dB | +0.82 dB | **+1.43 dB** |
| SI-SDR (median) | −0.52 dB | +1.48 dB | **+1.51 dB** |
| STOI | — | 0.66 | — |

On training-set samples (seen speakers), the model hits **+5 to +9 dB improvement** — showing it can mask cleanly when it has seen the voice. The ~+1.5 dB ceiling on held-out speakers is a data-diversity bottleneck; with `train-clean-360` and a longer run it would climb further.

## Repository layout

```
vanta/
├── config.py              # Paths, sample rate (16 kHz)
├── losses.py              # SI-SDR loss
├── metrics.py             # SI-SDR + PESQ + STOI
├── training.py            # Train loop with AMP, cosine LR, early stop, resume
├── inference.py           # Load checkpoint + extract speaker (used by server)
├── data/
│   ├── indexer.py         # Speaker/Noise/RIR indices cached to JSON
│   ├── synthesize.py      # The mixer — y = s1 + α s2 + β n with RIRs
│   └── dataset.py         # PyTorch Dataset over the manifest
├── models/
│   ├── audio_encoder.py   # 1-D Conv encoder + transposed-conv decoder
│   ├── speaker_encoder.py # Wraps frozen ECAPA-TDNN from speechbrain
│   ├── separator.py       # TCN blocks, gLN, speaker-conditioned mask
│   └── vanta.py           # Top-level model (encoder + separator + decoder)
└── utils/audio.py         # Load/save, resample, SNR scaling, peak norm

scripts/
├── download_data.py       # Resumable/retryable download of all corpora
├── build_dataset.py       # Generate N mixture triples -> manifest.jsonl
├── train.py               # CLI entry point for training
├── evaluate.py            # SI-SDR/PESQ/STOI on a manifest
├── bench_step.py          # Per-batch throughput + VRAM benchmark
└── test_*.py              # Smoke tests for encoders and the full model

server.py                  # FastAPI /health and /extract endpoints

web/                       # Next.js 16 + Tailwind 4 frontend
└── src/
    ├── app/               # Layout + page
    ├── components/        # FileDrop, Waveform (wavesurfer.js), VantaApp
    └── lib/api.ts         # API client

deploy/hf-space/           # Bundle pushed to Hugging Face Space (Docker)
```

## Running locally

**Prereqs**: Python 3.11+ (3.13 tested), Node 20+, git-lfs, a CUDA GPU if you want to train.

```bash
# 1. Install Python deps (creates venv)
python -m venv .venv
.venv/Scripts/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
.venv/Scripts/pip install -r requirements.txt

# 2. Download datasets (resumable; ~12 GB total)
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

# 5. Serve the model
.venv/Scripts/python -m uvicorn server:app --port 8000

# 6. Run the frontend
cd web && npm install && npm run dev  # http://localhost:3000
```

## Deploy

Backend ships as a Docker image to a Hugging Face Space — see [`deploy/hf-space/`](deploy/hf-space/). `build.sh` copies the minimal inference subset of the repo into the Space bundle; `git push` uploads model via Git LFS. Frontend is deployed to Vercel from the `web/` directory with `NEXT_PUBLIC_VANTA_API` pointing at the Space URL.

## What's not here

- Real-time / streaming inference (currently file-based)
- Multilingual training data (LibriSpeech is English-only — model degrades on other languages)
- Dereverb (model preserves reverb by design; removing it is a separate task)
- MOS-rated user study (metrics reported are objective only)

## License

MIT. See [LICENSE](LICENSE).
