"""FastAPI inference server for Vanta.

Run locally:
    .venv/Scripts/python.exe -m uvicorn server:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from vanta.inference import VantaInference, VantaSepFormerInference

# "trained"   -> our from-scratch separator + our from-scratch speaker encoder.
#                No pretrained weights: SI-SDR +8.45 dB on the held-out set.
# "sepformer" -> SpeechBrain's pretrained SepFormer + speaker selection.
#
# The backend is resolved ONCE at startup and never changes per request. There
# is deliberately no automatic fallback: silently serving pretrained output
# while presenting the result as the trained model would misrepresent what
# users are getting. Switching backends is a manual, visible operator decision,
# and /health always reports which one is live.
BACKEND = os.environ.get("VANTA_BACKEND", "trained").lower()
CHECKPOINT_PATH = Path(os.environ.get("VANTA_CHECKPOINT", "checkpoints/fully_ours/best.pt"))
REPEATS = int(os.environ.get("VANTA_REPEATS", "3"))
# Our own trained speaker encoder. Unset = SpeechBrain's pretrained ECAPA.
# Must match whichever encoder the checkpoint's separator was trained against —
# fully_ours/best.pt was trained against spk_encoder/best.pt, so they pair.
SPK_ENCODER = os.environ.get(
    "VANTA_SPK_ENCODER", "checkpoints/spk_encoder/best.pt"
) or None
SEPFORMER_SOURCE = os.environ.get(
    "VANTA_SEPFORMER", "speechbrain/sepformer-libri2mix"
)
MAX_UPLOAD_BYTES = int(os.environ.get("VANTA_MAX_UPLOAD_BYTES", 25 * 1024 * 1024))  # 25 MB

app = FastAPI(title="Vanta TSE", version="0.1.0")

# Permissive CORS for the demo deployment; set VANTA_ALLOWED_ORIGINS to the
# frontend's origin to lock it down.
#
# Known and accepted for a public demo: /extract runs a neural network on
# arbitrary uploads with no authentication and no rate limit, so a script could
# keep the Space's CPU busy indefinitely. Uploads are capped at
# VANTA_MAX_UPLOAD_BYTES and audio at 30s, which bounds the cost of any single
# request but not the number of them. Anything handling real traffic wants a
# per-IP limit and a request queue in front of this.
origins = os.environ.get("VANTA_ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    # Custom response headers are invisible to browser JS unless named here.
    expose_headers=["X-Sample-Rate", "X-Output-Seconds", "X-Truncated"],
)

# Load the model once at import time so the first request isn't slow.
_inference: VantaInference | None = None
# Serialises inference; see the comment at its use site in /extract.
_extract_lock = asyncio.Lock()


@app.on_event("startup")
def _load_model() -> None:
    global _inference
    if BACKEND == "sepformer":
        _inference = VantaSepFormerInference(sepformer_source=SEPFORMER_SOURCE)
    else:
        # Report degraded rather than crash. Checking only the separator was not
        # enough: a missing or unreadable speaker encoder raised inside startup
        # and took uvicorn down with it, which is the failure this guard exists
        # to prevent. Loading can also fail on a truncated or mismatched
        # checkpoint, so the whole construction is guarded, not just the paths.
        missing = [
            str(p) for p in (CHECKPOINT_PATH, Path(SPK_ENCODER) if SPK_ENCODER else None)
            if p is not None and not p.exists()
        ]
        if missing:
            print(f"[SERVER] checkpoints missing: {', '.join(missing)}")
            print("[SERVER] run scripts/download_weights.py; /extract will 503")
            return
        try:
            _inference = VantaInference(
                CHECKPOINT_PATH, repeats=REPEATS, speaker_encoder_ckpt=SPK_ENCODER
            )
        except Exception as e:
            print(f"[SERVER] failed to load checkpoints: {type(e).__name__}: {e}")
            return


@app.get("/health")
def health() -> JSONResponse:
    ok = _inference is not None
    info: dict = {
        "status": "ok" if ok else "model_not_loaded",
        "backend": BACKEND,
        "device": str(_inference.device) if _inference else None,
    }
    if BACKEND == "sepformer":
        info["sepformer_source"] = SEPFORMER_SOURCE
    else:
        info["checkpoint"] = str(CHECKPOINT_PATH)
        info["speaker_encoder"] = str(SPK_ENCODER) if SPK_ENCODER else "pretrained-ecapa"
    return JSONResponse(info)


@app.post("/extract")
async def extract(
    request: Request,
    mixture: UploadFile = File(..., description="noisy/multi-speaker audio"),
    enrollment: UploadFile = File(..., description="5-second clean clip of target speaker"),
    include_residue: bool = False,
) -> Response:
    print(f"\n[SERVER] Received extraction request: {mixture.filename} & {enrollment.filename}")
    if _inference is None:
        raise HTTPException(503, "model not loaded — did you mount the checkpoint?")

    # Reject on Content-Length first. Reading the bodies before checking meant
    # an oversized upload was fully received and spooled to disk before being
    # refused, so the cap bounded processing but not ingest.
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > 2 * MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"upload too large (max {MAX_UPLOAD_BYTES} bytes per file)")

    mix_bytes = await mixture.read()
    enr_bytes = await enrollment.read()
    if len(mix_bytes) > MAX_UPLOAD_BYTES or len(enr_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"file too large (max {MAX_UPLOAD_BYTES} bytes)")
    if not mix_bytes or not enr_bytes:
        raise HTTPException(400, "both mixture and enrollment files are required")

    try:
        # Off the event loop: extract() is synchronous CPU-bound torch, and this
        # handler is async, so calling it directly stalls every other request for
        # the duration. Measured on the CPU deployment, /health went from 1.3s to
        # 5.0s while one extraction ran.
        #
        # The lock keeps that threadpool to one extraction at a time. A single
        # model instance is shared across requests, and concurrent CPU inference
        # on one process would contend for the same cores anyway — serialising is
        # both safer and no slower in aggregate.
        async with _extract_lock:
            extracted, residue, meta = await run_in_threadpool(
                _inference.extract, mix_bytes, enr_bytes
            )
    except Exception as e:
        # The underlying error is usually raw ffmpeg stderr, which is meaningless
        # to a user and leaks server temp paths. Log it, return something useful.
        print(f"[SERVER] extraction failed: {type(e).__name__}: {e}")
        raise HTTPException(
            400,
            "Could not read that audio. Check both files play correctly and are "
            "in a supported format (WAV, MP3, M4A, MP4, FLAC, OGG).",
        ) from e

    # If the caller didn't ask for the residue, return just the extracted voice
    # as raw audio bytes (lowest friction for the frontend's download button).
    headers = {
        "X-Sample-Rate": str(meta["sample_rate"]),
        "X-Output-Seconds": f"{meta['output_seconds']:.3f}",
        "X-Truncated": "1" if meta["truncated"] else "0",
    }
    if not include_residue:
        headers["Content-Disposition"] = 'attachment; filename="vanta_extracted.wav"'
        return Response(content=extracted, media_type="audio/wav", headers=headers)

    # Residue mode: multipart/mixed would be correct but is painful for fetch.
    # Base64-encode both payloads into JSON instead.
    import base64

    return JSONResponse(
        {
            "extracted_wav_b64": base64.b64encode(extracted).decode("ascii"),
            "residue_wav_b64": base64.b64encode(residue).decode("ascii"),
            **meta,
        }
    )
