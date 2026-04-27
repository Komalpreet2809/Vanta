"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";
import { Info } from "lucide-react";
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
    
    let currentProgress = 0;
    const interval = setInterval(() => {
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
      }, 600);
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

        <main className="flex-1 grid grid-cols-[1fr_1.5fr_1fr] overflow-hidden px-12 gap-12">
          {/* INPUTS COLUMN */}
          <section id="vanta-inputs" className="flex flex-col h-full overflow-hidden py-4">
            <div className="mb-8">
              <h2 className="font-mono-heading text-[16px] font-black tracking-widest text-[var(--text-main)] mb-1">INPUTS</h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Provide reference and noise audio.</p>
            </div>
            
            <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                <AudioCard
                  id="vanta-reference"
                  heading="REFERENCE AUDIO"
                  source={enrollment}
                  variant="brown"
                  onClear={() => setEnrollment(null)}
                  onFile={(f) => setEnrollment(f)}
                />

                <AudioCard
                  id="vanta-noise"
                  heading="NOISE AUDIO"
                  source={mixture}
                  variant="red"
                  onClear={() => setMixture(null)}
                  onFile={(f) => setMixture(f)}
                />
            </div>

            <div className="pt-8">
              <TipsCard />
            </div>
          </section>

          {/* ENGINE COLUMN */}
          <section className="flex flex-col h-full overflow-hidden">
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
          <section id="vanta-outputs" className="flex flex-col h-full overflow-hidden py-4">
            <div className="mb-8">
              <h2 className="font-mono-heading text-[16px] font-black tracking-widest text-[var(--text-main)] mb-1">OUTPUTS</h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Clean voice and residue (noise).</p>
            </div>

            <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                <AudioCard
                  heading="CLEAN VOICE"
                  source={result?.extracted ?? null}
                  variant="green"
                  onDownload={result ? () => download(result.extracted, "vanta_clean.mp3") : undefined}
                  emptyLabel="Your clean voice will appear here"
                />

                <AudioCard
                  heading="RESIDUE (NOISE)"
                  source={result?.residue ?? null}
                  variant="purple"
                  onDownload={result ? () => download(result.residue, "vanta_residue.mp3") : undefined}
                  emptyLabel="Noise residue will appear here"
                />
            </div>

            <div className="pt-8">
               <div className="flex items-start gap-4 p-4 rounded-xl bg-black/[0.02] border border-[var(--border-main)]">
                  <Info className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                    Your outputs will be available here once processing is complete. Both signals are extracted in real-time.
                  </p>
               </div>
            </div>
          </section>
        </main>

        <footer className="px-10 py-4 flex items-center justify-between border-t border-[var(--border-main)] bg-transparent">
           <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--text-muted)] uppercase">VANTA v1.0.0</span>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                MADE WITH <span className="text-red-500">❤️</span> BY KOMAL
              </span>
           </div>
        </footer>
    </div>
  );
}
