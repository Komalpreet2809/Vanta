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
          <circle cx="50" cy="110" r="6" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="3" />
          <text x="35" y="95" className="text-[11px] font-bold fill-[var(--text)] uppercase">Reference</text>
          
          {/* Noise Line (Bottom Left) */}
          <path
            d="M 50 290 C 120 290, 140 200, 175 200"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="50" cy="290" r="6" fill="var(--bg-page)" stroke="var(--accent-red)" strokeWidth="3" />
          <text x="35" y="315" className="text-[11px] font-bold fill-[var(--text)] uppercase">Noise</text>

          {/* Clean Voice Out (Top Right) */}
          <path
            d="M 225 200 C 260 200, 280 110, 350 110"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="350" cy="110" r="6" fill="var(--bg-page)" stroke="var(--accent-green)" strokeWidth="3" />
          <text x="325" y="95" className="text-[11px] font-bold fill-[var(--text)] uppercase">Clean Voice</text>

          {/* Residue Out (Bottom Right) */}
          <path
            d="M 225 200 C 260 200, 280 290, 350 290"
            fill="none"
            stroke="#444"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <circle cx="350" cy="290" r="6" fill="var(--bg-page)" stroke="var(--accent-purple)" strokeWidth="3" />
          <text x="310" y="315" className="text-[11px] font-bold fill-[var(--text)] uppercase">Residue (Noise)</text>
          
          {/* Intersection Nodes */}
          <circle cx="175" cy="200" r="4.5" fill="#222" />
          <circle cx="225" cy="200" r="4.5" fill="#222" />

          {/* Dashed outer ring */}
          <circle cx="200" cy="200" r="115" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 5" className="opacity-60" />
        </svg>

        {/* Central Core Circle - MUCH BIGGER */}
        <motion.button
          disabled={!canExtract || isRunning}
          onClick={onExtract}
          whileHover={canExtract ? { scale: 1.01 } : {}}
          whileTap={canExtract ? { scale: 0.99 } : {}}
          className={`relative z-10 w-64 h-64 rounded-full border-[8px] border-[var(--border-strong)] bg-[#2a2a2a] flex flex-col items-center justify-center shadow-2xl transition-all ${
            isRunning ? "border-[var(--accent-green)]" : "border-[var(--border-strong)]"
          } disabled:opacity-90 group cursor-pointer`}
        >
           {/* Waveform Logo inside */}
           <div className="flex items-end gap-1.5 mb-5 h-8">
            {[0.4, 0.8, 1, 0.7, 0.3, 0.6, 0.9, 0.5].map((h, i) => (
              <motion.div
                key={i}
                animate={isRunning ? { height: [h * 24, h * 40, h * 24] } : { height: h * 28 }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                className="w-[3px] rounded-full bg-white"
              />
            ))}
          </div>

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
               stroke="var(--accent-green)"
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
           <div className={`h-3.5 w-3.5 rounded-full ${isRunning ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-green)]"}`} />
           <span className="text-[15px] font-bold uppercase tracking-[0.2em]">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[12px] text-[var(--text-soft)] uppercase tracking-widest opacity-60">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
