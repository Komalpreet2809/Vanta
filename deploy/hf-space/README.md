---
title: Vanta
emoji: 🎙
colorFrom: gray
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Vanta — Target Speaker Extraction (backend)

FastAPI inference server for Vanta, a target speaker extraction (TSE) model.
Upload a short reference clip of a target speaker and a noisy recording; get
back the isolated voice of the target.

Both learned components — a 3.5M-parameter separator and a 6.0M-parameter
ECAPA-TDNN speaker encoder — were trained from scratch; no pretrained weights
run here. On 500 held-out mixtures from unseen speakers the pair reaches
**+8.45 dB SI-SDR** (median +9.28 dB).

Source and training pipeline: https://github.com/Komalpreet2809/Vanta

## Endpoints

- `GET  /health` — returns `{status, backend, device, checkpoint, speaker_encoder}`
- `POST /extract` — `multipart/form-data` with fields `mixture` and `enrollment`.
  Pass `?include_residue=true` to also get the residue (what was removed) as JSON.
  `extracted + residue` reconstructs the input exactly.

A pretrained SepFormer backend also ships in this image but is **not active**.
There is no automatic fallback; switching is a manual operator decision via
`VANTA_BACKEND`, and `/health` always reports which backend is live.

Frontend lives separately (Vercel / Next.js) and talks to this API.
