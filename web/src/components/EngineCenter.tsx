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
    <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl mx-auto">
      {/* SVG Diagram Container */}
      <div className="relative w-[540px] h-[400px] flex items-center justify-center">
        {/* Signal Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 540 400">
          {/* Large Dashed Outer Circle */}
          <circle cx="270" cy="200" r="160" fill="none" stroke="var(--border-main)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          
          {/* Signal Paths - Curved into side junctions */}
          <g>
            {/* Left Junction Point */}
            <circle cx="180" cy="200" r="5" fill="var(--text-main)" />
            
            {/* Reference to Junction */}
            <path
              d="M 60 120 Q 150 120 150 160 L 150 180 Q 150 200 180 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
            {/* Noise to Junction */}
            <path
              d="M 60 280 Q 150 280 150 240 L 150 220 Q 150 200 180 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
          </g>

          <g>
            {/* Right Junction Point */}
            <circle cx="360" cy="200" r="5" fill="var(--text-main)" />
            
            {/* Junction to Clean */}
            <path
              d="M 360 200 Q 390 200 390 180 L 390 160 Q 390 120 480 120"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
            {/* Junction to Residue */}
            <path
              d="M 360 200 Q 390 200 390 220 L 390 240 Q 390 280 480 280"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="1.5"
            />
          </g>

          {/* Source/Sink Nodes */}
          {/* Reference */}
          <circle cx="60" cy="120" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="120" r="5" fill="#4A6B4A" />
          <text x="35" y="100" className="text-[12px] font-bold fill-[var(--text-main)]">Reference</text>
          
          {/* Noise */}
          <circle cx="60" cy="280" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="60" cy="280" r="5" fill="#B54545" />
          <text x="45" y="305" className="text-[12px] font-bold fill-[var(--text-main)]">Noise</text>

          {/* Clean Voice */}
          <circle cx="480" cy="120" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="480" cy="120" r="5" fill="#4A6B4A" />
          <text x="445" y="100" className="text-[12px] font-bold fill-[var(--text-main)]">Clean Voice</text>

          {/* Residue (Noise) */}
          <circle cx="480" cy="280" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="1.5" />
          <circle cx="480" cy="280" r="5" fill="#745296" />
          <text x="420" y="305" className="text-[12px] font-bold fill-[var(--text-main)]">Residue (Noise)</text>
        </svg>

        {/* Central Core Circle (THE HERO COMPONENT) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            className={`group relative h-[210px] w-[210px] rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-[#222222] border-[5px] border-[#333333] shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden disabled:opacity-90 active:scale-95`}
          >
            {/* Green Progress/Status Ring (Industrial heavy) */}
            <div className={`absolute inset-[-5px] rounded-full border-[5px] border-transparent border-t-[var(--c-green)] transition-all duration-1000 ${isRunning ? 'animate-spin' : 'opacity-40'}`} />
            
            {/* Inner Border Line */}
            <div className="absolute inset-[5px] rounded-full border-[1px] border-white/10" />

            {/* Waveform Logo (Exactly as inspo) */}
            <div className="flex items-center gap-[4px] h-12 mb-2">
              {[0.4, 0.6, 1.0, 0.7, 0.4].map((h, i) => (
                <div key={i} className={`w-[4px] rounded-sm bg-white transition-all duration-300 ${isRunning ? 'animate-pulse' : ''}`} style={{ height: `${h * 100}%` }} />
              ))}
            </div>

            {/* Extract Voice Text (Bold Monospace) */}
            <span className="text-[18px] font-mono font-black text-white uppercase tracking-tighter mb-4 leading-none">Extract Voice</span>
            
            {/* Play Icon (Simple triangle) */}
            <div className="h-6 w-6 flex items-center justify-center">
               <Play className="h-6 w-6 text-white fill-current translate-x-0.5" />
            </div>
            
            {/* Radial glow when active */}
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,107,74,0.15)_0%,transparent_70%)] transition-opacity duration-700 ${isRunning ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
