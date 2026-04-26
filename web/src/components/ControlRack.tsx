"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { QualityDropdown, type Quality } from "./QualityDropdown";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  onExtract: () => void;
  quality: Quality;
  onQualityChange: (q: Quality) => void;
};

export function ControlRack({
  canExtract,
  status,
  onExtract,
  quality,
  onQualityChange,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
      <QualityDropdown value={quality} onChange={onQualityChange} />

      <motion.button
        type="button"
        disabled={!canExtract && !isRunning}
        onClick={onExtract}
        whileHover={canExtract ? { y: -1 } : {}}
        whileTap={canExtract ? { y: 1 } : {}}
        className="group flex items-center gap-2 rounded-lg bg-[var(--accent-deep)] hover:bg-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-[14px] font-medium text-[#06140b] transition-colors shadow-[0_0_24px_rgba(74,222,128,0.18)]"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Extracting…</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Extract Voice</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
