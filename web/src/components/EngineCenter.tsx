"use client";

import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  onExtract: () => void;
};

export function EngineCenter({
  canExtract,
  status,
  onExtract,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Header Text - Matches inspo.png exactly */}
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold tracking-[0.2em] text-[#1a1a1a] uppercase mb-2">
          Vanta Engine
        </h1>
        <p className="text-[14px] text-[#444444] font-medium tracking-wide">
          Isolates the target voice from noise.
        </p>
      </div>

      {/* SVG Diagram Container - Set to take full width and a fixed aspect for consistency */}
      <div className="relative w-full aspect-[1.5/1] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 440" preserveAspectRatio="xMidYMid meet">
          
          {/* LEFT CURLY BRACE { - Floating with gaps at both ends */}
          <g>
            {/* Top Curve - Starts at 70 (Gap from node at 30), Ends at 210 (Gap from orb) */}
            <path
              d="M 70 110 C 150 110, 150 220, 210 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
              opacity="0.8"
            />
            {/* Bottom Curve */}
            <path
              d="M 70 330 C 150 330, 150 220, 210 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
              opacity="0.8"
            />
          </g>

          {/* RIGHT CURLY BRACE } - Floating with gaps at both ends */}
          <g>
            {/* Top Curve - Starts at 730 (Gap from node at 770), Ends at 590 (Gap from orb) */}
            <path
              d="M 730 110 C 650 110, 650 220, 590 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
              opacity="0.8"
            />
            {/* Bottom Curve */}
            <path
              d="M 730 330 C 650 330, 650 220, 590 220"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="1.5"
              opacity="0.8"
            />
          </g>

          {/* Node Indicators (Aligned with brace ends at x=70 and x=730) */}
          {/* Reference */}
          <g transform="translate(70, 110)">
            <circle r="6" fill="var(--bg-card)" className="shadow-sm" />
            <circle r="3" fill="var(--c-green)" />
            <text x="10" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">REFERENCE</text>
          </g>
          {/* Noise */}
          <g transform="translate(70, 330)">
            <circle r="6" fill="var(--bg-card)" className="shadow-sm" />
            <circle r="3" fill="var(--c-red)" />
            <text x="10" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">NOISE</text>
          </g>
          {/* Clean Voice */}
          <g transform="translate(730, 110)">
            <circle r="6" fill="var(--bg-card)" className="shadow-sm" />
            <circle r="3" fill="var(--c-green)" />
            <text x="-70" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">CLEAN VOICE</text>
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(730, 330)">
            <circle r="6" fill="var(--bg-card)" className="shadow-sm" />
            <circle r="3" fill="var(--c-purple)" />
            <text x="-95" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">RESIDUE (NOISE)</text>
          </g>
        </svg>

        {/* Central Hero Circle - Redesigned for Reference Image */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[320px] w-[320px] rounded-full border-[10px] border-[#D9D7CE] shadow-lg flex items-center justify-center bg-[#EFEDE6]">
            {/* Dark Progress Ring Segment */}
            <div className="absolute inset-[-10px] rounded-full border-[10px] border-transparent border-t-[#6B7B5B] rotate-[45deg]" />
            
            <motion.button
              disabled={!canExtract || isRunning}
              onClick={onExtract}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative h-[260px] w-[260px] rounded-full bg-[var(--bg-card)] shadow-inner flex flex-col items-center justify-center"
            >
              {/* Waveform Icon (Green bars in reference) */}
              <div className="flex items-center gap-[4px] h-10 mb-4">
                {[0.4, 0.7, 1.0, 0.8, 0.5, 0.8, 1.0, 0.7, 0.4].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={isRunning ? { height: ["40%", "100%", "40%"] } : { height: `${h * 100}%` }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                    className="w-[4px] rounded-full bg-[#6B7B5B]"
                  />
                ))}
              </div>

              {/* Main Text */}
              <span className="text-[20px] font-bold text-[#333330] uppercase tracking-[0.1em] mb-4">
                Extract Voice
              </span>
              
              {/* Play Button Icon (Small triangle) */}
              <div className="mt-2">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="#333330">
                   <path d="M8 5v14l11-7z" />
                 </svg>
              </div>
            </motion.button>
          </div>
          
          {/* Subtle Glow behind the orb */}
          <div className="absolute -inset-10 bg-[#6B7B5B]/5 rounded-full blur-3xl -z-10" />
        </div>
      </div>

      {/* Status indicator - Matches reference exactly */}
      <div className="mt-12 flex flex-col items-center gap-1">
         <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-amber-500 animate-pulse' : 'bg-[#C4C1B8]'}`} />
            <span className="text-[14px] font-bold uppercase tracking-widest text-[#333330] opacity-80">
              {isRunning ? 'Processing' : 'Idle'}
            </span>
         </div>
         <p className="text-[12px] font-medium text-[#888880] tracking-tight">
           {isRunning ? 'Engine is active.' : 'Engine is ready.'}
         </p>
      </div>
    </div>
  );
}











