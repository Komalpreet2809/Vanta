"use client";

import { motion } from "motion/react";
import { Play } from "lucide-react";

type Props = {
  status: "idle" | "running" | "error";
  onExtract: () => void;
  canExtract: boolean;
};

export function AnalogEngine({ status, onExtract, canExtract }: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      <div className="relative w-full aspect-square flex items-center justify-center">
        {/* Signal Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
          {/* Reference Line (Top Left) */}
          <path
            d="M 20 120 C 80 120, 100 200, 150 200"
            fill="none"
            stroke="var(--text)"
            strokeWidth="1.5"
            className="opacity-60"
          />
          <circle cx="20" cy="120" r="5" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="2.5" />
          
          {/* Noise Line (Bottom Left) */}
          <path
            d="M 20 280 C 80 280, 100 200, 150 200"
            fill="none"
            stroke="var(--text)"
            strokeWidth="1.5"
            className="opacity-60"
          />
          <circle cx="20" cy="280" r="5" fill="var(--bg-page)" stroke="var(--accent-red)" strokeWidth="2.5" />

          {/* Clean Voice Out (Top Right) */}
          <path
            d="M 250 200 C 300 200, 320 120, 380 120"
            fill="none"
            stroke="var(--text)"
            strokeWidth="1.5"
            className="opacity-60"
          />
          <circle cx="380" cy="120" r="5" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="2.5" />

          {/* Residue Out (Bottom Right) */}
          <path
            d="M 250 200 C 300 200, 320 280, 380 280"
            fill="none"
            stroke="var(--text)"
            strokeWidth="1.5"
            className="opacity-60"
          />
          <circle cx="380" cy="280" r="5" fill="var(--bg-page)" stroke="var(--accent-purple)" strokeWidth="2.5" />
          
          {/* Inner Nodes */}
          <circle cx="150" cy="200" r="4" fill="var(--text)" />
          <circle cx="250" cy="200" r="4" fill="var(--text)" />

          {/* Dashed outer ring */}
          <circle cx="200" cy="200" r="95" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" className="opacity-40" />
        </svg>

        {/* Labels */}
        <div className="absolute left-0 top-[90px] text-[11px] font-bold uppercase tracking-tight">Reference</div>
        <div className="absolute left-0 top-[295px] text-[11px] font-bold uppercase tracking-tight">Noise</div>
        <div className="absolute right-0 top-[90px] text-[11px] font-bold uppercase tracking-tight">Clean Voice</div>
        <div className="absolute right-0 top-[295px] text-[11px] font-bold uppercase tracking-tight">Residue (Noise)</div>

        {/* Central Core Circle (The Button is now INSIDE) */}
        <motion.button
          disabled={!canExtract || isRunning}
          onClick={onExtract}
          whileHover={canExtract ? { scale: 1.02 } : {}}
          whileTap={canExtract ? { scale: 0.98 } : {}}
          className={`relative z-10 w-56 h-56 rounded-full border-[6px] border-[var(--border-strong)] bg-[#2c2c2c] flex flex-col items-center justify-center shadow-xl transition-all ${
            isRunning ? "border-[var(--accent-green)]" : "border-[var(--border-strong)]"
          } disabled:opacity-80 group cursor-pointer`}
        >
           {/* Logo inside circle */}
           <div className="flex items-end gap-1 mb-3">
            {[0.4, 0.7, 1, 0.6, 0.3].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 16, h * 32, h * 16] } : { height: h * 20 }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                className="w-1.5 rounded-full bg-white"
              />
            ))}
          </div>
          <span className="text-[12px] font-bold text-white tracking-[0.4em] uppercase mb-4">Extract Voice</span>
          
          <div className="h-10 w-10 flex items-center justify-center">
            {isRunning ? (
               <div className="h-2 w-10 flex gap-1 items-center justify-center">
                  <div className="h-full w-1 bg-white animate-pulse" />
                  <div className="h-full w-1 bg-white animate-pulse [animation-delay:0.2s]" />
                  <div className="h-full w-1 bg-white animate-pulse [animation-delay:0.4s]" />
               </div>
            ) : (
               <Play className="h-8 w-8 text-white fill-current" />
            )}
          </div>

          {/* Radial Progress (Visual only for now) */}
          {isRunning && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
               <motion.circle
                 cx="112" cy="112" r="106"
                 fill="none"
                 stroke="var(--accent-green)"
                 strokeWidth="4"
                 strokeDasharray="665"
                 initial={{ strokeDashoffset: 665 }}
                 animate={{ strokeDashoffset: 0 }}
                 transition={{ duration: 5, repeat: Infinity }}
               />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Status Bar */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
           <div className={`h-3 w-3 rounded-full ${isRunning ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-green)]"}`} />
           <span className="text-[13px] font-bold uppercase tracking-widest">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[11px] text-[var(--text-soft)] uppercase tracking-wider">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
