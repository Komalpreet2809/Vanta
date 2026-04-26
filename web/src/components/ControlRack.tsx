"use client";

import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  onExtract: () => void;
};

export function ControlRack({
  canExtract,
  status,
  onExtract,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-6">
      <motion.button
        type="button"
        disabled={!canExtract && !isRunning}
        onClick={onExtract}
        whileHover={canExtract ? { y: -1 } : {}}
        whileTap={canExtract ? { y: 1 } : {}}
        className="group flex items-center gap-3 rounded-xl bg-[var(--accent-deep)] hover:bg-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3.5 text-[15px] font-bold text-[#06140b] transition-all shadow-[0_0_24px_rgba(74,222,128,0.18)] hover:shadow-[0_0_32px_rgba(74,222,128,0.3)] uppercase tracking-wider"
      >
        {isRunning ? (
          <span>Extracting Voice…</span>
        ) : (
          <span>Extract Voice</span>
        )}
      </motion.button>
    </div>
  );
}
