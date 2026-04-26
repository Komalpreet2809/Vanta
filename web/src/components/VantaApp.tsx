"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { DropZone } from "./DropZone";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { StatusBar } from "./StatusBar";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";

type Result = {
  extracted: Blob;
  residue: Blob;
  meta: ExtractMeta;
};

type Status = "idle" | "running" | "error";

export function VantaApp() {
  const [enrollment, setEnrollment] = useState<File | null>(null);
  const [mixture, setMixture] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [backend, setBackend] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    health().then((h) => {
      if (cancelled) return;
      setBackend(h.ok ? "online" : "offline");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canRun = !!(mixture && enrollment) && status !== "running";

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
      setMessage(`Completed in ${(ms / 1000).toFixed(2)}s`);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [mixture, enrollment]);

  const download = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Drop zone fills whichever input slot is empty (reference first, then noise);
  // if both filled, the new file replaces noise.
  const handleDrop = useCallback(
    (f: File) => {
      if (!enrollment) setEnrollment(f);
      else if (!mixture) setMixture(f);
      else setMixture(f);
    },
    [enrollment, mixture],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1fr] gap-0">
        {/* INPUTS */}
        <section className="px-8 py-8 flex flex-col gap-5">
          <div>
            <h2 className="font-bold text-[15px] tracking-[0.16em] uppercase text-[var(--text)]">
              Inputs
            </h2>
            <p className="text-[12px] text-[var(--text-soft)] mt-1">
              Provide reference and noise audio.
            </p>
          </div>

          <AudioCard
            heading="Reference Audio"
            source={enrollment}
            variant="green"
            onClear={() => setEnrollment(null)}
            emptyLabel="No reference audio loaded"
          />

          <AudioCard
            heading="Noise Audio"
            source={mixture}
            variant="red"
            onClear={() => setMixture(null)}
            emptyLabel="No noisy recording loaded"
          />

          <DropZone onFile={handleDrop} />
          <TipsCard />
        </section>

        {/* ENGINE */}
        <section className="px-8 py-8 col-divider lg:flex lg:flex-col lg:items-center lg:justify-center">
          <EngineCenter
            canExtract={!!canRun}
            status={status}
            hasReference={!!enrollment}
            hasNoise={!!mixture}
            hasOutput={!!result}
            onExtract={run}
          />
          {message ? (
            <p
              className={`mt-3 text-[11px] ${
                status === "error"
                  ? "text-[var(--err)]"
                  : "text-[var(--text-dim)]"
              }`}
            >
              {message}
            </p>
          ) : null}
        </section>

        {/* OUTPUTS */}
        <section className="px-8 py-8 col-divider flex flex-col gap-5">
          <div>
            <h2 className="font-bold text-[15px] tracking-[0.16em] uppercase text-[var(--text)]">
              Outputs
            </h2>
            <p className="text-[12px] text-[var(--text-soft)] mt-1">
              Clean voice and residue (noise).
            </p>
          </div>

          <AudioCard
            heading="Clean Voice"
            source={result?.extracted ?? null}
            filenameOverride="Extracted_Voice.wav"
            variant="green"
            onDownload={
              result
                ? () => download(result.extracted, "vanta_extracted.wav")
                : undefined
            }
            emptyLabel="—"
          />

          <AudioCard
            heading="Residue (Noise)"
            source={result?.residue ?? null}
            filenameOverride="Residue_Noise.wav"
            variant="purple"
            onDownload={
              result
                ? () => download(result.residue, "vanta_residue.wav")
                : undefined
            }
            emptyLabel="—"
          />

          {!result && (
            <div className="rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/50 px-4 py-5 mt-auto">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
                  <svg
                    className="h-3.5 w-3.5 text-[var(--text-soft)]"
                    viewBox="0 0 14 14"
                    fill="currentColor"
                  >
                    <path d="M7 1v8m0 0L3.5 5.5M7 9l3.5-3.5M2 12h10v1H2z" />
                  </svg>
                </span>
                <span className="text-[12px] text-[var(--text-soft)] leading-tight">
                  Outputs will appear here
                  <br />
                  <span className="text-[var(--text-dim)]">
                    after processing is complete.
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>
      </main>

      <StatusBar backend={backend} />
    </div>
  );
}
