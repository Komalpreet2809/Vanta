"use client";

import { History as HistoryIcon, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FileUploadSlot } from "./FileUploadSlot";
import { WaveformRow } from "./WaveformRow";
import { AnalogEngine } from "./AnalogEngine";
import { HistorySidebar, type HistoryItem } from "./HistorySidebar";
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
  const [device, setDevice] = useState<string | undefined>();
  
  // New States
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    health().then((h) => {
      if (cancelled) return;
      setBackend(h.ok ? "online" : "offline");
      setDevice(h.device);
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
      
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        filename: mixture.name,
        result: r
      };
      setHistory(prev => [newItem, ...prev]);
      
      setMessage(`Operation complete in ${(ms/1000).toFixed(2)}s`);
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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] font-mono selection:bg-[var(--text)] selection:text-[var(--bg-page)]">
      {/* Top Header */}
      <header className="px-10 py-6 border-b border-[var(--border-strong)] flex items-center justify-between">
        <div className="flex items-center gap-4">
           {/* Refined Industrial Wave Logo */}
           <svg className="h-10 w-10 text-[var(--text)]" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
             <path d="M4 20h4l4-12 8 24 4-12h12" />
             <path d="M12 12l8 16 4-8" className="opacity-40" />
           </svg>
          <span className="text-[24px] font-bold tracking-[0.4em] uppercase">Vanta</span>
        </div>

        <div className="flex items-center gap-4">
           <button onClick={() => setIsHistoryOpen(true)} className="industrial-button px-6 py-2.5 text-[12px] font-bold uppercase flex items-center gap-2">
             <HistoryIcon className="h-4 w-4" />
             History
           </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-3 divide-x divide-[var(--border-strong)]">
        
        {/* Left Column: INPUTS */}
        <section className="p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-[18px] font-bold uppercase tracking-widest mb-1">Inputs</h2>
            <p className="text-[11px] text-[var(--text-soft)]">Provide reference and noise audio.</p>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
               <FileUploadSlot
                 slot="REF"
                 label="Reference Audio"
                 file={enrollment}
                 onFile={setEnrollment}
               />
               {enrollment && (
                 <WaveformRow label="Reference" source={enrollment} color="var(--accent-charcoal)" />
               )}
            </div>

            <div className="flex flex-col gap-3">
               <FileUploadSlot
                 slot="MIX"
                 label="Noise Audio"
                 file={mixture}
                 onFile={setMixture}
               />
               {mixture && (
                 <WaveformRow label="Mixture" source={mixture} color="var(--accent-red)" />
               )}
            </div>

            {/* Tips Box */}
            <div className="panel p-5 mt-4">
               <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase">Tips</span>
               </div>
               <ul className="space-y-2 text-[10px] text-[var(--text-soft)]">
                 <li>• Supports WAV, MP3, M4A</li>
                 <li>• Recommended: 5–30 seconds</li>
               </ul>
            </div>
          </div>
        </section>

        {/* Middle Column: ENGINE */}
        <section className="p-8 flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-[18px] font-bold uppercase tracking-[0.3em] mb-1">Vanta Engine</h2>
            <p className="text-[11px] text-[var(--text-soft)]">Isolates the target voice from noise.</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
             <AnalogEngine status={status} onExtract={run} canExtract={canRun} />
          </div>
        </section>

        {/* Right Column: OUTPUTS */}
        <section className="p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-[18px] font-bold uppercase tracking-widest mb-1">Outputs</h2>
            <p className="text-[11px] text-[var(--text-soft)]">Clean voice and residue (noise).</p>
          </div>

          <div className="flex flex-col gap-8 flex-1">
            {!result ? (
              <div className="panel flex-1 flex flex-col items-center justify-center p-12 text-center">
                 <div className="h-10 w-10 border border-dashed border-[var(--border)] rounded-full flex items-center justify-center mb-4 opacity-40">
                   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 4v12" />
                   </svg>
                 </div>
                 <p className="text-[11px] text-[var(--text-dim)]">Outputs will appear here<br/>after processing is complete.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-3">
                   <div className="panel px-4 py-3 bg-[var(--bg-card)]">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[11px] font-bold uppercase tracking-wider">Clean Voice</span>
                         <span className="text-[10px] text-[var(--text-dim)]">LIVE OUTPUT</span>
                      </div>
                      <WaveformRow label="Clean" source={result.extracted} color="var(--accent-green)" onDownload={() => download(result.extracted, "vanta_clean.wav")} />
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <div className="panel px-4 py-3 bg-[var(--bg-card)]">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[11px] font-bold uppercase tracking-wider">Residue (Noise)</span>
                         <span className="text-[10px] text-[var(--text-dim)]">BYPRODUCT</span>
                      </div>
                      <WaveformRow label="Residue" source={result.residue} color="var(--accent-purple)" onDownload={() => download(result.residue, "vanta_residue.wav")} />
                   </div>
                </div>

                <div className="mt-auto panel p-5 border-l-4 border-l-[var(--accent-green)]">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-[var(--accent-green)] shadow-[0_0_8px_var(--accent-green)]" />
                         <span className="text-[11px] font-bold uppercase">Success</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-60">SR: {result.meta.sampleRate}Hz</span>
                   </div>
                   <p className="text-[12px] font-medium leading-tight">{message}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-10 py-4 border-t border-[var(--border-strong)] flex items-center justify-between bg-[var(--bg-card)]/50">
         <span className="text-[10px] font-bold tracking-wider opacity-60">VANTA v1.0.0</span>
         <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${backend === "online" ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{backend === "online" ? "System Ready" : "System Offline"}</span>
         </div>
      </footer>

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={history}
        onSelect={(item) => {
          setResult(item.result);
          setIsHistoryOpen(false);
        }}
        onDelete={(id) => setHistory((prev) => prev.filter((i) => i.id !== id))}
      />
    </div>
  );
}

