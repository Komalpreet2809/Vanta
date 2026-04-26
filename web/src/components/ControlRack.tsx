"use client";

import { motion } from "motion/react";
import { Knob } from "./Knob";
import { WaveformRow } from "./WaveformRow";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  onExtract: () => void;
  message: string;
  focus: number;
  noiseSuppression: number;
  voiceClarity: number;
  outputBlob: Blob | null;
  qualityScore: number;
  onDownloadExtracted?: () => void;
  onDownloadResidue?: () => void;
};

export function ControlRack({
  canExtract,
  status,
  onExtract,
  focus,
  noiseSuppression,
  voiceClarity,
  outputBlob,
}: Props) {
  const tuning = status === "running";

  return (
    <div className="bg-[var(--bg-panel)] rounded border border-[var(--border-color)] px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-10">
      {/* EXTRACT VOICE button */}
      <motion.button
        type="button"
        disabled={!canExtract && status !== "running"}
        onClick={onExtract}
        whileHover={canExtract ? { scale: 1.02 } : {}}
        whileTap={canExtract ? { scale: 0.98 } : {}}
        className="flex w-full md:w-[260px] h-[100px] shrink-0 items-center justify-center gap-6 rounded bg-[var(--gold)] text-[var(--bg-main)] px-4 disabled:opacity-50 transition-all shadow-[0_4px_16px_var(--gold-dim)]"
      >
        <span className="font-mono text-[16px] font-bold tracking-[0.15em] whitespace-nowrap">
          {status === "running" ? "TUNING" : "EXTRACT VOICE"}
        </span>
        <span className="font-mono text-[20px] whitespace-nowrap">→</span>
      </motion.button>

      {/* Three knobs */}
      <div className="flex flex-1 items-center justify-around gap-4 px-4 border-l border-r border-[var(--border-color)]">
        <Knob label="FOCUS" value={focus} tuning={tuning} />
        <Knob label="NOISE SUPPRESSION" value={noiseSuppression} tuning={tuning} />
        <Knob label="VOICE CLARITY" value={voiceClarity} tuning={tuning} />
      </div>

      {/* OUTPUT PREVIEW */}
      <div className="flex w-full md:w-[280px] shrink-0 flex-col gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-dim)]">
          OUTPUT PREVIEW
        </span>
        <div className="bg-[var(--bg-panel-dark)] rounded border border-[var(--border-color)] px-4 py-3">
          {outputBlob ? (
            <WaveformRow source={outputBlob} label="" compact />
          ) : (
            <div className="flex h-[36px] items-center justify-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                — AWAITING EXTRACTION —
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
