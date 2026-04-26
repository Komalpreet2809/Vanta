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
    <div className="min-h-screen flex flex-col bg-[#e2dfd2] font-mono selection:bg-[#1a1a1a] selection:text-[#efeae0]">
      <Header />

      <main className="flex-1 grid grid-cols-[1fr_1.2fr_1fr] divide-x divide-[var(--border-strong)] overflow-hidden">
        {/* INPUTS */}
        <section className="p-10 flex flex-col gap-8 bg-[#e8e6db] overflow-y-auto">
          <div>
            <h2 className="text-[24px] font-bold uppercase tracking-widest mb-1">Inputs</h2>
            <p className="text-[12px] font-medium text-[var(--text-soft)]">Provide reference and noise audio.</p>
          </div>

          <div className="flex flex-col gap-6">
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
            <h2 className="text-[24px] font-bold uppercase tracking-[0.5em] mb-1">Vanta Engine</h2>
            <p className="text-[12px] font-medium text-[var(--text-soft)]">Isolates the target voice from noise.</p>
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

          {/* Mode Selector */}
          <div className="mt-auto w-full max-w-[340px] mx-auto pb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-[1px] flex-1 bg-[var(--border)]" />
              <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.3em]">Mode</span>
              <div className="h-[1px] flex-1 bg-[var(--border)]" />
            </div>
            <div className="inset-panel px-6 py-4 flex items-center justify-between text-[13px] cursor-pointer hover:bg-[var(--bg-hover)]">
               <span className="font-bold uppercase tracking-wider">High Quality (Recommended)</span>
               <svg className="h-5 w-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
               </svg>
            </div>
          </div>
        </section>

        {/* OUTPUTS */}
        <section className="p-10 flex flex-col gap-8 bg-[#e8e6db] overflow-y-auto">
          <div>
            <h2 className="text-[24px] font-bold uppercase tracking-widest mb-1">Outputs</h2>
            <p className="text-[12px] font-medium text-[var(--text-soft)]">Clean voice and residue (noise).</p>
          </div>

          <div className="flex flex-col gap-6 flex-1">
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
              <div className="panel flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-page)]/10 border-dashed border-2">
                 <div className="h-16 w-16 border border-dashed border-[var(--border)] rounded-full flex items-center justify-center mb-6 opacity-30">
                   <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 4v12" />
                   </svg>
                 </div>
                 <p className="text-[12px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] leading-relaxed">Outputs will appear here<br/>after processing is complete.</p>
              </div>
            )}

            {result && (
              <div className="mt-auto panel p-6 border-l-[6px] border-l-[var(--c-green)] bg-[var(--bg-card)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                       <div className="h-2.5 w-2.5 rounded-full bg-[var(--c-green)] shadow-[0_0_10px_var(--c-green)]" />
                       <span className="text-[13px] font-bold uppercase tracking-[0.2em]">Processing Successful</span>
                    </div>
                 </div>
                 <p className="text-[14px] font-bold leading-tight tabular-nums">{message}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="px-10 py-3 border-t border-[var(--border-strong)] flex items-center justify-between bg-[#e2dfd2]">
         <span className="text-[12px] font-bold tracking-[0.2em] uppercase opacity-70">VANTA v1.0.0</span>
         <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${backend === "online" ? "bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" : "bg-[var(--err)] shadow-[0_0_8px_var(--err)]"}`} />
            <span className="text-[12px] font-bold uppercase tracking-[0.2em]">{backend === "online" ? "Ready" : "Offline"}</span>
         </div>
      </footer>
    </div>
  );
}
