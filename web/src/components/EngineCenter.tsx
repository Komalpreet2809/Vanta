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
      <div className="relative w-full h-[300px] mb-2">
        <svg viewBox="0 0 500 300" className="w-full h-full">
          {/* Signal Paths - Curved and Industrial */}
          {/* Reference Path */}
          <path
            d="M 60 100 L 110 100 Q 120 100 120 110 L 120 140 Q 120 150 130 150 L 150 150"
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
            d="M 60 200 L 110 200 Q 120 200 120 190 L 120 160 Q 120 150 130 150 L 150 150"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="60" cy="200" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="200" r="3" fill="var(--c-red)" />
          <text x="50" y="225" className="text-[11px] font-bold fill-[var(--text-main)]">Noisy Audio</text>

          {/* Clean Path */}
          <path
            d="M 350 150 L 370 150 Q 380 150 380 140 L 380 110 Q 380 100 390 100 L 440 100"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          <circle cx="440" cy="100" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="100" r="3" fill={hasOutput ? "var(--c-green)" : "var(--border-main)"} />
          <text x="415" y="85" className="text-[11px] font-bold fill-[var(--text-main)]">Clean</text>

          {/* Residue Path */}
          <path
            d="M 350 150 L 370 150 Q 380 150 380 160 L 380 190 Q 380 200 390 200 L 440 200"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          <circle cx="440" cy="200" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="200" r="3" fill={hasOutput ? "var(--c-purple)" : "var(--border-main)"} />
          <text x="415" y="225" className="text-[11px] font-bold fill-[var(--text-main)]">Residue</text>

          {/* Right Join Node */}
          <circle cx="350" cy="150" r="4" fill="var(--border-main)" />
          
          {/* Dashed outer ring */}
          <circle cx="250" cy="150" r="80" fill="none" stroke="var(--border-dashed)" strokeWidth="1" strokeDasharray="3 3" />
        </svg>

        {/* Central Orb - Restoring the beautiful multi-ring look */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`relative h-[120px] w-[120px] rounded-full border-[1.5px] border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-center)] transition-all duration-700 ${canExtract && !isRunning ? 'border-[var(--c-green)] shadow-[0_0_20px_rgba(74,107,74,0.1)]' : ''}`}>
            {isRunning && (
               <div className="absolute inset-0 rounded-full border-2 border-[var(--c-green)] border-t-transparent animate-spin opacity-30" />
            )}
            
            <div className={`h-[100px] w-[100px] rounded-full border-[1.5px] border-[var(--border-main)] flex flex-col items-center justify-center bg-[var(--bg-center)] transition-all duration-700 ${isRunning ? 'border-[var(--c-green)]' : ''}`}>
               <div className={`h-16 w-16 rounded-full transition-all duration-1000 flex items-center justify-center ${isRunning ? 'bg-[var(--c-dark-green)] scale-110 shadow-[0_0_20px_rgba(74,107,74,0.3)]' : 'bg-[#1E1E1E]'}`}>
                 <div className="h-8 w-8 overflow-hidden rounded-full flex items-center justify-center">
                    <div className={`w-full h-1 bg-white/20 rounded-full transition-all duration-500 ${isRunning ? 'animate-pulse scale-y-150' : ''}`} />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button - Pill shaped with icon */}
      <button
        onClick={onExtract}
        disabled={!canExtract || isRunning}
        className={`group flex flex-col items-center justify-center py-4 px-10 rounded-full border-[1.5px] transition-all duration-500 min-w-[160px] ${
          canExtract && !isRunning
            ? "border-[var(--border-main)] bg-[var(--bg-center)] hover:border-[var(--c-green)] hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]" 
            : "border-[var(--border-main)] opacity-40 cursor-not-allowed"
        }`}
      >
        <span className="text-[11px] font-mono font-bold text-[var(--text-main)] uppercase mb-1">Extract Voice</span>
        <div className="h-4 w-4 flex items-center justify-center">
           <Play className={`h-4 w-4 fill-current ${canExtract && !isRunning ? 'text-[var(--text-main)] group-hover:text-[var(--c-green)]' : 'text-[var(--text-main)]'}`} />
        </div>
      </button>
    </div>
  );
}
