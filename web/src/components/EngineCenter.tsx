"use client";

import { motion, AnimatePresence } from "motion/react";
import { Search, Scissors, Sparkles, AudioLines, Activity } from "lucide-react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  progress: number;
  stage: string;
  onExtract: () => void;
  id?: string;
};

const STAGES = [
  { id: "analyze", label: "ANALYZE", desc: "Detecting audio patterns", icon: Search },
  { id: "separate", label: "SEPARATE", desc: "Isolating voice from noise", icon: Scissors },
  { id: "enhance", label: "ENHANCE", desc: "Improving clarity and quality", icon: Sparkles },
  { id: "reconstruct", label: "RECONSTRUCT", desc: "Building clean voice output", icon: AudioLines },
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
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Input Paths (Left to Center) */}
            <g opacity="0.8">
                {/* Reference Path */}
                <path id="path-ref" d="M 100 150 C 200 150, 300 300, 400 300" fill="none" stroke="var(--c-node-brown)" strokeWidth="1.5" strokeDasharray="4 4" />
                {/* Noise Path */}
                <path id="path-noise" d="M 100 450 C 200 450, 300 300, 400 300" fill="none" stroke="var(--c-node-red)" strokeWidth="1.5" strokeDasharray="4 4" />
                
                {/* Dust Particles for Inputs */}
                {isRunning && [
                    ...Array(20).fill(0).map((_, i) => (
                        <motion.circle key={`ref-dust-${i}`} r={Math.random() * 1.5} fill="var(--c-node-brown)" opacity={Math.random()}
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                            style={{ offsetPath: "path('M 100 150 C 200 150, 300 300, 400 300')" }}
                        />
                    )),
                    ...Array(20).fill(0).map((_, i) => (
                        <motion.circle key={`noise-dust-${i}`} r={Math.random() * 1.5} fill="var(--c-node-red)" opacity={Math.random()}
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                            style={{ offsetPath: "path('M 100 450 C 200 450, 300 300, 400 300')" }}
                        />
                    ))
                ]}
            </g>

            {/* Output Paths (Center to Right) */}
            <g opacity="0.8">
                 {/* Clean Voice Path */}
                 <path id="path-clean" d="M 400 300 C 500 300, 600 150, 700 150" fill="none" stroke="var(--c-node-green)" strokeWidth="1.5" strokeDasharray="4 4" />
                 {/* Residue Path */}
                 <path id="path-residue" d="M 400 300 C 500 300, 600 450, 700 450" fill="none" stroke="var(--c-node-purple)" strokeWidth="1.5" strokeDasharray="4 4" />

                 {/* Dust Particles for Outputs */}
                 {isRunning && progress > 30 && [
                    ...Array(20).fill(0).map((_, i) => (
                        <motion.circle key={`clean-dust-${i}`} r={Math.random() * 1.5} fill="var(--c-node-green)" opacity={Math.random()}
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                            style={{ offsetPath: "path('M 400 300 C 500 300, 600 150, 700 150')" }}
                        />
                    )),
                    ...Array(20).fill(0).map((_, i) => (
                        <motion.circle key={`residue-dust-${i}`} r={Math.random() * 1.5} fill="var(--c-node-purple)" opacity={Math.random()}
                            animate={{ offsetDistance: ["0%", "100%"] }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                            style={{ offsetPath: "path('M 400 300 C 500 300, 600 450, 700 450')" }}
                        />
                    ))
                ]}
            </g>

            {/* Wavy Vertical Path */}
            <motion.path 
                d="M 400 100 Q 420 150, 400 200 Q 380 250, 400 300 Q 420 350, 400 400 Q 380 450, 400 500" 
                fill="none" 
                stroke="var(--border-main)" 
                strokeWidth="1" 
                strokeDasharray="4 4"
                animate={isRunning ? { strokeDashoffset: [0, -20] } : {}}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
        </svg>

        {/* Nodes Column */}
        <div className="relative flex flex-col items-center justify-between h-[400px] z-10">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center group">
              <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                {/* Node Circle */}
                <motion.div 
                    animate={i === activeStageIndex ? { scale: [1, 1.1, 1], boxShadow: "0 0 30px rgba(0,0,0,0.15)" } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-14 h-14 rounded-full border flex items-center justify-center bg-[var(--bg-app)] transition-all duration-700 relative ${
                        i <= activeStageIndex ? 'border-[var(--text-main)] shadow-xl z-20 opacity-100' : 'border-[var(--border-main)] opacity-50 scale-90'
                    }`}
                >
                    {/* Inner Ring Glow */}
                    {i === activeStageIndex && (
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 rounded-full border-2 border-[var(--text-main)]"
                        />
                    )}
                    
                    {/* Icon */}
                    <s.icon className={`w-5 h-5 ${i <= activeStageIndex ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] opacity-60'}`} />
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

    </div>
  );
}
