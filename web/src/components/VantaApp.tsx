"use client";

import { Cpu, History as HistoryIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FileUploadSlot } from "./FileUploadSlot";
import { WaveformRow } from "./WaveformRow";
import { EngineOrb } from "./EngineOrb";
import { HistorySidebar, type HistoryItem } from "./HistorySidebar";
import { extract, health, type ExtractMeta } from "../lib/api";

type Stage = "decoding" | "extracting" | "matching" | "encoding";

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
  const [stage, setStage] = useState<Stage>("decoding");
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
    setStage("decoding");
    setMessage("");
    setResult(null);

    try {
      const t0 = performance.now();
      const extractPromise = extract(mixture, enrollment);
      
      await new Promise(r => setTimeout(r, 800));
      setStage("extracting");
      
      await new Promise(r => setTimeout(r, 1500));
      setStage("matching");
      
      const r = await extractPromise;
      
      setStage("encoding");
      await new Promise(r => setTimeout(r, 600));

      const ms = Math.round(performance.now() - t0);
      setResult(r);
      
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        filename: mixture.name,
        result: r
      };
      setHistory(prev => [newItem, ...prev]);
      
      setMessage(`Completed in ${(ms/1000).toFixed(2)}s`);
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

  const accelerationLabel =
    backend === "online" && device?.toLowerCase().startsWith("cuda")
      ? "CUDA"
      : backend === "online"
        ? (device?.toUpperCase() ?? "CPU")
        : "OFFLINE";

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-[var(--border)] bg-[var(--bg-page)]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5">
              {[0.4, 0.7, 1, 0.6, 0.3].map((h, i) => (
                <div key={i} className="w-0.5 bg-[var(--accent)]" style={{ height: h * 16 }} />
              ))}
            </div>
            <span className="text-[18px] font-bold tracking-[0.3em] uppercase">Vanta</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-2.5 py-1">
             <div className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
             <span className="text-[10px] font-bold font-mono text-[var(--text-soft)]">{accelerationLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 text-[13px] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
            <HistoryIcon className="h-4 w-4" />
            History
          </button>
          <button className="flex items-center gap-2 text-[13px] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
            <Cpu className="h-4 w-4" />
            Settings
          </button>
          <div className="h-8 w-8 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-[11px] font-bold border border-[var(--border)]">N</div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-10 py-12">
        {/* Hero Section */}
        <div className="flex items-end justify-between mb-16">
          <div className="max-w-xl">
            <h1 className="text-[36px] font-bold leading-tight mb-3">Extract target speaker</h1>
            <p className="text-[14px] text-[var(--text-soft)] leading-relaxed">
              Upload a 5-second reference clip of one voice and a messy recording —<br/>
              the model isolates that voice and returns it without everything else.
            </p>
          </div>
          
          <button
            disabled={!canRun}
            onClick={run}
            className="group flex items-center gap-2.5 rounded-xl border border-[var(--border-strong)] bg-transparent hover:bg-[var(--accent)]/5 hover:border-[var(--accent)]/50 px-8 py-4 text-[14px] font-bold tracking-wide transition-all disabled:opacity-40"
          >
            <div className="flex items-center justify-center gap-0.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-1 w-1 rounded-full bg-[var(--accent)] group-hover:animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
            EXTRACT VOICE
          </button>
        </div>

        {/* 3-Column Dashboard */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-12">
          
          {/* Column 1: INPUT */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">Input</span>
                <span className="text-[13px] text-[var(--text-soft)]">Noisy Recording</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <FileUploadSlot
                slot="01"
                label="Noisy Recording"
                file={mixture}
                onFile={setMixture}
              />
              {mixture && (
                <WaveformRow label="Input Preview" source={mixture} variant="neutral" />
              )}
              
              <FileUploadSlot
                slot="02"
                label="Reference Voice"
                file={enrollment}
                onFile={setEnrollment}
              />
              {enrollment && (
                <WaveformRow label="Reference Preview" source={enrollment} variant="accent" />
              )}

              <div className="p-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-page)]/50">
                <div className="flex flex-col items-center gap-3 text-center">
                   <div className="h-10 w-10 rounded-full bg-[var(--bg-input)] flex items-center justify-center border border-[var(--border)]">
                      <svg className="h-5 w-5 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                   </div>
                   <span className="text-[12px] text-[var(--text-soft)]">Drag & drop audio/video<br/><span className="text-[var(--text-dim)]">or click to browse</span></span>
                </div>
              </div>
              
              <div className="mt-8">
                <span className="text-[11px] font-bold text-[var(--text-soft)] uppercase tracking-wider block mb-3">Tips:</span>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[12px] text-[var(--text-dim)]">
                    <div className="h-1 w-1 rounded-full bg-[var(--accent)]/50" />
                    Supports MP4, WAV, MP3
                  </li>
                  <li className="flex items-center gap-2 text-[12px] text-[var(--text-dim)]">
                    <div className="h-1 w-1 rounded-full bg-[var(--accent)]/50" />
                    Maximum duration: 30 seconds
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Column 2: ENGINE (Central Orb) */}
          <div className="px-8">
             <EngineOrb status={status} stageLabel={status === "running" ? stage : "VANTA Isolation Model"} />
          </div>

          {/* Column 3: OUTPUT */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">Output</span>
                <span className="text-[13px] text-[var(--text-soft)]">Extracted Voice</span>
              </div>
            </div>

            <div className="min-h-[400px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/50 p-6 flex flex-col gap-6 relative overflow-hidden glass">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center opacity-40">
                  <div className="h-12 w-12 rounded-full border border-[var(--border-strong)] flex items-center justify-center">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <span className="text-[13px]">Processing output will appear here</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  <FileUploadSlot
                    slot="OUT"
                    label="Extracted Voice"
                    file={new File([result.extracted], "vanta_extracted.wav")}
                    onFile={() => {}}
                  />
                  <WaveformRow
                    label="Isolation Preview"
                    source={result.extracted}
                    variant="accent"
                    onDownload={() => download(result.extracted, "vanta_extracted.wav")}
                  />
                  
                  <button
                    onClick={() => download(result.extracted, "vanta_extracted.wav")}
                    className="flex items-center justify-between w-full p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                       <svg className="h-5 w-5 text-[var(--text-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 4v12" />
                       </svg>
                       <span className="text-[13px] font-medium">Download Audio</span>
                    </div>
                    <svg className="h-4 w-4 text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border)] text-[12px]">
                    <span className="text-[var(--text-dim)]">Quality</span>
                    <span className="text-[var(--text-soft)] font-medium">High (Recommended)</span>
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--ok)]">
                       <div className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
                       <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
                    </div>
                    <span className="text-[12px] font-mono text-[var(--text-dim)]">{result.meta.outputSeconds.toFixed(2)}s</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Parameters Bar */}
        <div className="mt-20 p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/30 glass flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[var(--text-soft)] uppercase tracking-widest">Parameters</span>
           </div>
           
           <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                 <span className="text-[12px] text-[var(--text-dim)] flex items-center gap-1.5">
                   Separation Quality
                   <svg className="h-3.5 w-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </span>
                 <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[13px] text-[var(--text-soft)] min-w-[180px]">
                    High Quality (Slow)
                    <svg className="ml-auto h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                 </div>
              </div>

              <span className="text-[12px] text-[var(--text-dim)]">Best separation quality, higher processing time.</span>

              <button className="ml-auto flex items-center gap-2 text-[13px] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
                 Advanced Settings
                 <svg className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
              </button>
           </div>
        </div>
      </main>

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


}
