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
  const [error, setError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

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
      
      // Same four steps the engine visualises, and the same four the model
      // actually performs.
      if (progressValue < 25) setStage("ENCODING...");
      else if (progressValue < 50) setStage("IDENTIFYING VOICE...");
      else if (progressValue < 75) setStage("SEPARATING...");
      else setStage("RECONSTRUCTING...");
      
      if (elapsed >= DURATION) clearInterval(interval);
    }, 16); // 60fps for smooth progress sync

    return () => clearInterval(interval);
  }, [status]);

  const canRun = !!(mixture && enrollment) && status !== "running";

  const run = useCallback(async () => {
    if (!mixture || !enrollment) return;
    setStatus("running");
    setResult(null);
    setError(null);
    try {
      const startTime = Date.now();
      const r = await extract(mixture, enrollment);
      const elapsed = Date.now() - startTime;

      // Intentional floor, not latency: hold results until the staged animation
      // finishes. Extraction can return in well under a second on GPU, and an
      // instant result reads as "nothing happened" rather than "that was fast".
      // Deliberate — don't remove it as an optimisation.
      const minDuration = 5000;
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
      setError(e instanceof Error ? e.message : "Extraction failed. Please try again.");
      setStatus("error");
    }
  }, [mixture, enrollment]);

  const loadSample = useCallback(async () => {
    setSampleLoading(true);
    setError(null);
    try {
      const grab = async (name: string) => {
        const r = await fetch(`/sample/${name}`);
        if (!r.ok) throw new Error("sample unavailable");
        return new File([await r.blob()], name, { type: "audio/wav" });
      };
      const [ref, mix] = await Promise.all([grab("reference.wav"), grab("mixture.wav")]);
      setResult(null);
      setEnrollment(ref);
      setMixture(mix);
    } catch {
      // Deliberately not setStatus("error"): nothing was extracted, and that
      // state is only cleared by a successful run or a reset, which would leave
      // the bar reading EXTRACTION FAILED indefinitely.
      setError("Could not load the example. Please upload your own audio.");
    } finally {
      setSampleLoading(false);
    }
  }, []);

  const download = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    // Firefox requires the anchor to be in the document, and revoking the URL
    // in the same tick cancels the download or writes a 0-byte file in Firefox
    // and some Safari versions. Chrome tolerates both, which is why this looked
    // fine locally.
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }, []);

  const reset = useCallback(() => {
    setEnrollment(null);
    setMixture(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setStage("");
    setError(null);
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
        { element: '#vanta-tour-center', popover: { title: 'Neural Engine & Extraction', description: 'This is the heart of Vanta. Once your signals are loaded, our speaker-conditioned separation model — trained from scratch — analyzes them. Click "START EXTRACTION" at the bottom to begin the process.', side: "top", align: 'center' } },
        { element: '#vanta-clean', popover: { title: 'Isolated Clean Voice', description: 'The target speaker will be rendered here. You can play it directly or download the high-fidelity WAV file.', side: "left", align: 'start' } },
        { element: '#vanta-residue', popover: { title: 'The Residue', description: 'Everything else (background noise, other voices) is moved to this card, ensuring your clean signal remains pure.', side: "left", align: 'start' } },
      ]
    });
    driverObj.drive();
  }, []);

  return (
    // Below xl the page is a normal scrolling document: the viewport is too
    // short to hold three stacked columns, and pinning to h-screen forced the
    // grid rows to overlap. Only the wide layout is height-locked.
    <div className="min-h-screen xl:h-screen w-full flex flex-col bg-[var(--bg-app)] xl:overflow-hidden font-sans">
        <Header onReset={reset} onStartTour={startTour} id="vanta-header" />

        {/* pb-40 below xl: the extract bar is fixed to the viewport bottom
            there, so the last card needs room to scroll clear of it. */}
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-[450px_1fr_450px] lg:grid-cols-[380px_1fr_380px] xl:overflow-hidden px-4 md:px-8 xl:px-12 gap-8 xl:gap-10 pt-6 pb-40 xl:pb-6">
          {/* INPUTS COLUMN */}
          <section id="vanta-inputs" className="flex flex-col h-auto xl:h-full xl:overflow-hidden">
            <div className="mb-3 shrink-0 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-mono-heading text-[18px] font-black tracking-widest text-[var(--text-main)] mb-0.5 uppercase">INPUTS</h2>
                <p className="text-[12px] text-[var(--text-muted)] font-medium">Provide reference and noise audio.</p>
              </div>
              {/* Without this, nothing can be heard until the visitor finds and
                  uploads two files — one of which has to be a clean solo clip. */}
              <button
                onClick={loadSample}
                disabled={sampleLoading || status === 'running'}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-[var(--border-main)] font-mono-heading text-[10px] font-black tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sampleLoading ? "LOADING..." : "TRY AN EXAMPLE"}
              </button>
            </div>
            
            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="h-[200px] xl:h-auto xl:flex-1 xl:min-h-[180px]">
                    <AudioCard
                      id="vanta-reference"
                      heading="REFERENCE AUDIO"
                      hint="A clean clip of the one voice you want to keep."
                      source={enrollment}
                      variant="brown"
                      onClear={() => setEnrollment(null)}
                      onFile={(f) => setEnrollment(f)}
                      className="h-full"
                    />
                </div>

                <div className="h-[200px] xl:h-auto xl:flex-1 xl:min-h-[180px]">
                    <AudioCard
                      id="vanta-noise"
                      heading="NOISE AUDIO"
                      hint="The messy recording with that voice and everything else."
                      source={mixture}
                      variant="red"
                      onClear={() => setMixture(null)}
                      onFile={(f) => setMixture(f)}
                      className="h-full"
                    />
                </div>

                {/* Desktop only: balances the activity strip closing the outputs
                    column, so both columns spend the same height on cards.
                    Below xl it reappears after the outputs (see end of grid). */}
                <div className="hidden xl:block h-20 shrink-0 mt-1">
                  <TipsCard />
                </div>
            </div>
          </section>

          {/* ENGINE COLUMN */}
          <section className="flex flex-col h-auto xl:h-full min-h-[450px] xl:overflow-hidden">
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
          <section id="vanta-outputs" className="flex flex-col h-auto xl:h-full xl:overflow-hidden">
            <div className="mb-3 shrink-0">
              <h2 className="font-mono-heading text-[18px] font-black tracking-widest text-[var(--text-main)] mb-0.5 uppercase">OUTPUTS</h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium">Clean voice and residue (noise).</p>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="h-[200px] xl:h-auto xl:flex-1 xl:min-h-[180px]">
                    <AudioCard
                      id="vanta-clean"
                      heading="CLEAN VOICE"
                      source={result?.extracted ?? null}
                      variant="green"
                      onDownload={result ? () => download(result.extracted, "vanta_clean.wav") : undefined}
                      emptyLabel="Your clean voice will appear here"
                      className="h-full"
                    />
                </div>

                <div className="h-[200px] xl:h-auto xl:flex-1 xl:min-h-[180px]">
                    <AudioCard
                      id="vanta-residue"
                      heading="RESIDUE (NOISE)"
                      source={result?.residue ?? null}
                      variant="purple"
                      onDownload={result ? () => download(result.residue, "vanta_residue.wav") : undefined}
                      emptyLabel="Noise residue will appear here"
                      className="h-full"
                    />
                </div>

                 <div className="h-auto min-h-20 xl:h-20 shrink-0 mt-1">
                    <div className="h-full flex items-start gap-4 group/activity">
                       <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                         <Activity className="h-4 w-4 text-[var(--text-muted)] group-hover/activity:text-[var(--text-main)] transition-colors shrink-0 mt-0.5" />
                       </motion.div>
                       <p className={`text-[12px] leading-relaxed font-medium transition-colors ${result?.meta.truncated ? 'text-amber-400/90' : 'text-[var(--text-muted)] group-hover/activity:text-[var(--text-main)]'}`}>
                         {result?.meta.truncated
                           ? `Only the first ${Math.round(result.meta.outputSeconds)}s were processed — Vanta caps input at 30 seconds.`
                           : "Your outputs will be available here once processing is complete."}
                       </p>
                    </div>
                 </div>

                 {/* Below xl only: with the columns stacked, tips read best as
                     a closing note. On desktop it lives in the inputs column
                     instead, so neither column carries an extra strip. */}
                 <div className="xl:hidden h-auto min-h-20 shrink-0 mt-1">
                    <TipsCard />
                 </div>
             </div>
           </section>
         </main>
 
         {/* TOUR PROXY: Invisible element to highlight center area including status bar */}
         <div id="vanta-tour-center" className="fixed top-[15%] bottom-[5%] left-1/2 -translate-x-1/2 w-full max-w-[520px] pointer-events-none z-[-1]" />

         {/* BOTTOM STATUS BAR */}
         <div className="fixed xl:absolute bottom-4 xl:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[550px] px-4 md:px-8 z-50">
             <motion.div 
                 id="vanta-status-bar"
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
                    <div className="flex flex-col min-w-0">
                        <span className={`font-mono-heading text-[12px] font-black tracking-widest ${status === 'error' ? 'text-red-400' : ''}`}>
                            {status === 'error'
                                ? "EXTRACTION FAILED"
                                : error
                                    ? "COULD NOT LOAD"
                                : status === 'running'
                                    ? "PROCESSING IN REAL-TIME"
                                    : backend === 'offline'
                                        ? "BACKEND UNREACHABLE"
                                        : "READY TO PROCESS"}
                        </span>
                        <span className={`text-[9px] font-bold opacity-80 truncate ${status === 'error' || backend === 'offline' ? 'text-red-400/80' : 'text-[var(--text-muted)]'}`}>
                            {status === 'error' || error
                                ? error ?? "Something went wrong. Please try again."
                                : status === 'running'
                                    ? `${stage} • ${Math.round(progress)}%`
                                    : backend === 'offline'
                                        ? "The inference API is not responding — extraction is unavailable."
                                        : "Both signals are processed simultaneously for best results."}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        id="vanta-extract-btn"
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
                        {status === 'running' ? "EXTRACTING..." : status === 'error' ? "TRY AGAIN" : "START EXTRACTION"}
                    </button>
                </div>
            </motion.div>
        </div>

        <footer className="px-10 py-4 flex items-center justify-between border-t border-[var(--border-main)]/30 bg-transparent relative z-10">
           <a
             href="https://github.com/Komalpreet2809/Vanta"
             target="_blank"
             rel="noreferrer"
             className="text-[10px] font-mono font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-60 hover:opacity-100 hover:text-[var(--text-main)] transition-all"
           >
             SOURCE ON GITHUB
           </a>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black tracking-widest text-[var(--text-muted)] uppercase flex items-center gap-1.5 opacity-60">
                MADE WITH <span className="text-red-500">❤️</span> BY KOMAL
              </span>
           </div>
        </footer>
    </div>
  );
}
