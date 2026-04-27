"use client";

import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  progress: number;
  stage: string;
  onExtract: () => void;
};

export function EngineCenter({
  canExtract,
  status,
  progress,
  stage,
  onExtract,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Header Text - Matches inspo.png exactly */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <h1 className="font-mono-heading font-black text-[28px] uppercase tracking-wider text-[var(--c-green)]">
            VANTA ENGINE
          </h1>
          <p className="text-[12px] font-medium opacity-80 text-[#444444]">
            Isolates the target voice from noise.
          </p>
        </div>

      {/* SVG Diagram Container - Set to take full width and a fixed aspect for consistency */}
      <div className="relative w-full aspect-[1.5/1] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 440" preserveAspectRatio="xMidYMid meet">
          
          {/* LEFT CURLY BRACE { - Floating with gaps at both ends */}
          <motion.g animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.8 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
            {/* Top Curve - Starts at 70 (Gap from node at 30), Ends at 210 (Gap from orb) */}
            <path
              d="M 70 110 C 150 110, 150 220, 210 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
            />
            {/* Bottom Curve */}
            <path
              d="M 70 330 C 150 330, 150 220, 210 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
            />
          </motion.g>

          {/* RIGHT CURLY BRACE } - Floating with gaps at both ends */}
          <motion.g animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.8 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}>
            {/* Top Curve - Starts at 730 (Gap from node at 770), Ends at 590 (Gap from orb) */}
            <path
              d="M 730 110 C 650 110, 650 220, 590 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
            />
            {/* Bottom Curve */}
            <path
              d="M 730 330 C 650 330, 650 220, 590 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
            />
          </motion.g>

          {/* Node Indicators (Aligned with brace ends at x=70 and x=730) */}
          {/* Reference */}
          <g transform="translate(70, 110)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-green)" />
            <text x="10" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">REFERENCE</text>
          </g>
          {/* Noise */}
          <g transform="translate(70, 330)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-red)" />
            <text x="10" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">NOISE</text>
          </g>
          {/* Clean Voice */}
          <g transform="translate(730, 110)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-green)" />
            <text x="-70" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">CLEAN VOICE</text>
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(730, 330)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-purple)" />
            <text x="-95" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">RESIDUE (NOISE)</text>
          </g>
        </svg>

        {/* Central Hero Circle - Redesigned for Reference Image */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[320px] w-[320px] rounded-full border-[10px] border-[#D9D7CE] shadow-lg flex items-center justify-center bg-[#EFEDE6]">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-[-10px] w-[340px] h-[340px] -rotate-90 pointer-events-none">
              {isRunning && (
                <motion.circle
                  cx="170"
                  cy="170"
                  r="165"
                  fill="none"
                  stroke="var(--c-green)"
                  strokeWidth="10"
                  strokeDasharray={165 * 2 * Math.PI}
                  initial={{ strokeDashoffset: 165 * 2 * Math.PI }}
                  animate={{ strokeDashoffset: (165 * 2 * Math.PI) * (1 - Math.max(2, progress) / 100) }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              )}
            </svg>
            
            <motion.button
              disabled={!canExtract || isRunning}
              onClick={onExtract}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative h-[260px] w-[260px] rounded-full bg-[var(--bg-card)] border-[3px] border-[var(--text-main)] shadow-[6px_6px_0_var(--text-main)] flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--text-main)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]"
            >
              {/* Waveform Icon (Green bars in reference) */}
              <div className="flex items-center gap-[4px] h-10 mb-4">
                {[0.4, 0.7, 1.0, 0.8, 0.5, 0.8, 1.0, 0.7, 0.4].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={isRunning ? { height: ["40%", "100%", "40%"] } : { height: `${h * 100}%` }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                    className="w-[4px] rounded-full bg-[var(--c-green)]"
                  />
                ))}
              </div>

              {/* Main Text */}
              <div className="flex flex-col items-center mt-2 px-6">
                <span className={`font-bold text-[#333330] tracking-wider text-center ${isRunning ? 'text-[16px]' : 'text-[20px] uppercase mb-4'}`}>
                  {isRunning ? stage : "Extract Voice"}
                </span>
                
                {isRunning ? (
                  <span className="text-[24px] font-mono-heading font-black text-[var(--c-green)] mt-2">
                    {Math.round(progress)}%
                  </span>
                ) : (
                  <div className="mt-2">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="#333330">
                       <path d="M8 5v14l11-7z" />
                     </svg>
                  </div>
                )}
              </div>
            </motion.button>
          </div>
          
          {/* Subtle Glow behind the orb */}
          <div className="absolute -inset-10 bg-[var(--c-green)]/10 rounded-full blur-3xl -z-10" />
        </div>
      </div>


    </div>
  );
}











