"use client";

import { motion } from "motion/react";

type Props = {
  label: string;
  value: number;
  tuning?: boolean;
};

export function Knob({ value, label, tuning }: Props) {
  const rotation = -135 + value * 270;

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="font-mono text-[11px] text-[var(--text-dim)] uppercase tracking-widest h-4">
        {label}
      </span>

      <div className="relative w-16 h-16 rounded-full flex items-center justify-center">
        {/* Tick marks around the dial */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 41 }).map((_, i) => {
            const angle = -135 + (i / 40) * 270;
            const isMajor = i % 10 === 0;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-bottom"
                style={{
                  height: "36px",
                  width: isMajor ? "2px" : "1px",
                  background: isMajor ? "var(--text-dim)" : "#333",
                  transform: `translate(-50%, -100%) rotate(${angle}deg)`,
                  marginTop: "4px"
                }}
              />
            );
          })}
        </div>

        {/* The dial itself */}
        <motion.div
          animate={{ rotate: tuning ? rotation + 360 : rotation }}
          transition={
            tuning
              ? { repeat: Infinity, duration: 2, ease: "linear" }
              : { type: "spring", stiffness: 200, damping: 20 }
          }
          className="relative w-11 h-11 rounded-full bg-[#111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),_0_1px_1px_rgba(255,255,255,0.05)] border border-[#222] flex items-center justify-center z-10"
        >
          {/* Indicator dot */}
          <div className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_4px_var(--gold)]" />
        </motion.div>
      </div>

      <span className="font-mono text-[11px] text-[var(--gold)] tracking-widest h-4">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
