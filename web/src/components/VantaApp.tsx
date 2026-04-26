"use client";

import { Cpu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ControlRack } from "./ControlRack";
import { FileUploadSlot } from "./FileUploadSlot";
import type { Quality } from "./QualityDropdown";
import { WaveformRow } from "./WaveformRow";
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
  const [quality, setQuality] = useState<Quality>("high");
  const [backend, setBackend] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [device, setDevice] = useState<string | undefined>();

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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-[var(--text)] leading-tight">
              Extract target speaker
            </h1>
            <p className="text-[13px] text-[var(--text-soft)] mt-1.5 leading-relaxed">
              Upload a 5-second reference clip of one voice and a messy recording —
              <br className="hidden sm:block" />
              the model isolates that voice and returns it without everything else.
            </p>
          </div>
          <StatusPill backend={backend} label={accelerationLabel} />
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

        {/* Controls */}
        <div className="mt-4">
          <ControlRack
            canExtract={!!canRun}
            status={status}
            onExtract={run}
            quality={quality}
            onQualityChange={setQuality}
          />
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
