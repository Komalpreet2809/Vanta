"""FastAPI inference server for Vanta.

Run locally:
    .venv/Scripts/python.exe -m uvicorn server:app --reload --port 8000
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from vanta.inference import VantaInference

CHECKPOINT_PATH = Path(os.environ.get("VANTA_CHECKPOINT", "checkpoints/real/best.pt"))
REPEATS = int(os.environ.get("VANTA_REPEATS", "2"))
MAX_UPLOAD_BYTES = int(os.environ.get("VANTA_MAX_UPLOAD_BYTES", 25 * 1024 * 1024))  # 25 MB

app = FastAPI(title="Vanta TSE", version="0.1.0")

# Permissive CORS for the demo deployment. In production you'd lock this down
# to the Vercel frontend's origin via VANTA_ALLOWED_ORIGINS.
origins = os.environ.get("VANTA_ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Load the model once at import time so the first request isn't slow.
_inference: VantaInference | None = None


@app.on_event("startup")
def _load_model() -> None:
    global _inference
    if not CHECKPOINT_PATH.exists():
        # Don't crash the server; /health will report degraded and /extract 503s.
        return
    _inference = VantaInference(CHECKPOINT_PATH, repeats=REPEATS)


@app.get("/health")
def health() -> JSONResponse:
    ok = _inference is not None
    return JSONResponse(
        {
            "status": "ok" if ok else "model_not_loaded",
            "checkpoint": str(CHECKPOINT_PATH),
            "device": str(_inference.device) if _inference else None,
        }
    )


@app.post("/extract")
async def extract(
    mixture: UploadFile = File(..., description="noisy/multi-speaker audio"),
    enrollment: UploadFile = File(..., description="5-second clean clip of target speaker"),
    include_residue: bool = False,
) -> Response:
    if _inference is None:
        raise HTTPException(503, "model not loaded — did you mount the checkpoint?")

    mix_bytes = await mixture.read()
    enr_bytes = await enrollment.read()
    if len(mix_bytes) > MAX_UPLOAD_BYTES or len(enr_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"file too large (max {MAX_UPLOAD_BYTES} bytes)")
    if not mix_bytes or not enr_bytes:
        raise HTTPException(400, "both mixture and enrollment files are required")

    try:
        extracted, residue, meta = _inference.extract(mix_bytes, enr_bytes)
    except Exception as e:
        raise HTTPException(400, f"failed to decode audio: {e}") from e

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
