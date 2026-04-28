"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";
import { Activity, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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
    
    const DURATION = 5000; // 5 seconds total
    const start = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progressValue = Math.min(95, (elapsed / DURATION) * 100);
      setProgress(progressValue);
      
      if (progressValue < 25) setStage("ANALYZING SIGNALS...");
      else if (progressValue < 50) setStage("ISOLATING TARGET...");
      else if (progressValue < 75) setStage("EXTRACTING RESIDUE...");
      else setStage("FINALIZING...");
      
      if (elapsed >= DURATION) clearInterval(interval);
    }, 16); // 60fps for smooth progress sync

    return () => clearInterval(interval);
  }, [status]);

  const canRun = !!(mixture && enrollment) && status !== "running";

  const run = useCallback(async () => {
    if (!mixture || !enrollment) return;
    setStatus("running");
    setResult(null);
    try {
      const startTime = Date.now();
      const r = await extract(mixture, enrollment);
      const elapsed = Date.now() - startTime;
      const minDuration = 5000; // Match the 5s visual sequence
      
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }

      setProgress(100);
      setStage("RESULTS READY");
      setTimeout(() => {
        setResult(r);
        setStatus("idle");
      }, 800);
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

  const reset = useCallback(() => {
    setEnrollment(null);
    setMixture(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setStage("");
  }, []);

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      popoverClass: 'driverjs-theme',
      steps: [
        { element: '#vanta-header', popover: { title: 'Welcome to Vanta', description: 'The next generation of signal isolation. Let\'s show you how to extract any voice from a noisy environment.', side: "bottom", align: 'start' } },
        { element: '#vanta-inputs', popover: { title: 'The Inputs', description: 'Everything starts here. You need two pieces of audio to begin the extraction process.', side: "right", align: 'start' } },
        { element: '#vanta-reference', popover: { title: 'Reference Audio', description: 'Upload a clean sample of the voice you want to isolate.', side: "right", align: 'center' } },
        { element: '#vanta-noise', popover: { title: 'Noisy Recording', description: 'Upload the recording that contains both the target voice and background noise.', side: "right", align: 'center' } },
        { element: '#vanta-engine', popover: { title: 'The Extraction Engine', description: 'Click "EXTRACT VOICE" to start the AI isolation process.', side: "top", align: 'center' } },
        { element: '#vanta-outputs', popover: { title: 'Results', description: 'Your isolated voice will appear here once processing is complete.', side: "left", align: 'start' } },
      ]
    });
    driverObj.drive();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-app)] overflow-hidden font-sans">
        <Header onReset={reset} onStartTour={startTour} id="vanta-header" />

        <main className="flex-1 grid grid-cols-1 xl:grid-cols-[450px_1fr_450px] lg:grid-cols-[380px_1fr_380px] overflow-y-auto xl:overflow-hidden px-4 md:px-8 xl:px-12 gap-6 xl:gap-10 py-6">
          {/* INPUTS COLUMN */}
          <section id="vanta-inputs" className="flex flex-col h-fit xl:h-full overflow-hidden order-2 xl:order-1">
            <div className="mb-3 shrink-0">
              <h2 className="font-mono-heading text-[18px] font-black tracking-widest text-[var(--text-main)] mb-0.5 uppercase">INPUTS</h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium">Provide reference and noise audio.</p>
            </div>
            
            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex-1 min-h-[180px]">
                    <AudioCard
                      id="vanta-reference"
                      heading="REFERENCE AUDIO"
                      source={enrollment}
                      variant="brown"
                      onClear={() => setEnrollment(null)}
                      onFile={(f) => setEnrollment(f)}
                      className="h-full"
                    />
                </div>

                <div className="flex-1 min-h-[180px]">
                    <AudioCard
                      id="vanta-noise"
                      heading="NOISE AUDIO"
                      source={mixture}
                      variant="red"
                      onClear={() => setMixture(null)}
                      onFile={(f) => setMixture(f)}
                      className="h-full"
                    />
                </div>

                <div className="h-20 shrink-0 mt-1">
                  <TipsCard />
                </div>
            </div>
          </section>

          {/* ENGINE COLUMN */}
          <section className="flex flex-col h-fit xl:h-full min-h-[450px] overflow-hidden order-1 xl:order-2">
              <EngineCenter
                id="vanta-engine"
                canExtract={!!canRun}
                status={status}
                progress={progress}
                stage={stage}
                onExtract={run}
              />
          </section>

          {/* OUTPUTS COLUMN */}
          <section id="vanta-outputs" className="flex flex-col h-fit xl:h-full overflow-hidden order-3">
            <div className="mb-3 shrink-0">
              <h2 className="font-mono-heading text-[18px] font-black tracking-widest text-[var(--text-main)] mb-0.5 uppercase">OUTPUTS</h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium">Clean voice and residue (noise).</p>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex-1 min-h-[180px]">
                    <AudioCard
                      heading="CLEAN VOICE"
                      source={result?.extracted ?? null}
                      variant="green"
                      onDownload={result ? () => download(result.extracted, "vanta_clean.mp3") : undefined}
                      emptyLabel="Your clean voice will appear here"
                      className="h-full"
                    />
                </div>

                <div className="flex-1 min-h-[180px]">
                    <AudioCard
                      heading="RESIDUE (NOISE)"
                      source={result?.residue ?? null}
                      variant="purple"
                      onDownload={result ? () => download(result.residue, "vanta_residue.mp3") : undefined}
                      emptyLabel="Noise residue will appear here"
                      className="h-full"
                    />
                </div>

                 <div className="h-20 shrink-0 mt-1">
                    <div className="h-full flex items-start gap-4 group/activity">
                       <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                         <Activity className="h-4 w-4 text-[var(--text-muted)] group-hover/activity:text-[var(--text-main)] transition-colors shrink-0 mt-0.5" />
                       </motion.div>
                       <p className="text-[12px] text-[var(--text-muted)] leading-relaxed font-medium group-hover/activity:text-[var(--text-main)] transition-colors">
                         Your outputs will be available here once processing is complete.
                       </p>
                    </div>
                 </div>
             </div>
           </section>
         </main>
 
         {/* BOTTOM STATUS BAR */}
         <div className="fixed xl:absolute bottom-4 xl:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[550px] px-4 md:px-8 z-50">
             <motion.div 
                 layout
                 className="vanta-card p-3 flex items-center justify-between gap-4 bg-[var(--bg-card)]/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t border-white/20"
             >
                 <div className="flex items-center gap-4 group/status">
                     <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-500 shadow-inner ${status === 'running' ? 'bg-[var(--text-main)] text-[var(--bg-app)]' : 'bg-[var(--bg-app)] border-[var(--border-main)]'}`}
                     >
                          <Activity className={`w-6 h-6 ${status === 'running' ? 'animate-pulse' : 'text-[var(--text-muted)] opacity-50 group-hover/status:opacity-100'} transition-opacity`} />
                     </motion.div>
                    <div className="flex flex-col">
                        <span className="font-mono-heading text-[12px] font-black tracking-widest">
                            {status === 'running' ? "PROCESSING IN REAL-TIME" : "READY TO PROCESS"}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)] font-bold opacity-80">
                            {status === 'running' ? `${stage} • ${Math.round(progress)}%` : "Both signals are processed simultaneously for best results."}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">


                    <button
                        disabled={!canRun}
                        onClick={run}
                        className={`px-6 py-2.5 rounded-lg font-mono-heading text-[11px] font-black tracking-widest transition-all ${
                            status === 'running' 
                            ? 'bg-transparent border border-[var(--border-main)] opacity-50 cursor-not-allowed'
                            : canRun 
                                ? 'bg-[var(--text-main)] text-[var(--bg-app)] hover:scale-105 active:scale-95 shadow-xl hover:shadow-[var(--text-main)]/20'
                                : 'bg-[var(--bg-app)] border border-[var(--border-main)] opacity-30 cursor-not-allowed'
                        }`}
                    >
                        {status === 'running' ? "EXTRACTING..." : "START EXTRACTION"}
                    </button>
                </div>
            </motion.div>
        </div>

        <footer className="px-10 py-4 flex items-center justify-between border-t border-[var(--border-main)]/30 bg-transparent relative z-10">
           <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-60">VANTA v1.0.0</span>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black tracking-widest text-[var(--text-muted)] uppercase flex items-center gap-1.5 opacity-60">
                MADE WITH <span className="text-red-500">❤️</span> BY KOMAL
              </span>
           </div>
        </footer>
    </div>
  );
}
