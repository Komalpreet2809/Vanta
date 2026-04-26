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

  const handleDrop = useCallback(
    (f: File) => {
      if (!enrollment) setEnrollment(f);
      else if (!mixture) setMixture(f);
      else setMixture(f);
    },
    [enrollment, mixture],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] font-mono selection:bg-[#1a1a1a] selection:text-[#efeae0] overflow-hidden">
      <Header />

      <main className="flex-1 grid grid-cols-[1fr_1.2fr_1fr] divide-x divide-[var(--border-strong)] overflow-hidden">
        {/* INPUTS */}
        <section className="p-10 flex flex-col gap-8 bg-[#e8e6db] overflow-y-auto">
          <div>
            <h2 className="text-[28px] font-bold uppercase tracking-[0.3em] mb-1">Inputs</h2>
            <p className="text-[13px] font-bold text-[var(--text-soft)]">Provide reference and noise audio.</p>
          </div>

          <div className="flex flex-col gap-8">
            <AudioCard
              heading="Reference Audio"
              source={enrollment}
              variant="charcoal"
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
          </div>
        </section>

        {/* ENGINE */}
        <section className="p-10 flex flex-col bg-[#e2dfd2] overflow-hidden">
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-bold uppercase tracking-[0.55em] mb-1">Vanta Engine</h2>
            <p className="text-[13px] font-bold text-[var(--text-soft)]">Isolates the target voice from noise.</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <EngineCenter
              canExtract={!!canRun}
              status={status}
              hasReference={!!enrollment}
              hasNoise={!!mixture}
              hasOutput={!!result}
              onExtract={run}
            />
          </div>
        </section>

        {/* OUTPUTS */}
        <section className="p-10 flex flex-col gap-8 bg-[#e8e6db] overflow-y-auto">
          <div>
            <h2 className="text-[28px] font-bold uppercase tracking-[0.3em] mb-1">Outputs</h2>
            <p className="text-[13px] font-bold text-[var(--text-soft)]">Clean voice and residue (noise).</p>
          </div>

          <div className="flex flex-col gap-8 flex-1">
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
              <div className="panel flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-page)]/20 border-dashed border-2 mt-2">
                 <div className="h-20 w-20 border-2 border-dashed border-[var(--border-strong)] rounded-full flex items-center justify-center mb-8 opacity-40">
                   <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 4v12" />
                   </svg>
                 </div>
                 <p className="text-[14px] font-bold text-[var(--text-dim)] uppercase tracking-[0.3em] leading-relaxed">Outputs will appear here<br/>after processing is complete.</p>
              </div>
            )}

            {result && (
              <div className="mt-auto panel p-6 border-l-[8px] border-l-[var(--c-green)] bg-[var(--bg-card)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                       <div className="h-3 w-3 rounded-full bg-[var(--c-green)] shadow-[0_0_12px_var(--c-green)]" />
                       <span className="text-[14px] font-bold uppercase tracking-[0.3em]">Extraction Successful</span>
                    </div>
                 </div>
                 <p className="text-[16px] font-bold leading-tight tabular-nums">{message}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="px-10 py-4 border-t border-[var(--border-strong)] flex items-center justify-between bg-[#e2dfd2] relative z-[1000]">
         <span className="text-[14px] font-bold tracking-[0.3em] uppercase opacity-80">VANTA v1.0.0</span>
         <div className="flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${backend === "online" ? "bg-[var(--ok)] shadow-[0_0_10px_var(--ok)]" : "bg-[var(--err)] shadow-[0_0_10px_var(--err)]"}`} />
            <span className="text-[14px] font-bold uppercase tracking-[0.3em]">{backend === "online" ? "Ready" : "Offline"}</span>
         </div>
      </footer>
    </div>
  );
}
