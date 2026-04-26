"use client";

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
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      {/* SVG Diagram Container */}
      <div className="relative w-full h-[320px] mb-2 flex items-center justify-center">
        <svg viewBox="0 0 500 320" className="w-full h-full absolute inset-0">
          {/* Signal Paths - Curved and Industrial */}
          {/* Reference Path */}
          <path
            d="M 60 100 L 110 100 Q 120 100 120 110 L 120 150 Q 120 160 130 160 L 150 160"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="60" cy="100" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="100" r="3" fill="var(--c-brown)" />
          <text x="50" y="85" className="text-[11px] font-bold fill-[var(--text-main)]">Reference</text>
          
          {/* Noise Path */}
          <path
            d="M 60 220 L 110 220 Q 120 220 120 210 L 120 170 Q 120 160 130 160 L 150 160"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="60" cy="220" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="220" r="3" fill="var(--c-red)" />
          <text x="50" y="245" className="text-[11px] font-bold fill-[var(--text-main)]">Noisy Audio</text>

          {/* Clean Path */}
          <path
            d="M 350 160 L 370 160 Q 380 160 380 150 L 380 110 Q 380 100 390 100 L 440 100"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          <circle cx="440" cy="100" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="100" r="3" fill={hasOutput ? "var(--c-green)" : "var(--border-main)"} />
          <text x="415" y="85" className="text-[11px] font-bold fill-[var(--text-main)]">Clean</text>

          {/* Residue Path */}
          <path
            d="M 350 160 L 370 160 Q 380 160 380 170 L 380 210 Q 380 220 390 220 L 440 220"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          <circle cx="440" cy="220" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="220" r="3" fill={hasOutput ? "var(--c-purple)" : "var(--border-main)"} />
          <text x="415" y="245" className="text-[11px] font-bold fill-[var(--text-main)]">Residue</text>

          {/* Outer ring of the orb diagram */}
          <circle cx="250" cy="160" r="70" fill="none" stroke="var(--border-main)" strokeWidth="0.5" opacity="0.3" />
          <circle cx="250" cy="160" r="85" fill="none" stroke="var(--border-main)" strokeWidth="0.5" opacity="0.1" />
        </svg>

        {/* The Exact "Circular Thingy" from Inspo */}
        <div className="relative z-10">
          <div className={`relative h-[130px] w-[130px] rounded-full border-[1px] border-[#B0AE9F] bg-[#DFDDD5] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]`}>
            {/* Outer inner ring */}
            <div className="absolute h-[110px] w-[110px] rounded-full border-[1px] border-[#B8B6B0]" />
            
            {/* Inner Dark Core */}
            <div className={`h-[80px] w-[80px] rounded-full bg-[#1E1E1E] flex items-center justify-center border-[4px] border-[#2B3D2B] transition-all duration-700 ${isRunning ? 'shadow-[0_0_25px_rgba(74,107,74,0.4)] border-[var(--c-green)]' : 'border-[#333333]'}`}>
               {/* Center highlight / pulse */}
               <div className={`h-4 w-4 rounded-full bg-[#333333] transition-all duration-500 ${isRunning ? 'bg-[var(--c-green)] animate-pulse scale-125' : ''}`} />
            </div>

            {/* Gauge Ticks (Small dots around the core) */}
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-1 h-1 bg-[#B0AE9F] rounded-full"
                style={{ 
                  transform: `rotate(${i * 30}deg) translateY(-48px)` 
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Button - Pill shaped with icon */}
      <div className="relative z-20">
        <button
          onClick={onExtract}
          disabled={!canExtract || isRunning}
          className={`group flex flex-col items-center justify-center py-4 px-12 rounded-full border-[1px] border-[#B0AE9F] transition-all duration-500 min-w-[180px] ${
            canExtract && !isRunning
              ? "bg-[#DFDDD5] hover:border-[var(--text-main)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.05)]" 
              : "opacity-40 cursor-not-allowed bg-transparent"
          }`}
        >
          <span className="text-[11px] font-mono font-bold text-[var(--text-main)] uppercase mb-2 tracking-wider">Extract Voice</span>
          <div className="h-4 w-4 flex items-center justify-center">
             <Play className={`h-4 w-4 fill-current ${canExtract && !isRunning ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'}`} />
          </div>
        </button>
      </div>
    </div>
  );
}
