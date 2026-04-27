"use client";

import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  progress: number;
  stage: string;
  onExtract: () => void;
  id?: string;
};

const STAGES = [
  { id: "analyze", label: "ANALYZE", desc: "Detecting audio patterns" },
  { id: "separate", label: "SEPARATE", desc: "Isolating voice from noise" },
  { id: "enhance", label: "ENHANCE", desc: "Improving clarity and quality" },
  { id: "reconstruct", label: "RECONSTRUCT", desc: "Building clean voice output" },
];

export function EngineCenter({
  canExtract,
  status,
  progress,
  stage,
  onExtract,
  id,
}: Props) {
  const isRunning = status === "running";
  
  // Calculate which stage we are in based on progress (0-100)
  // analyze: 0-25, separate: 25-50, enhance: 50-75, reconstruct: 75-100
  const activeStageIndex = isRunning ? Math.floor((progress / 100) * STAGES.length) : -1;

  return (
    <div id={id} className="flex flex-col items-center justify-between w-full h-full py-8">
      {/* AI Voice Extraction Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-4 mb-1">
            <div className="h-[1px] w-8 bg-[var(--border-main)]" />
            <h2 className="font-mono-heading text-[12px] opacity-80">AI Voice Extraction</h2>
            <div className="h-[1px] w-8 bg-[var(--border-main)]" />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] font-medium">Advanced isolation technology</p>
      </div>

      <div className="relative flex-1 w-full flex items-center justify-center overflow-visible">
        {/* SVG Flow Container */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            {/* Input Paths (Left to Center) */}
            <g opacity="0.6">
                {/* Reference Path */}
                <path d="M 50 150 C 150 150, 300 300, 400 300" fill="none" stroke="var(--c-node-brown)" strokeWidth="1" strokeDasharray="4 4" />
                {/* Noise Path */}
                <path d="M 50 450 C 150 450, 300 300, 400 300" fill="none" stroke="var(--c-node-red)" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Flow particles if running */}
                {isRunning && (
                    <>
                        <motion.circle r="2" fill="var(--c-node-brown)"
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            style={{ offsetPath: "path('M 50 150 C 150 150, 300 300, 400 300')" }}
                        />
                        <motion.circle r="2" fill="var(--c-node-red)"
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.5 }}
                            style={{ offsetPath: "path('M 50 450 C 150 450, 300 300, 400 300')" }}
                        />
                    </>
                )}
            </g>

            {/* Output Paths (Center to Right) */}
            <g opacity="0.6">
                 {/* Clean Voice Path */}
                 <path d="M 400 300 C 500 300, 650 150, 750 150" fill="none" stroke="var(--c-node-green)" strokeWidth="1" strokeDasharray="4 4" />
                 {/* Residue Path */}
                 <path d="M 400 300 C 500 300, 650 450, 750 450" fill="none" stroke="var(--c-node-purple)" strokeWidth="1" strokeDasharray="4 4" />

                 {/* Flow particles if running */}
                 {isRunning && progress > 50 && (
                    <>
                        <motion.circle r="2" fill="var(--c-node-green)"
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            style={{ offsetPath: "path('M 400 300 C 500 300, 650 150, 750 150')" }}
                        />
                        <motion.circle r="2" fill="var(--c-node-purple)"
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.5 }}
                            style={{ offsetPath: "path('M 400 300 C 500 300, 650 450, 750 450')" }}
                        />
                    </>
                )}
            </g>

            {/* Central Vertical Path */}
            <path d="M 400 100 L 400 500" fill="none" stroke="var(--border-main)" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Nodes Column */}
        <div className="relative flex flex-col items-center justify-between h-[400px] z-10">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center group">
              <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                {/* Node Circle */}
                <motion.div 
                    animate={i === activeStageIndex ? { scale: [1, 1.2, 1], boxShadow: "0 0 20px var(--text-main)" } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-[var(--bg-app)] transition-all duration-500 ${
                        i <= activeStageIndex ? 'border-[var(--text-main)] shadow-md' : 'border-[var(--border-main)] opacity-40'
                    }`}
                >
                    {/* Node Icon/Placeholder */}
                    <div className={`w-2 h-2 rounded-full ${i <= activeStageIndex ? 'bg-[var(--text-main)]' : 'bg-[var(--border-main)]'}`} />
                </motion.div>

                {/* Node Text - Positioned to the right */}
                <div className="absolute left-16 w-40 flex flex-col">
                    <span className={`text-[11px] font-bold tracking-widest transition-opacity duration-500 ${i <= activeStageIndex ? 'opacity-100' : 'opacity-30'}`}>
                        {s.label}
                    </span>
                    <span className={`text-[9px] text-[var(--text-muted)] font-medium leading-tight transition-opacity duration-500 ${i <= activeStageIndex ? 'opacity-100' : 'opacity-0'}`}>
                        {s.desc}
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="w-full max-w-[400px] mt-8">
        <motion.button
            disabled={!canExtract || isRunning}
            onClick={onExtract}
            className={`w-full py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                isRunning 
                ? 'bg-[var(--bg-card)] border-[var(--border-main)] shadow-inner' 
                : canExtract 
                    ? 'bg-[var(--bg-card)] border-[var(--text-main)] shadow-md hover:scale-[1.02]' 
                    : 'bg-transparent border-[var(--border-main)] opacity-50'
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Waveform Icon */}
                <div className="flex items-end gap-0.5 h-4">
                    {[0.4, 1.0, 0.6, 0.8, 0.4].map((h, i) => (
                        <motion.div
                            key={i}
                            animate={isRunning ? { height: ["20%", "100%", "20%"] } : { height: `${h * 100}%` }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                            className="w-[2px] bg-[var(--text-main)] rounded-full"
                        />
                    ))}
                </div>
                <span className="font-mono-heading text-[12px] font-black">
                    {isRunning ? "PROCESSING IN REAL-TIME" : "READY TO PROCESS"}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[var(--c-node-green)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
            </div>
            
            {isRunning ? (
                <div className="text-[10px] text-[var(--text-muted)] font-medium">
                    {stage} • {Math.round(progress)}%
                </div>
            ) : (
                <div className="text-[10px] text-[var(--text-muted)] font-medium">
                    Upload your audio files to begin voice extraction.
                </div>
            )}
        </motion.button>
      </div>
    </div>
  );
}
