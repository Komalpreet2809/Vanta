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
    <div className="flex flex-col items-center justify-center w-full h-full max-w-3xl mx-auto">
      {/* SVG Diagram Container */}
      <div className="relative w-full aspect-[2/1] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
          {/* Large Dashed Outer Circle - The anchor for the brackets */}
          <circle cx="400" cy="200" r="160" fill="none" stroke="var(--border-main)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          
          {/* LEFT SIGNAL BRACKET - Joining exactly on the dashed circle */}
          <g>
            {/* Junction Point on the dashed circle (400 - 160 = 240) */}
            <circle cx="240" cy="200" r="5" fill="var(--text-main)" />
            
            {/* Reference to Junction */}
            <path
              d="M 100 120 Q 240 120 240 160 L 240 180 Q 240 200 240 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
            {/* Noise to Junction */}
            <path
              d="M 100 280 Q 240 280 240 240 L 240 220 Q 240 200 240 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
          </g>

          {/* RIGHT SIGNAL BRACKET - Joining exactly on the dashed circle */}
          <g>
            {/* Junction Point on the dashed circle (400 + 160 = 560) */}
            <circle cx="560" cy="200" r="5" fill="var(--text-main)" />
            
            {/* Junction to Clean */}
            <path
              d="M 560 200 Q 560 200 560 180 L 560 160 Q 560 120 700 120"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
            {/* Junction to Residue */}
            <path
              d="M 560 200 Q 560 200 560 220 L 560 240 Q 560 280 700 280"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
          </g>

          {/* Source/Sink Nodes */}
          {/* Reference */}
          <circle cx="100" cy="120" r="8" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="100" cy="120" r="4" fill="#4A6B4A" />
          <text x="75" y="100" className="text-[12px] font-bold fill-[var(--text-main)]">Reference</text>
          
          {/* Noise */}
          <circle cx="100" cy="280" r="8" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="100" cy="280" r="4" fill="#B54545" />
          <text x="85" y="305" className="text-[12px] font-bold fill-[var(--text-main)]">Noise</text>

          {/* Clean Voice */}
          <circle cx="700" cy="120" r="8" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="700" cy="120" r="4" fill="#4A6B4A" />
          <text x="665" y="100" className="text-[12px] font-bold fill-[var(--text-main)]">Clean Voice</text>

          {/* Residue (Noise) */}
          <circle cx="700" cy="280" r="8" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="700" cy="280" r="4" fill="#745296" />
          <text x="640" y="305" className="text-[12px] font-bold fill-[var(--text-main)]">Residue (Noise)</text>
        </svg>

        {/* Central Hero Circle - Contained within the dashed outer ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            className={`group relative h-[240px] w-[240px] rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-[#222222] border-[6px] border-[#333333] shadow-[0_0_60px_rgba(0,0,0,0.3)] overflow-hidden disabled:opacity-90 active:scale-95`}
          >
            {/* Status Arc */}
            <div className={`absolute inset-[-6px] rounded-full border-[6px] border-transparent border-t-[var(--c-green)] transition-all duration-1000 ${isRunning ? 'animate-spin' : 'opacity-40'}`} />
            
            <div className="absolute inset-[6px] rounded-full border-[1px] border-white/10" />

            <div className="flex items-center gap-[5px] h-16 mb-4">
              {[0.4, 0.6, 1.0, 0.7, 0.4].map((h, i) => (
                <div key={i} className={`w-[5px] rounded-sm bg-white transition-all duration-300 ${isRunning ? 'animate-pulse' : ''}`} style={{ height: `${h * 100}%` }} />
              ))}
            </div>

            <span className="text-[22px] font-mono font-black text-white uppercase tracking-tighter mb-6 leading-none">Extract Voice</span>
            
            <div className="h-8 w-8 flex items-center justify-center">
               <Play className="h-8 w-8 text-white fill-current translate-x-0.5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
