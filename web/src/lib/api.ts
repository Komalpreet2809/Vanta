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
  const resp = await fetch(url, { method: "POST", body });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => resp.statusText);
    throw new Error(`extract failed (${resp.status}): ${detail}`);
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
};

type ExtractJSON = {
  extracted_wav_b64: string;
  residue_wav_b64: string;
  sample_rate: number;
  input_seconds: number;
  output_seconds: number;
  truncated: boolean;
};

function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes.buffer as ArrayBuffer], { type });
}
