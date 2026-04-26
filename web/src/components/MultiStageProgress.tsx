"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

type Stage = "decoding" | "extracting" | "matching" | "encoding";

const STAGES: { id: Stage; label: string; percent: number }[] = [
  { id: "decoding", label: "Decoding Audio Sources", percent: 25 },
  { id: "extracting", label: "Neural Voice Extraction", percent: 60 },
  { id: "matching", label: "Speaker Identity Matching", percent: 85 },
  { id: "encoding", label: "Re-encoding Output", percent: 100 },
];

export function MultiStageProgress({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGES.findIndex((s) => s.id === currentStage);
  const currentPercent = STAGES[currentIdx]?.percent ?? 0;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-widest text-[var(--text-soft)] uppercase">
        <span>Processing Pipeline</span>
        <span>{currentPercent}%</span>
      </div>

      {/* Progress Bar Container */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-input)] border border-[var(--border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${currentPercent}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full bg-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]"
        />
      </div>

      {/* Stage Labels */}
      <div className="grid grid-cols-4 gap-2">
        {STAGES.map((stage, idx) => (
          <div key={stage.id} className="flex flex-col gap-1">
            <div
              className={`h-1 rounded-full transition-colors duration-300 ${
                idx <= currentIdx ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
            <span
              className={`text-[9px] font-mono uppercase tracking-tighter transition-colors duration-300 ${
                idx <= currentIdx ? "text-[var(--text)]" : "text-[var(--text-dim)]"
              }`}
            >
              {stage.id}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 py-2 px-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse">
        <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
        <span className="text-[12px] font-mono text-[var(--text-soft)]">
          {STAGES[currentIdx]?.label}...
        </span>
      </div>
    </div>
  );
}
