"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDrop } from "./FileDrop";
import { Waveform } from "./Waveform";
import { extract, health, type ExtractMeta } from "../lib/api";

type Result = {
  extracted: Blob;
  residue: Blob;
  meta: ExtractMeta;
};

type Status = "idle" | "running" | "error";

export function VantaApp() {
  const [mixture, setMixture] = useState<File | null>(null);
  const [enrollment, setEnrollment] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [backendOK, setBackendOK] = useState<boolean | null>(null);
  const [device, setDevice] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    health().then((h) => {
      if (cancelled) return;
      setBackendOK(h.ok);
      setDevice(h.device);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canRun = mixture && enrollment && status !== "running";

  const run = useCallback(async () => {
    if (!mixture || !enrollment) return;
    setStatus("running");
    setMessage("");
    setResult(null);
    try {
      const t0 = performance.now();
      const r = await extract(mixture, enrollment);
      const ms = Math.round(performance.now() - t0);
      setResult(r);
      setMessage(`done in ${ms} ms`);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [mixture, enrollment]);

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex flex-col flex-1 w-full max-w-4xl mx-auto px-6 py-10 gap-10">
      <header className="border-b border-[var(--line)] pb-6">
        <h1 className="text-5xl tracking-[0.3em] font-normal">VANTA</h1>
        <p className="mt-3 text-sm text-[var(--dim)] max-w-2xl">
          Target speaker extraction. Upload a 5-second reference clip of one
          voice and a messy recording — the model isolates that voice and
          returns it without everything else.
        </p>
        <p className="mt-3 text-xs text-[var(--dim)]">
          backend:{" "}
          {backendOK === null ? (
            <span>checking…</span>
          ) : backendOK ? (
            <span className="text-[var(--light)]">
              online {device ? `· ${device}` : ""}
            </span>
          ) : (
            <span className="text-red-500">offline</span>
          )}
        </p>
      </header>

      <section className="grid gap-8 sm:grid-cols-2">
        <FileDrop
          label="01 · reference voice"
          hint="≈5 seconds, clean audio of the target speaker"
          file={enrollment}
          onFile={setEnrollment}
        />
        <FileDrop
          label="02 · noisy recording"
          hint="the messy audio you want cleaned up (up to 30s)"
          file={mixture}
          onFile={setMixture}
        />
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {enrollment ? (
            <Waveform source={enrollment} label="reference" color="#525252" />
          ) : null}
          {mixture ? (
            <Waveform source={mixture} label="input mixture" color="#525252" />
          ) : null}
        </div>

        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="self-start border border-[var(--light)] px-6 py-3 text-sm uppercase tracking-[0.3em] text-[var(--light)] transition-colors hover:bg-[var(--light)] hover:text-[var(--void)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--light)]"
        >
          {status === "running" ? "extracting…" : "extract"}
        </button>

        {message ? (
          <p
            className={`text-xs ${
              status === "error" ? "text-red-500" : "text-[var(--dim)]"
            }`}
          >
            {message}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="flex flex-col gap-6 border-t border-[var(--line)] pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[var(--dim)]">
              output
            </h2>
            <span className="text-xs text-[var(--dim)]">
              {result.meta.outputSeconds.toFixed(2)}s · {result.meta.sampleRate} Hz
              {result.meta.truncated ? " · truncated" : ""}
            </span>
          </div>

          <Waveform
            source={result.extracted}
            label="extracted voice"
            color="#737373"
            progressColor="#ffffff"
          />
          <Waveform
            source={result.residue}
            label="residue (what Vanta removed)"
            color="#404040"
            progressColor="#a3a3a3"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => download(result.extracted, "vanta_extracted.wav")}
              className="border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-widest hover:border-[var(--light)]"
            >
              download extracted
            </button>
            <button
              type="button"
              onClick={() => download(result.residue, "vanta_residue.wav")}
              className="border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-widest hover:border-[var(--light)]"
            >
              download residue
            </button>
          </div>
        </section>
      ) : null}

      <footer className="border-t border-[var(--line)] pt-6 mt-auto text-xs text-[var(--dim)]">
        vanta — conv-tasnet with ecapa-tdnn speaker conditioning
      </footer>
    </main>
  );
}
