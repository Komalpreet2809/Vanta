# Vanta inference backend for Hugging Face Spaces (Docker runtime).
#
# Notes:
# - HF free tier is CPU-only with 16 GB RAM — plenty for this model. We pull
#   the CPU-only PyTorch wheel (~200 MB) instead of CUDA (~2 GB).
# - Spaces route requests to $PORT (default 7860). We bind there.
# - libsndfile1 is required by `soundfile`; ffmpeg is required by our
#   auto-transcode fallback for MP4/M4A/WebM uploads.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        libsndfile1 \
        ffmpeg \
        git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU PyTorch wheel (much smaller than the default CUDA one).
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        torch==2.6.0 torchaudio==2.6.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code + model checkpoint (large file — tracked via Git LFS).
COPY . .

ENV VANTA_BACKEND=sepformer
ENV VANTA_REPEATS=2
# Permissive CORS so the Vercel frontend (or a curl test) can hit the API.
ENV VANTA_ALLOWED_ORIGINS=*

EXPOSE 7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
