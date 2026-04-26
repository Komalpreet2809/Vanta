"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioCard } from "./AudioCard";
import { EngineCenter } from "./EngineCenter";
import { Header } from "./Header";
import { TipsCard } from "./TipsCard";
import { extract, health, type ExtractMeta } from "../lib/api";
import { Download, Info } from "lucide-react";

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

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-app)] overflow-hidden">
        <Header />

        <main className="flex-1 grid grid-cols-[1fr_1.3fr_1fr] divide-x divide-[var(--border-main)] overflow-hidden">
          {/* INPUTS COLUMN */}
          <section className="p-4 flex flex-col overflow-y-auto">
            <div className="mb-8">
              <h2 className="font-mono-heading font-black text-lg uppercase mb-1">Inputs</h2>
              <p className="text-[13px] text-[var(--text-main)]">Provide reference and noise audio.</p>
            </div>

            <div className="flex flex-col gap-6">
              <AudioCard
                heading="Reference Audio"
                source={enrollment}
                variant="brown"
                onClear={() => setEnrollment(null)}
                onFile={(f) => setEnrollment(f)}
                emptyLabel="No reference audio loaded"
              />

              <AudioCard
                heading="Noise Audio"
                source={mixture}
                variant="red"
                onClear={() => setMixture(null)}
                onFile={(f) => setMixture(f)}
                emptyLabel="No noisy recording loaded"
              />

              <TipsCard />
            </div>
          </section>

          {/* ENGINE COLUMN */}
          <section className="bg-[var(--bg-center)] p-4 flex flex-col overflow-hidden">
            <div className="text-center mb-6">
              <h2 className="font-mono-heading font-black text-lg uppercase mb-1">Vanta Engine</h2>
              <p className="text-[13px] text-[var(--text-main)]">Isolates the target voice from noise.</p>
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

          {/* OUTPUTS COLUMN */}
          <section className="p-4 flex flex-col overflow-y-auto">
            <div className="mb-8">
              <h2 className="font-mono-heading font-black text-lg uppercase mb-1">Outputs</h2>
              <p className="text-[13px] text-[var(--text-main)]">Clean voice and residue (noise).</p>
            </div>

            <div className="flex flex-col gap-6 flex-1">
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
              />

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
              />

              <div className="card-border p-3 flex items-start gap-3 bg-[var(--bg-app)]">
                 <Info className="h-4 w-4 stroke-[1.5] text-[var(--text-main)] shrink-0 mt-0.5" />
                 <p className="text-[12px] text-[var(--text-main)] leading-relaxed">
                   Your outputs will be available here<br />once processing is complete.
                 </p>
              </div>

            </div>
          </section>
        </main>

        <footer className="px-6 py-1.5 border-t border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]">
           <span className="text-[10px] font-mono font-semibold tracking-wide">VANTA v1.0.0</span>
           <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${backend === "online" ? "bg-[var(--c-green)]" : "bg-[var(--c-red)]"}`} />
              <span className="text-[10px] font-semibold">{backend === "online" ? "Ready" : "Offline"}</span>
           </div>
        </footer>
    </div>
  );
}
