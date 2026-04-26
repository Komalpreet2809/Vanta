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
    <div className="flex flex-col items-center justify-center w-full h-full max-w-6xl mx-auto px-4">
      {/* SVG Diagram Container - Ultra-wide layout to accommodate 260px circle */}
      <div className="relative w-full aspect-[3/1] flex items-center justify-center">
        {/* The Signal Diagram SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet">
          {/* Faint Outer Ring */}
          <circle cx="600" cy="200" r="240" fill="none" stroke="var(--border-main)" strokeWidth="1" strokeDasharray="4 4" opacity="0.1" />
          
          {/* LEFT SIGNAL ARM - Pushed to the absolute extremes */}
          <g>
            {/* Junction Dot at x=100 (Center is 600, Circle radius is 130) */}
            <circle cx="100" cy="200" r="6" fill="var(--text-main)" />
            
            {/* Curved Arms pointing to Input Column */}
            <path
              d="M 20 80 Q 100 80 100 120 L 100 170 Q 100 200 100 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="2"
            />
            <path
              d="M 20 320 Q 100 320 100 280 L 100 230 Q 100 200 100 200"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="2"
            />
            {/* Long Join Line to the Hero Circle (Edge at 600 - 130 = 470) */}
            <path d="M 100 200 L 460 200" stroke="var(--border-main)" strokeWidth="2" />
          </g>

          {/* RIGHT SIGNAL ARM - Pushed to the absolute extremes */}
          <g>
            {/* Junction Dot at x=1100 */}
            <circle cx="1100" cy="200" r="6" fill="var(--text-main)" />
            
            {/* Curved Arms pointing to Output Column */}
            <path
              d="M 1100 200 Q 1100 200 1100 170 L 1100 120 Q 1100 80 1180 80"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="2"
            />
            <path
              d="M 1100 200 Q 1100 200 1100 230 L 1100 280 Q 1100 320 1180 320"
              fill="none"
              stroke="var(--border-main)"
              strokeWidth="2"
            />
            {/* Long Join Line from the Hero Circle (Edge at 600 + 130 = 730) */}
            <path d="M 740 200 L 1100 200" stroke="var(--border-main)" strokeWidth="2" />
          </g>

          {/* End-point Dots */}
          {/* Reference */}
          <circle cx="20" cy="80" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="2" />
          <circle cx="20" cy="80" r="5" fill="#4A6B4A" />
          <text x="5" y="55" className="text-[16px] font-black fill-[var(--text-main)]">Reference</text>
          
          {/* Noise */}
          <circle cx="20" cy="320" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="2" />
          <circle cx="20" cy="320" r="5" fill="#B54545" />
          <text x="5" y="350" className="text-[16px] font-black fill-[var(--text-main)]">Noise</text>

          {/* Clean Voice */}
          <circle cx="1180" cy="80" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="2" />
          <circle cx="1180" cy="80" r="5" fill="#4A6B4A" />
          <text x="1100" y="55" className="text-[16px] font-black fill-[var(--text-main)]">Clean Voice</text>

          {/* Residue */}
          <circle cx="1180" cy="320" r="10" fill="var(--bg-app)" stroke="var(--border-main)" strokeWidth="2" />
          <circle cx="1180" cy="320" r="5" fill="#745296" />
          <text x="1060" y="350" className="text-[16px] font-black fill-[var(--text-main)]">Residue (Noise)</text>
        </svg>

        {/* Central Hero Circle - Exactly as requested */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            className={`group relative h-[260px] w-[260px] rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-[#222222] border-[6px] border-[#333333] shadow-[0_0_60px_rgba(0,0,0,0.3)] overflow-hidden disabled:opacity-90 active:scale-95`}
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
