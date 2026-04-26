"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";
import { Info } from "lucide-react";

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
    setResult(null);
    try {
      const r = await extract(mixture, enrollment);
      setResult(r);
      setStatus("idle");
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
            <div className="p-4 h-14 flex items-center">
              <h2 className="font-mono-heading font-black text-[20px] uppercase tracking-[0.2em] opacity-90">Inputs</h2>
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
                  className="h-full"
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
                  className="h-full"
                />
              </div>
            </div>

            <div className="p-4 h-32 flex items-start overflow-hidden">
              <TipsCard />
            </div>
          </section>

          {/* ENGINE COLUMN - The focal point matching inspo.png */}
          <section className="bg-[var(--bg-center)] p-0 flex flex-col h-full overflow-hidden">
             <EngineCenter
                canExtract={!!canRun}
                status={status}
                onExtract={run}
              />
          </section>

          {/* OUTPUTS COLUMN */}
          <section className="flex flex-col h-full overflow-hidden bg-[var(--bg-app)]">
            <div className="p-4 h-14 flex items-center">
              <h2 className="font-mono-heading font-black text-[20px] uppercase tracking-[0.2em] opacity-90">Outputs</h2>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex-1 min-h-0">
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
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-h-0">
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
                  className="h-full"
                />
              </div>
            </div>

            <div className="p-4 h-32 flex items-start overflow-hidden">
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

        <footer className="px-6 py-2 border-t border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]">
           <span className="text-[11px] font-mono font-bold tracking-tight opacity-70">VANTA v1.0.0</span>
           <div className="flex items-center gap-2 opacity-80">
              <div className={`h-2 w-2 rounded-full ${backend === "online" ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]"}`} />
              <span className="text-[11px] font-bold tracking-tight">{backend === "online" ? "Ready" : "Offline"}</span>
           </div>
        </footer>
    </div>
  );
}
