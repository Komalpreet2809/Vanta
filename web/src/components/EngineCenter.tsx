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
            <circle r="6" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="1.2" />
            <circle r="3" fill="var(--c-green)" />
            <text x="10" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">REFERENCE</text>
          </g>
          {/* Noise */}
          <g transform="translate(70, 330)">
            <circle r="6" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="1.2" />
            <circle r="3" fill="var(--c-red)" />
            <text x="10" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">NOISE</text>
          </g>
          {/* Clean Voice */}
          <g transform="translate(730, 110)">
            <circle r="6" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="1.2" />
            <circle r="3" fill="var(--c-green)" />
            <text x="-70" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">CLEAN VOICE</text>
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(730, 330)">
            <circle r="6" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="1.2" />
            <circle r="3" fill="var(--c-purple)" />
            <text x="-95" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">RESIDUE (NOISE)</text>
          </g>
        </svg>

        {/* Central Hero Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative h-[280px] w-[280px] rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-[#222222] border-[1px] border-[#444444] shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden disabled:opacity-90`}
          >
            {/* Outer Subtle Ring */}
            <div className="absolute inset-[8px] rounded-full border-[1px] border-white/5" />
            
            {/* Waveform Icon */}
            <div className="flex items-center gap-[6px] h-14 mb-5">
              {[0.4, 0.7, 1.0, 0.8, 0.5, 0.8, 1.0, 0.7, 0.4].map((h, i) => (
                <motion.div
                  key={i}
                  animate={isRunning ? { height: ["40%", "100%", "40%"] } : { height: `${h * 100}%` }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                  className="w-[5px] rounded-full bg-white"
                />
              ))}
            </div>

            {/* Main Text */}
            <span className="text-[24px] font-bold text-white uppercase tracking-[0.15em] mb-6 leading-none">
              Extract Voice
            </span>
            
            {/* Play Button Icon */}
            <div className="h-10 w-10 flex items-center justify-center">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                 <path d="M8 5v14l11-7z" />
               </svg>
            </div>

            {/* Running Status Indicator */}
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/30 flex items-center justify-center"
              >
                <div className="w-full h-full border-[6px] border-transparent border-t-white/40 rounded-full animate-spin" />
              </motion.div>
            )}
          </motion.button>
          
          {/* Subtle Glow behind the orb */}
          <div className="absolute -inset-10 bg-black/10 rounded-full blur-3xl -z-10" />
        </div>
      </div>

      {/* Status indicator below the diagram - inspired by the small "Ready" dot in the image */}
      <div className="mt-12 flex flex-col items-center gap-2">
         <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-amber-500 animate-pulse' : 'bg-[#4A6B4A]'}`} />
            <span className="text-[13px] font-bold uppercase tracking-widest text-[#1a1a1a]">
              {isRunning ? 'Processing...' : 'Ready'}
            </span>
         </div>
         <p className="text-[11px] font-medium text-[#666666] tracking-tight">
           {isRunning ? 'Engine is active.' : 'Engine is idle.'}
         </p>
      </div>
    </div>
  );
}











