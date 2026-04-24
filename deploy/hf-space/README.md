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

## Endpoints

- `GET  /health` — returns `{status, checkpoint, device}`
- `POST /extract` — `multipart/form-data` with fields `mixture` and `enrollment`.
  Pass `?include_residue=true` to also get the residue (what was removed) as JSON.

Frontend lives separately (Vercel / Next.js) and talks to this API.
