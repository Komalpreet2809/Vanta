"use client";

import { motion } from "motion/react";
import { Knob } from "./Knob";
import { WaveformRow } from "./WaveformRow";

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
  return (
    <div className="flex justify-center mt-4">
      <motion.button
        type="button"
        disabled={!canExtract && status !== "running"}
        onClick={onExtract}
        whileHover={canExtract ? { scale: 1.02 } : {}}
        whileTap={canExtract ? { scale: 0.98 } : {}}
        className="flex w-[240px] h-[70px] shrink-0 items-center justify-center gap-4 rounded-md bg-[var(--gold)] text-[var(--bg-main)] px-4 disabled:opacity-50 transition-all"
      >
        <span className="font-mono text-[15px] font-bold tracking-[0.1em] whitespace-nowrap">
          {status === "running" ? "TUNING..." : "EXTRACT VOICE"}
        </span>
        <span className="font-mono text-[18px] whitespace-nowrap">→</span>
      </motion.button>
    </div>
  );
}
