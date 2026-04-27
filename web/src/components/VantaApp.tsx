"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

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

  useEffect(() => {
    if (status !== "running") {
      setProgress(0);
      setStage("");
      return;
    }
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Ease progress towards 95% asymptotically
      currentProgress += (95 - currentProgress) * 0.04;
      setProgress(currentProgress);
      
      if (currentProgress < 30) setStage("ANALYZING SIGNALS...");
      else if (currentProgress < 70) setStage("ISOLATING TARGET...");
      else setStage("EXTRACTING RESIDUE...");
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  const canRun = !!(mixture && enrollment) && status !== "running";

  const run = useCallback(async () => {
    if (!mixture || !enrollment) return;
    setStatus("running");
    setResult(null);
    try {
      const r = await extract(mixture, enrollment);
      setProgress(100);
      setStage("FINALIZING...");
      setTimeout(() => {
        setResult(r);
        setStatus("idle");
      }, 600); // Brief pause to show 100% finalizing before results pop
    } catch (e) {
      console.error(e);
      setStatus("error");
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
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-app)] overflow-hidden">
        <Header />

        <main className="flex-1 grid grid-cols-[1fr_1.3fr_1fr] overflow-hidden px-8 gap-4">
          {/* INPUTS COLUMN */}
          <section className="flex flex-col h-full overflow-hidden bg-[var(--bg-app)]">
            <div className="p-4 h-20 flex flex-col justify-center">
              <h2 className="font-mono-heading font-black text-[20px] uppercase tracking-wider text-[var(--text-main)] leading-none">Inputs</h2>
              <p className="text-[12px] font-medium opacity-80 mt-1.5">Provide reference and noise audio.</p>
            </div>
            
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex-1 min-h-0">
                <AudioCard
                  heading="Reference Audio"
                  source={enrollment}
                  variant="brown"
                  onClear={() => setEnrollment(null)}
                  onFile={(f) => setEnrollment(f)}
                  emptyLabel="No reference audio loaded"
                  className="h-full w-full"
                />
              </div>

              <div className="flex-1 min-h-0">
                <AudioCard
                  heading="Noise Audio"
                  source={mixture}
                  variant="red"
                  onClear={() => setMixture(null)}
                  onFile={(f) => setMixture(f)}
                  emptyLabel="No noisy recording loaded"
                  className="h-full w-full"
                />
              </div>
            </div>

            <div className="px-4 pb-6 pt-0 shrink-0 flex items-start">
              <TipsCard />
            </div>
          </section>

          {/* ENGINE COLUMN - The focal point matching inspo.png */}
          <section className="bg-transparent p-0 flex flex-col h-full overflow-hidden">
              <EngineCenter
                canExtract={!!canRun}
                status={status}
                progress={progress}
                stage={stage}
                onExtract={run}
              />
          </section>

          {/* OUTPUTS COLUMN */}
          <section className="flex flex-col h-full overflow-hidden bg-[var(--bg-app)]">
            <div className="p-4 h-20 flex flex-col justify-center">
              <h2 className="font-mono-heading font-black text-[20px] uppercase tracking-wider text-[var(--text-main)] leading-none">Outputs</h2>
              <p className="text-[12px] font-medium opacity-80 mt-1.5">Clean voice and residue (noise).</p>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex-1 min-h-0 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={result ? "result-clean" : "empty-clean"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    <AudioCard
                      heading="Clean Voice"
                      source={result?.extracted ?? null}
                      filenameOverride="Extracted_Voice.mp3"
                      variant="green"
                      onDownload={
                        result
                          ? () => download(result.extracted, "vanta_extracted.mp3")
                          : undefined
                      }
                      emptyLabel={"Clean voice will appear here\nafter processing"}
                      className="h-full w-full"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex-1 min-h-0 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={result ? "result-residue" : "empty-residue"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: result ? 0.1 : 0 }}
                    className="absolute inset-0"
                  >
                    <AudioCard
                      heading="Residue (Noise)"
                      source={result?.residue ?? null}
                      filenameOverride="Residue_Noise.mp3"
                      variant="purple"
                      onDownload={
                        result
                          ? () => download(result.residue, "vanta_residue.mp3")
                          : undefined
                      }
                      emptyLabel={"Residue will appear here\nafter processing"}
                      className="h-full w-full"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="px-4 pb-6 pt-0 shrink-0 flex items-start">
               <div className="card-border p-3 flex items-start gap-3 bg-[var(--bg-app)] shadow-sm w-full">
                  <Info className="h-4 w-4 stroke-[1.5] text-[var(--text-main)] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[var(--text-main)] leading-relaxed font-medium">
                    Your outputs will be available here once processing is complete.<br />
                    Both signals are extracted in real-time.
                  </p>
               </div>
            </div>
          </section>
        </main>

        <footer className="px-6 py-2 border-t border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-footer)]">
           <span className="text-[11px] font-mono font-bold tracking-tight opacity-70">VANTA v1.0.0</span>
           <div className="flex items-center gap-2 opacity-80">
              <div className={`h-2 w-2 rounded-full ${backend === "online" ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]"}`} />
              <span className="text-[11px] font-bold tracking-tight uppercase">{backend === "online" ? "MADE BY KOMAL" : "OFFLINE"}</span>
           </div>
        </footer>
    </div>
  );
}
