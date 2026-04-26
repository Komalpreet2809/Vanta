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
            d="M 50 110 C 130 110, 150 200, 175 200"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-70"
          />
          <circle cx="50" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="35" y="92" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tighter">Reference</text>
          
          {/* Noise Line (Bottom Left) */}
          <path
            d="M 50 290 C 130 290, 150 200, 175 200"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-70"
          />
          <circle cx="50" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-red)" strokeWidth="3" />
          <text x="35" y="318" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tighter">Noise</text>

          {/* Clean Voice Out (Top Right) */}
          <path
            d="M 225 200 C 250 200, 270 110, 350 110"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-70"
          />
          <circle cx="350" cy="110" r="6" fill="var(--bg-page)" stroke="var(--c-green)" strokeWidth="3" />
          <text x="325" y="92" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tighter">Clean Voice</text>

          {/* Residue Out (Bottom Right) */}
          <path
            d="M 225 200 C 250 200, 270 290, 350 290"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-70"
          />
          <circle cx="350" cy="290" r="6" fill="var(--bg-page)" stroke="var(--c-purple)" strokeWidth="3" />
          <text x="310" y="318" className="text-[11px] font-bold fill-[var(--text)] uppercase tracking-tighter">Residue (Noise)</text>
          
          {/* Intersection Nodes */}
          <circle cx="175" cy="200" r="5" fill="#1a1a1a" />
          <circle cx="225" cy="200" r="5" fill="#1a1a1a" />

          {/* Dashed outer ring */}
          <circle cx="200" cy="200" r="115" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 5" className="opacity-40" />
        </svg>

        {/* Central Core Circle - BIG ORB with Glow */}
        <motion.button
          disabled={!canExtract || isRunning}
          onClick={onExtract}
          whileHover={canExtract ? { scale: 1.01 } : {}}
          whileTap={canExtract ? { scale: 0.99 } : {}}
          className={`relative z-10 w-64 h-64 rounded-full border-[7px] border-[var(--border-strong)] bg-[#2a2a2a] flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all ${
            isRunning ? "border-[var(--c-green)]" : "border-[var(--border-strong)]"
          } disabled:opacity-90 group cursor-pointer`}
        >
           {/* Inspo-matching Waveform Logo */}
           <div className="flex items-end gap-[3px] mb-5 h-10">
            {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.3].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 20, h * 40, h * 20] } : { height: h * 28 }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
                className="w-1.5 rounded-full bg-white opacity-90"
              />
            ))}
          </div>

          <span className="text-[14px] font-bold text-white tracking-[0.45em] uppercase mb-5">Extract Voice</span>
          
          <div className="h-10 w-10 flex items-center justify-center">
            {isRunning ? (
               <div className="flex gap-1.5 items-center justify-center h-4">
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1.5 bg-white" />
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1.5 bg-white" />
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1.5 bg-white" />
               </div>
            ) : (
               <Play className="h-10 w-10 text-white fill-current translate-x-0.5 opacity-90" />
            )}
          </div>

          {/* High-fidelity Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
             <motion.circle
               cx="128" cy="128" r="121"
               fill="none"
               stroke="var(--c-green)"
               strokeWidth="4"
               strokeDasharray="760"
               initial={{ strokeDashoffset: 760 }}
               animate={isRunning ? { strokeDashoffset: 0 } : { strokeDashoffset: 760 }}
               transition={{ duration: 5, ease: "linear", repeat: Infinity }}
             />
          </svg>
        </motion.button>
      </div>

      {/* Status Indicator */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
           <div className={`h-3 w-3 rounded-full ${isRunning ? "bg-[var(--c-green)] animate-pulse shadow-[0_0_10px_var(--c-green)]" : "bg-[var(--c-green)] shadow-[0_0_8px_var(--c-green)]"}`} />
           <span className="text-[16px] font-bold uppercase tracking-[0.2em]">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[12px] text-[var(--text-soft)] uppercase tracking-[0.15em] font-bold opacity-60">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
