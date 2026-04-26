"use client";

import { motion } from "motion/react";
import { Play } from "lucide-react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  hasReference: boolean;
  hasNoise: boolean;
  hasOutput: boolean;
  onExtract: () => void;
};

export function EngineCenter({
  canExtract,
  status,
  hasReference,
  hasNoise,
  hasOutput,
  onExtract,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto px-4">
      <div className="relative w-full aspect-square flex items-center justify-center">
        {/* Signal Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 400 400">
          {/* Reference Line (Top Left) */}
          <path
            d="M 50 110 C 120 110, 140 200, 175 200"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="50" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="35" y="95" className="text-[11px] font-bold fill-[var(--text)] uppercase">Reference</text>
          
          {/* Noise Line (Bottom Left) */}
          <path
            d="M 50 290 C 120 290, 140 200, 175 200"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="50" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-red)" strokeWidth="3" />
          <text x="35" y="315" className="text-[11px] font-bold fill-[var(--text)] uppercase">Noise</text>

          {/* Clean Voice Out (Top Right) */}
          <path
            d="M 225 200 C 260 200, 280 110, 350 110"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="350" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="325" y="95" className="text-[11px] font-bold fill-[var(--text)] uppercase">Clean Voice</text>

          {/* Residue Out (Bottom Right) */}
          <path
            d="M 225 200 C 260 200, 280 290, 350 290"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="350" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-purple)" strokeWidth="3" />
          <text x="310" y="315" className="text-[11px] font-bold fill-[var(--text)] uppercase">Residue (Noise)</text>
          
          {/* Intersection Nodes */}
          <circle cx="175" cy="200" r="4.5" fill="#222" />
          <circle cx="225" cy="200" r="4.5" fill="#222" />

          {/* Dashed outer ring */}
          <circle cx="200" cy="200" r="115" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 5" className="opacity-60" />
        </svg>

        {/* Central Core Circle - BIG ORB */}
        <motion.button
          disabled={!canExtract || isRunning}
          onClick={onExtract}
          whileHover={canExtract ? { scale: 1.01 } : {}}
          whileTap={canExtract ? { scale: 0.99 } : {}}
          className={`relative z-10 w-64 h-64 rounded-full border-[8px] border-[var(--border-strong)] bg-[#2a2a2a] flex flex-col items-center justify-center shadow-2xl transition-all ${
            isRunning ? "border-[var(--c-green)]" : "border-[var(--border-strong)]"
          } disabled:opacity-90 group cursor-pointer`}
        >
           {/* Concept 1: Signal Flow V Logo inside */}
           <svg className="h-16 w-16 text-white mb-4" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M4 24h6l6-16 8 32 8-20 4 8h8" />
             <path d="M14 16l8 16 8-16" className="opacity-30" />
           </svg>

          <span className="text-[14px] font-bold text-white tracking-[0.4em] uppercase mb-5">Extract Voice</span>
          
          <div className="h-12 w-12 flex items-center justify-center">
            {isRunning ? (
               <div className="flex gap-1.5 items-center justify-center h-4">
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-white" />
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-white" />
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 bg-white" />
               </div>
            ) : (
               <Play className="h-10 w-10 text-white fill-current translate-x-0.5" />
            )}
          </div>

          {/* High-fidelity Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
             <motion.circle
               cx="128" cy="128" r="120"
               fill="none"
               stroke="var(--c-green)"
               strokeWidth="5"
               strokeDasharray="754"
               initial={{ strokeDashoffset: 754 }}
               animate={isRunning ? { strokeDashoffset: 0 } : { strokeDashoffset: 754 }}
               transition={{ duration: 5, ease: "linear", repeat: Infinity }}
             />
          </svg>
        </motion.button>
      </div>

      {/* Status Bar */}
      <div className="mt-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
           <div className={`h-3.5 w-3.5 rounded-full ${isRunning ? "bg-[var(--c-green)] animate-pulse" : "bg-[var(--c-green)]"}`} />
           <span className="text-[15px] font-bold uppercase tracking-[0.2em]">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[12px] text-[var(--text-soft)] uppercase tracking-widest opacity-60">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
