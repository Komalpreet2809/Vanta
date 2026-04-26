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
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto py-8">
      {/* SVG Diagram Container */}
      <div className="relative w-[500px] h-[400px]">
        {/* Signal Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 400">
          {/* Reference Line */}
          <path
            d="M 60 120 L 110 120 Q 120 120 120 130 L 120 190 Q 120 200 130 200 L 150 200"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          {/* Reference Dot */}
          <circle cx="60" cy="120" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="120" r="3" fill="var(--c-green)" />
          <text x="50" y="105" className="text-xs font-bold fill-[var(--text-main)]">Reference</text>
          
          {/* Noise Line */}
          <path
            d="M 60 280 L 110 280 Q 120 280 120 270 L 120 210 Q 120 200 130 200 L 150 200"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          {/* Noise Dot */}
          <circle cx="60" cy="280" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="280" r="3" fill="var(--c-red)" />
          <text x="50" y="305" className="text-xs font-bold fill-[var(--text-main)]">Noise</text>

          {/* Left Join Node */}
          <circle cx="150" cy="200" r="5" fill="var(--border-main)" />
          <circle cx="150" cy="200" r="2.5" fill="var(--bg-app)" />

          {/* Clean Voice Line */}
          <path
            d="M 350 200 L 370 200 Q 380 200 380 190 L 380 130 Q 380 120 390 120 L 440 120"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          {/* Clean Voice Dot */}
          <circle cx="440" cy="120" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="120" r="3" fill="var(--c-green)" />
          <text x="410" y="105" className="text-xs font-bold fill-[var(--text-main)]">Clean Voice</text>

          {/* Residue Line */}
          <path
            d="M 350 200 L 370 200 Q 380 200 380 210 L 380 270 Q 380 280 390 280 L 440 280"
            fill="none"
            stroke="var(--border-main)"
            strokeWidth="1.5"
          />
          {/* Residue Dot */}
          <circle cx="440" cy="280" r="6" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="440" cy="280" r="3" fill="var(--c-purple)" />
          <text x="400" y="305" className="text-xs font-bold fill-[var(--text-main)]">Residue (Noise)</text>

          {/* Right Join Node */}
          <circle cx="350" cy="200" r="5" fill="var(--border-main)" />
          <circle cx="350" cy="200" r="2.5" fill="var(--bg-app)" />

          {/* Dashed outer ring */}
          <circle cx="250" cy="200" r="100" fill="none" stroke="var(--border-dashed)" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {/* Central Core Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] rounded-full border-4 border-[var(--bg-app)] flex items-center justify-center bg-[var(--c-dark-green)] shadow-sm">
          <button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            className="w-[140px] h-[140px] rounded-full border-[3px] border-[var(--bg-app)] bg-[var(--c-charcoal)] flex flex-col items-center justify-center disabled:opacity-90 transition-transform active:scale-95"
          >
             {/* Waveform Logo */}
             <div className="flex items-end gap-[3px] mb-3 h-6">
              {[0.4, 0.7, 1, 0.8, 0.5].map((h, i) => (
                <div key={i} className={`w-[2px] rounded-full bg-white transition-all ${isRunning ? 'animate-pulse' : ''}`} style={{ height: `${h * 100}%` }} />
              ))}
            </div>

            <span className="text-[11px] font-mono font-bold text-white tracking-widest uppercase mb-2">Extract Voice</span>
            
            <div className="h-6 w-6 flex items-center justify-center">
               <Play className="h-5 w-5 text-white fill-current translate-x-0.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex flex-col items-center gap-1 -mt-4">
        <div className="flex items-center gap-2">
           <div className={`h-3 w-3 rounded-full ${isRunning ? "bg-yellow-500" : "bg-[var(--c-green)]"}`} />
           <span className="text-base font-bold">{isRunning ? "Processing" : "Ready"}</span>
        </div>
        <span className="text-[13px] text-[var(--text-muted)]">{isRunning ? "Isolating signal streams..." : "Engine is idle."}</span>
      </div>
    </div>
  );
}
