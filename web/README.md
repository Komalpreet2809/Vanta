# Vanta — frontend

Next.js + Tailwind interface for [Vanta](../README.md), a target speaker
extraction system. Upload a reference clip and a noisy recording; the app calls
the inference API and renders the isolated voice alongside the residue.

## Setup

```bash
npm install
npm run dev     # http://localhost:3000
```

Point it at an API — a local server or the deployed Space:

```bash
# .env.local
NEXT_PUBLIC_VANTA_API=http://127.0.0.1:8000
```

`NEXT_PUBLIC_VANTA_API` is read at **build** time, so for production it must be
set in the Vercel project settings, not just locally. Production points at
`https://komalsohal-vanta.hf.space`.

To run the backend locally, see
[Running locally](../README.md#running-locally) in the root README.

## Layout

```
src/
├── app/                 # Layout and page
├── components/
│   ├── VantaApp.tsx     # Top-level state, upload flow, guided tour
│   ├── EngineCenter.tsx # Extraction progress visualisation
│   └── AudioCard.tsx    # Waveform player (wavesurfer.js)
└── lib/api.ts           # API client — POST /extract, GET /health
```

## Deployment

Deployed to Vercel from this directory. The backend is a separate Docker image
on Hugging Face Spaces (see [`deploy/hf-space/`](../deploy/hf-space/)).
