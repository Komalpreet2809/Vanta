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
    <div className="flex flex-col items-center">
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Signal Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
          {/* Reference Line */}
          <path
            d="M 40 100 Q 80 100 120 160"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          <circle cx="40" cy="100" r="4" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="2" />
          
          {/* Noise Line */}
          <path
            d="M 40 220 Q 80 220 120 160"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          <circle cx="40" cy="220" r="4" fill="var(--bg-page)" stroke="var(--accent-red)" strokeWidth="2" />

          {/* Clean Voice Out */}
          <path
            d="M 200 160 Q 240 100 280 100"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          <circle cx="280" cy="100" r="4" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="2" />

          {/* Residue Out */}
          <path
            d="M 200 160 Q 240 220 280 220"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          <circle cx="280" cy="220" r="4" fill="var(--bg-page)" stroke="var(--accent-purple)" strokeWidth="2" />
          
          {/* Processing Nodes */}
          <circle cx="120" cy="160" r="3" fill="var(--text)" />
          <circle cx="200" cy="160" r="3" fill="var(--text)" />
        </svg>

        {/* Labels */}
        <div className="absolute left-2 top-[80px] text-[10px] font-bold uppercase">Reference</div>
        <div className="absolute left-2 top-[225px] text-[10px] font-bold uppercase">Noise</div>
        <div className="absolute right-2 top-[80px] text-[10px] font-bold uppercase">Clean Voice</div>
        <div className="absolute right-2 top-[225px] text-[10px] font-bold uppercase">Residue (Noise)</div>

        {/* Central Core */}
        <div className="relative z-10 w-44 h-44 rounded-full border-[3px] border-[var(--text)] bg-[var(--bg-card)] flex flex-col items-center justify-center shadow-md">
           <div className="flex items-end gap-1 mb-2">
            {[0.4, 0.7, 1, 0.6, 0.3].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 12, h * 24, h * 12] } : { height: h * 16 }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 rounded-full bg-[var(--text)]"
              />
            ))}
          </div>
          <span className="text-[16px] font-bold tracking-[0.2em] uppercase">Vanta</span>
          
          {/* Animated Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
             <motion.circle
               cx="88" cy="88" r="82"
               fill="none"
               stroke="var(--accent-green)"
               strokeWidth="6"
               strokeDasharray="515"
               initial={{ strokeDashoffset: 515 }}
               animate={isRunning ? { strokeDashoffset: [515, 0] } : { strokeDashoffset: 515 }}
               transition={{ duration: 3, repeat: Infinity }}
               className="opacity-40"
             />
          </svg>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex items-center gap-2">
           <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-green)] opacity-50"}`} />
           <span className="text-[12px] font-bold uppercase tracking-wider">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[11px] text-[var(--text-soft)]">{isRunning ? "Isolating target voice..." : "Engine is idle."}</span>
      </div>

      {/* Action Button */}
      <button
        disabled={!canExtract || isRunning}
        onClick={onExtract}
        className="industrial-button w-full max-w-[280px] py-4 flex items-center justify-center gap-3 bg-[var(--text)] text-[var(--bg-page)] hover:bg-[#333] transition-all disabled:opacity-30"
      >
        <Play className="h-5 w-5 fill-current" />
        <span className="text-[14px] font-bold uppercase tracking-widest">Extract Voice</span>
      </button>

      {/* Mode Selector */}
      <div className="mt-10 w-full max-w-[280px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-[1px] flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">Mode</span>
          <div className="h-[1px] flex-1 bg-[var(--border)]" />
        </div>
        <div className="inset-panel px-4 py-3 flex items-center justify-between text-[12px] cursor-pointer hover:bg-[var(--bg-hover)]">
           <span>High Quality (Recommended)</span>
           <svg className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
           </svg>
        </div>
      </div>
    </div>
  );
}
