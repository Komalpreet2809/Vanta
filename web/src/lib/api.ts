// API client for the Vanta inference backend.

const DEFAULT_BASE = "http://127.0.0.1:8000";

export function apiBase(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_VANTA_API) {
    return process.env.NEXT_PUBLIC_VANTA_API;
  }
  return DEFAULT_BASE;
}

export async function extract(
  mixture: File,
  enrollment: File,
): Promise<{ extracted: Blob; residue: Blob; meta: ExtractMeta }> {
  const body = new FormData();
  body.append("mixture", mixture);
  body.append("enrollment", enrollment);

  // Ask the backend to include the residue so users can hear what Vanta removed.
  const url = `${apiBase()}/extract?include_residue=true`;

  let resp: Response;
  try {
    resp = await fetch(url, { method: "POST", body });
  } catch {
    // fetch only rejects on network-level failure, not HTTP errors.
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  if (!resp.ok) {
    // FastAPI errors come back as {"detail": "..."}; surface just that, since
    // the raw body would otherwise be shown to the user verbatim.
    const raw = await resp.text().catch(() => "");
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* not JSON — fall back to the raw body */
    }
    if (resp.status === 413) {
      throw new Error("That file is too large. Please use a shorter clip.");
    }
    throw new Error(detail || `Extraction failed (${resp.status}).`);
  }

  const data = (await resp.json()) as ExtractJSON;
  return {
    extracted: b64ToBlob(data.extracted_wav_b64, "audio/wav"),
    residue: b64ToBlob(data.residue_wav_b64, "audio/wav"),
    meta: {
      sampleRate: data.sample_rate,
      inputSeconds: data.input_seconds,
      outputSeconds: data.output_seconds,
      truncated: data.truncated,
      similarities: data.similarities,
      selected: data.selected,
      backend: data.backend,
    },
  };
}

export async function health(): Promise<{ ok: boolean; device?: string }> {
  try {
    const resp = await fetch(`${apiBase()}/health`, { cache: "no-store" });
    if (!resp.ok) return { ok: false };
    const data = await resp.json();
    return { ok: data.status === "ok", device: data.device };
  } catch {
    return { ok: false };
  }
}

export type ExtractMeta = {
  sampleRate: number;
  inputSeconds: number;
  outputSeconds: number;
  truncated: boolean;
  // Extras from the inactive SepFormer backend; undefined in production,
  // which runs the from-scratch models.
  similarities?: number[][];
  selected?: number[];
  backend?: string;
};

type ExtractJSON = {
  extracted_wav_b64: string;
  residue_wav_b64: string;
  sample_rate: number;
  input_seconds: number;
  output_seconds: number;
  truncated: boolean;
  similarities?: number[][];
  selected?: number[];
  backend?: string;
};

function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes.buffer as ArrayBuffer], { type });
}
