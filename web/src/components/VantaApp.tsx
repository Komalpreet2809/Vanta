"use client";

import { Cpu, History as HistoryIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ControlRack } from "./ControlRack";
import { FileUploadSlot } from "./FileUploadSlot";
import type { Quality } from "./QualityDropdown";
import { WaveformRow } from "./WaveformRow";
import { MultiStageProgress } from "./MultiStageProgress";
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
  const [quality, setQuality] = useState<Quality>("high");
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
      
      // We start extraction early but pace the UI updates
      const extractPromise = extract(mixture, enrollment);
      
      // Phase 1: Decoding (simulated 800ms)
      await new Promise(r => setTimeout(r, 800));
      setStage("extracting");
      
      // Phase 2: Extraction (simulated 1.5s)
      await new Promise(r => setTimeout(r, 1500));
      setStage("matching");
      
      // Phase 3: Matching
      const r = await extractPromise;
      
      // Phase 4: Encoding (simulated 600ms)
      setStage("encoding");
      await new Promise(r => setTimeout(r, 600));

      const ms = Math.round(performance.now() - t0);
      setResult(r);
      
      // Add to history
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        filename: mixture.name,
        result: r
      };
      setHistory(prev => [newItem, ...prev]);
      
      setMessage(`Extracted in ${ms} ms`);
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
      ? "CUDA Acceleration"
      : backend === "online"
        ? `${device?.toUpperCase() ?? "CPU"} Engine`
        : backend === "offline"
          ? "Backend Offline"
          : "Connecting…";

  return (
    <main className="mx-auto w-full max-w-[920px] px-6 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-[var(--ok)] uppercase">
                Vanta
              </span>
              <div className="h-[1px] w-8 bg-[var(--ok)] opacity-30" />
            </div>
            <h1 className="text-[32px] font-bold text-[var(--text)] leading-tight tracking-tight">
              Voice Isolation Engine
            </h1>
            <p className="text-[14px] text-[var(--text-soft)] mt-2 leading-relaxed opacity-80">
              Isolate any target speaker from complex noisy environments with high-fidelity neural extraction.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusPill backend={backend} label={accelerationLabel} />
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-[12px] font-bold text-[var(--text-soft)] hover:bg-[var(--bg-card)] hover:text-[var(--text)] transition-all"
            >
              <HistoryIcon className="h-4 w-4" />
              HISTORY
              {history.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-[var(--bg-main)]">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Upload slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploadSlot
            slot="01"
            label="Reference Voice"
            file={enrollment}
            onFile={setEnrollment}
          />
          <FileUploadSlot
            slot="02"
            label="Noisy Recording"
            file={mixture}
            onFile={setMixture}
          />
        </div>

        {/* Input waveforms */}
        {(enrollment || mixture) && (
          <div className="mt-4 flex flex-col gap-3">
            {enrollment && (
              <WaveformRow
                label="Reference Voice"
                source={enrollment}
                variant="accent"
              />
            )}
            {mixture && (
              <WaveformRow
                label="Input Mixture"
                source={mixture}
                variant="neutral"
              />
            )}
          </div>
        )}

        {/* Controls / Progress */}
        <div className="mt-4">
          {status === "running" ? (
            <MultiStageProgress currentStage={stage} />
          ) : (
            <ControlRack
              canExtract={!!canRun}
              status={status}
              onExtract={run}
              quality={quality}
              onQualityChange={setQuality}
            />
          )}
        </div>

        {/* Output */}
        {result && (
          <div className="mt-6 pt-6 border-t border-[var(--border)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-soft)] font-medium">
                Output
              </span>
              <span className="text-[12px] text-[var(--text-dim)]">
                {result.meta.outputSeconds.toFixed(2)}s · {result.meta.sampleRate} Hz
              </span>
            </div>
            <WaveformRow
              label="Extracted Voice"
              source={result.extracted}
              variant="accent"
              onDownload={() => download(result.extracted, "vanta_extracted.wav")}
            />
            <WaveformRow
              label="Residue (what was removed)"
              source={result.residue}
              variant="neutral"
              onDownload={() => download(result.residue, "vanta_residue.wav")}
            />
          </div>
        )}

        {/* Status message */}
        {message && (
          <p
            className={`mt-4 text-[12px] ${
              status === "error" ? "text-[var(--err)]" : "text-[var(--text-dim)]"
            }`}
          >
            {message}
          </p>
        )}
      </div>

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
    </main>
  );
}

function StatusPill({
  backend,
  label,
}: {
  backend: "checking" | "online" | "offline";
  label: string;
}) {
  const dotColor =
    backend === "online"
      ? "bg-[var(--ok)]"
      : backend === "offline"
        ? "bg-[var(--err)]"
        : "bg-[var(--text-dim)]";

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 shrink-0">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inset-0 rounded-full ${dotColor} ${
            backend === "online" ? "pulse-dot" : ""
          }`}
        />
      </span>
      <Cpu className="h-3.5 w-3.5 text-[var(--text-soft)]" />
      <span className="text-[12px] text-[var(--text-soft)] whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
