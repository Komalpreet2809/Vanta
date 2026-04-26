"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DescriptionCard } from "./DescriptionCard";
import { FileUploadSlot } from "./FileUploadSlot";
import { WaveformRow } from "./WaveformRow";
import { ControlRack } from "./ControlRack";
import { health, extract, type ExtractMeta } from "../lib/api";

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
  const [refPlaying, setRefPlaying] = useState(false);
  const [mixPlaying, setMixPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    health().then((h) => {
      // Intentionally ignoring backend status for the UI to match reference exactly,
      // which has no engine status indicator.
      if (cancelled) return;
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
      setMessage(`extracted in ${ms} ms`);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [mixture, enrollment]);

  const { focus, noiseSuppression, voiceClarity, qualityScore } = useMemo(() => {
    if (!result) {
      return { focus: 0.5, noiseSuppression: 0.7, voiceClarity: 0.8, qualityScore: 0.82 };
    }
    const sims = (result.meta.similarities?.[0] ?? []) as number[];
    if (!sims.length) {
      return { focus: 0.5, noiseSuppression: 0.5, voiceClarity: 0.5, qualityScore: 0.5 };
    }
    const sorted = [...sims].sort((a, b) => b - a);
    const top = sorted[0];
    const second = sorted[1] ?? 0;
    const focus = clamp01(top);
    const voiceClarity = clamp01((top - second) * 2);
    const noiseSuppression = clamp01(1 - second);
    const qualityScore = clamp01(0.4 * focus + 0.6 * voiceClarity);
    return { focus, noiseSuppression, voiceClarity, qualityScore };
  }, [result]);

  const download = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 pb-24 px-8 font-mono selection:bg-[var(--gold)] selection:text-[var(--bg-main)]">
      <main className="max-w-[1200px] mx-auto flex flex-col gap-6">
        {/* Header: title + particle wave */}
        <DescriptionCard />

        {/* Upload slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <FileUploadSlot
            slot="01"
            label="REFERENCE VOICE"
            file={enrollment}
            onFile={setEnrollment}
            defaultFilename="Audio1.mp4"
            defaultSize="46.2 KB"
          />
          <FileUploadSlot
            slot="02"
            label="NOISY RECORDING"
            file={mixture}
            onFile={setMixture}
            defaultFilename="Audio3.mp4"
            defaultSize="57.3 KB"
          />
        </div>

        {/* Waveform panels */}
        <div className="bg-[var(--bg-panel)] rounded border border-[var(--border-color)] px-6 py-4 flex flex-col gap-6">
          <WaveformRow
            label="REFERENCE"
            source={enrollment}
            onPlayingChange={setRefPlaying}
          />
          <div className="h-[1px] w-full bg-[var(--border-color)]" />
          <WaveformRow
            label="INPUT MIXTURE"
            source={mixture}
            onPlayingChange={setMixPlaying}
          />
        </div>

        {/* Control rack */}
        <ControlRack
          canExtract={!!canRun}
          status={status}
          onExtract={run}
          focus={focus}
          noiseSuppression={noiseSuppression}
          voiceClarity={voiceClarity}
          outputBlob={result?.extracted ?? null}
          qualityScore={qualityScore}
        />
      </main>
    </div>
  );
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
