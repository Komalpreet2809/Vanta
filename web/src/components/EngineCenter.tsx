"use client";

import { motion } from "motion/react";

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
          {/* Dashed Outer Circle */}
          <circle cx="400" cy="220" r="160" fill="none" stroke="#222222" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

          {/* Junction Points on the dashed circle */}
          <circle cx="240" cy="220" r="5" fill="#222222" />
          <circle cx="560" cy="220" r="5" fill="#222222" />

          {/* Bracket Arms meeting at junctions (240, 220) and (560, 220) */}
          
          {/* Reference Arm (Top Left to Junction) */}
          <path
            d="M 0 110 Q 240 110 240 220"
            fill="none"
            stroke="#222222"
            strokeWidth="1.2"
            opacity="0.6"
          />
          {/* Noise Arm (Bottom Left to Junction) */}
          <path
            d="M 0 330 Q 240 330 240 220"
            fill="none"
            stroke="#222222"
            strokeWidth="1.2"
            opacity="0.6"
          />
          {/* Clean Voice Arm (Junction to Top Right) */}
          <path
            d="M 560 220 Q 560 110 800 110"
            fill="none"
            stroke="#222222"
            strokeWidth="1.2"
            opacity="0.6"
          />
          {/* Residue Arm (Junction to Bottom Right) */}
          <path
            d="M 560 220 Q 560 330 800 330"
            fill="none"
            stroke="#222222"
            strokeWidth="1.2"
            opacity="0.6"
          />

          {/* Junction to Orb connectors */}
          <path d="M 240 220 L 300 220" stroke="#222222" strokeWidth="1.2" opacity="0.4" />
          <path d="M 560 220 L 500 220" stroke="#222222" strokeWidth="1.2" opacity="0.4" />

          {/* Node Indicators at the edges with Labels */}
          {/* Reference */}
          <g transform="translate(0, 110)">
            <circle r="7" fill="#DCD9D0" stroke="#222222" strokeWidth="1.2" />
            <circle r="3.5" fill="#4A6B4A" />
            <text x="5" y="-15" className="text-[12px] font-bold fill-[#1a1a1a]">Reference</text>
          </g>
          {/* Noise */}
          <g transform="translate(0, 330)">
            <circle r="7" fill="#DCD9D0" stroke="#222222" strokeWidth="1.2" />
            <circle r="3.5" fill="#B54545" />
            <text x="5" y="25" className="text-[12px] font-bold fill-[#1a1a1a]">Noise</text>
          </g>
          {/* Clean Voice */}
          <g transform="translate(800, 110)">
            <circle r="7" fill="#DCD9D0" stroke="#222222" strokeWidth="1.2" />
            <circle r="3.5" fill="#4A6B4A" />
            <text x="-75" y="-15" className="text-[12px] font-bold fill-[#1a1a1a]">Clean Voice</text>
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(800, 330)">
            <circle r="7" fill="#DCD9D0" stroke="#222222" strokeWidth="1.2" />
            <circle r="3.5" fill="#745296" />
            <text x="-95" y="25" className="text-[12px] font-bold fill-[#1a1a1a]">Residue (Noise)</text>
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



