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
        {/* Signal Lines (SVG) - Refined S-Curves */}
        <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 400 400">
          {/* Reference Line (Top Left) - Cubic S-Curve */}
          <path
            d="M 50 110 C 140 110, 100 200, 175 200"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            className="opacity-80"
          />
          <circle cx="50" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="35" y="92" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tight">Reference</text>
          
          {/* Noise Line (Bottom Left) - Cubic S-Curve */}
          <path
            d="M 50 290 C 140 290, 100 200, 175 200"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            className="opacity-80"
          />
          <circle cx="50" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-red)" strokeWidth="3" />
          <text x="35" y="318" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tight">Noise</text>

          {/* Clean Voice Out (Top Right) - Cubic S-Curve */}
          <path
            d="M 225 200 C 300 200, 260 110, 350 110"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            className="opacity-80"
          />
          <circle cx="350" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="325" y="92" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tight">Clean Voice</text>

          {/* Residue Out (Bottom Right) - Cubic S-Curve */}
          <path
            d="M 225 200 C 300 200, 260 290, 350 290"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            className="opacity-80"
          />
          <circle cx="350" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-purple)" strokeWidth="3" />
          <text x="310" y="318" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tight">Residue (Noise)</text>
          
          {/* Intersection Nodes */}
          <circle cx="175" cy="200" r="4" fill="#1a1a1a" />
          <circle cx="225" cy="200" r="4" fill="#1a1a1a" />

          {/* Dashed outer ring */}
          <circle cx="200" cy="200" r="115" fill="none" stroke="#9a988d" strokeWidth="0.8" strokeDasharray="4 6" className="opacity-60" />
        </svg>

        {/* Central Core Circle - LARGE ORB with Deep Soft Shadow */}
        <motion.button
          disabled={!canExtract || isRunning}
          onClick={onExtract}
          whileHover={canExtract ? { scale: 1.01 } : {}}
          whileTap={canExtract ? { scale: 0.99 } : {}}
          className={`relative z-10 w-64 h-64 rounded-full border-[8px] border-[var(--border-strong)] bg-[#2a2a2a] flex flex-col items-center justify-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all ${
            isRunning ? "border-[var(--c-green)]" : "border-[var(--border-strong)]"
          } disabled:opacity-90 group cursor-pointer`}
        >
           {/* Inspo-matching Waveform Logo */}
           <div className="flex items-end gap-[3px] mb-6 h-10">
            {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.3].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 24, h * 44, h * 24] } : { height: h * 30 }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                className="w-1.5 rounded-full bg-white opacity-95"
              />
            ))}
          </div>

          <span className="text-[15px] font-bold text-white tracking-[0.5em] uppercase mb-6">Extract Voice</span>
          
          <div className="h-10 w-10 flex items-center justify-center">
            {isRunning ? (
               <div className="flex gap-1.5 items-center justify-center h-5">
                  <motion.div animate={{ height: [4, 20, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1.5 bg-white" />
                  <motion.div animate={{ height: [4, 20, 4] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }} className="w-1.5 bg-white" />
                  <motion.div animate={{ height: [4, 20, 4] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }} className="w-1.5 bg-white" />
               </div>
            ) : (
               <Play className="h-10 w-10 text-white fill-current translate-x-0.5 opacity-95" />
            )}
          </div>

          {/* High-fidelity Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
             <motion.circle
               cx="128" cy="128" r="121"
               fill="none"
               stroke="var(--c-green)"
               strokeWidth="5"
               strokeDasharray="760"
               initial={{ strokeDashoffset: 760 }}
               animate={isRunning ? { strokeDashoffset: 0 } : { strokeDashoffset: 760 }}
               transition={{ duration: 5, ease: "linear", repeat: Infinity }}
             />
          </svg>
        </motion.button>
      </div>

      {/* Status Indicator */}
      <div className="mt-14 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
           <div className={`h-3 w-3 rounded-full ${isRunning ? "bg-[var(--c-green)] animate-pulse shadow-[0_0_12px_var(--c-green)]" : "bg-[var(--c-green)] shadow-[0_0_10px_var(--c-green)]"}`} />
           <span className="text-[18px] font-bold uppercase tracking-[0.3em]">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[13px] text-[var(--text-soft)] uppercase tracking-[0.2em] font-bold opacity-50">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
