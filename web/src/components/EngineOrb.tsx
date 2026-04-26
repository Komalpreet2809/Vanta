"use client";

import { motion } from "motion/react";

type Props = {
  status: "idle" | "running" | "error";
  stageLabel?: string;
};

export function EngineOrb({ status, stageLabel }: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex h-64 w-64 items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border border-dashed border-[var(--accent)]/20 ${
            isRunning ? "opacity-100" : "opacity-40"
          }`}
        />

        {/* Middle rotating ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-4 rounded-full border border-[var(--border-strong)] ${
            isRunning ? "border-[var(--accent)]/40 shadow-[0_0_20px_var(--accent-glow)]" : ""
          }`}
        />

        {/* Inner static ring with gradient */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#111] to-[#000] border border-[var(--border)] shadow-inner" />

        {/* The Core */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {/* Logo Icon (Bars) */}
          <div className="flex items-end gap-1 mb-1">
            {[0.4, 0.7, 1, 0.6, 0.3].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 16, h * 32, h * 16] } : { height: h * 24 }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 rounded-full bg-[var(--accent)]"
              />
            ))}
          </div>
          
          <span className="text-[18px] font-bold tracking-[0.4em] text-[var(--text)] uppercase ml-1.5">
            Vanta
          </span>
        </div>

        {/* Connection points (Visual only) */}
        <div className="absolute -left-12 top-1/2 h-[1px] w-12 bg-gradient-to-r from-transparent to-[var(--border-strong)]" />
        <div className="absolute -left-14 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--border-strong)]" />
        
        <div className="absolute -right-12 top-1/2 h-[1px] w-12 bg-gradient-to-l from-transparent to-[var(--border-strong)]" />
        <div className="absolute -right-14 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--border-strong)]" />
      </div>

      {/* Status Box */}
      <div className="mt-10 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center glass transition-all">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`h-2 w-2 rounded-full ${isRunning ? "bg-[var(--ok)] animate-pulse" : "bg-[var(--text-dim)]"}`} />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-soft)]">
            {isRunning ? "Processing" : "Engine Idle"}
          </span>
        </div>
        <div className="text-[13px] text-[var(--text-dim)] truncate px-2">
          {isRunning ? stageLabel : "VANTA Isolation Model"}
        </div>
      </div>
    </div>
  );
}
