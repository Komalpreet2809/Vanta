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
    <div className="flex flex-col items-center justify-center w-full h-full max-w-lg mx-auto">
      {/* SVG Diagram Container */}
      <div className="relative w-full h-[300px] mb-4">
        <svg viewBox="0 0 500 300" className="w-full h-full">
          {/* Signal paths simplified */}
          <path d="M 60 80 L 250 150" stroke="var(--border-main)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
          <path d="M 60 220 L 250 150" stroke="var(--border-main)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
          <path d="M 250 150 L 440 80" stroke="var(--border-main)" strokeWidth="1.5" fill="none" />
          <path d="M 250 150 L 440 220" stroke="var(--border-main)" strokeWidth="1.5" fill="none" />
          
          {/* Dots */}
          <circle cx="60" cy="80" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="80" r="3" fill="var(--c-brown)" />
          <text x="50" y="65" className="text-[11px] font-bold fill-[var(--text-main)]">Reference</text>

          <circle cx="60" cy="220" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="220" r="3" fill="var(--c-red)" />
          <text x="50" y="245" className="text-[11px] font-bold fill-[var(--text-main)]">Noisy Audio</text>

          <circle cx="440" cy="80" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="80" r="3" fill={hasOutput ? "var(--c-green)" : "var(--border-main)"} />
          <text x="415" y="65" className="text-[11px] font-bold fill-[var(--text-main)]">Clean</text>

          <circle cx="440" cy="220" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="220" r="3" fill={hasOutput ? "var(--c-purple)" : "var(--border-main)"} />
          <text x="415" y="245" className="text-[11px] font-bold fill-[var(--text-main)]">Residue</text>
        </svg>

        {/* Central Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`relative h-[120px] w-[120px] rounded-full border-[1.5px] border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-center)] transition-all duration-700 ${canExtract && !isRunning ? 'border-[var(--c-green)] shadow-[0_0_20px_rgba(74,107,74,0.1)]' : ''}`}>
             <div className={`h-[100px] w-[100px] rounded-full border-[1.5px] border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-center)] transition-all duration-700 ${isRunning ? 'border-[var(--c-green)]' : ''}`}>
               <div className={`h-16 w-16 rounded-full transition-all duration-1000 flex items-center justify-center ${isRunning ? 'bg-[var(--c-dark-green)]' : 'bg-[#1E1E1E]'}`}>
                 <div className="h-8 w-8 rounded-full bg-white/10" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onExtract}
        disabled={!canExtract || isRunning}
        className={`group flex flex-col items-center justify-center py-4 px-8 rounded-full border-[1.5px] transition-all duration-500 min-w-[140px] ${
          canExtract && !isRunning
            ? "border-[var(--c-green)] bg-[var(--bg-center)] hover:shadow-[0_0_20px_rgba(74,107,74,0.2)]" 
            : "border-[var(--border-main)] opacity-50 cursor-not-allowed"
        }`}
      >
        <span className="text-[11px] font-mono font-bold text-[var(--text-main)] uppercase mb-1">Extract Voice</span>
        <Play className={`h-4 w-4 fill-current ${canExtract && !isRunning ? 'text-[var(--c-green)]' : 'text-[var(--text-main)]'}`} />
      </button>
    </div>
  );
}
