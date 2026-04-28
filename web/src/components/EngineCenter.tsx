"use client";

import { motion, AnimatePresence } from "motion/react";
import { Search, Layers, Wand2, Mic, Activity } from "lucide-react";
import { useState, useEffect } from "react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  progress: number;
  stage: string;
  onExtract: () => void;
  id?: string;
};

const STAGES = [
  { id: "analyze", label: "ANALYZE", desc: "Detecting audio patterns", icon: Search, color: "var(--c-node-brown)" },
  { id: "separate", label: "SEPARATE", desc: "Isolating voice from noise", icon: Layers, color: "var(--c-node-red)" },
  { id: "enhance", label: "ENHANCE", desc: "Improving clarity and quality", icon: Wand2, color: "var(--c-node-green)" },
  { id: "reconstruct", label: "RECONSTRUCT", desc: "Building clean voice output", icon: Mic, color: "var(--c-node-purple)" },
];

export function EngineCenter({
  canExtract,
  status,
  progress,
  stage,
  onExtract,
  id,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const isRunning = status === "running";
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate which stage we are in based on progress (0-100)
  // analyze: 0-25, separate: 25-50, enhance: 50-75, reconstruct: 75-100
  const activeStageIndex = isRunning ? Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length)) : -1;

  return (
    <div id={id} className="flex flex-col items-center justify-between w-full h-full py-8">
      <div className="flex-1 w-full max-w-[800px] max-h-[600px] relative flex items-center justify-center overflow-visible mx-auto">
        {/* SVG Flow Container */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Butterfly Wing Clipping Paths (Expanded) */}
                <clipPath id="clip-tl">
                    <path d="M 400 300 L 300 30 Q 100 -20, 0 120 Q 30 280, 400 300 Z" />
                </clipPath>
                <clipPath id="clip-bl">
                    <path d="M 400 300 L 80 320 Q -20 450, 30 650 Q 250 630, 400 300 Z" />
                </clipPath>
                <clipPath id="clip-tr">
                    <path d="M 400 300 L 500 30 Q 700 -20, 800 120 Q 770 280, 400 300 Z" />
                </clipPath>
                <clipPath id="clip-br">
                    <path d="M 400 300 L 720 320 Q 820 450, 770 650 Q 550 630, 400 300 Z" />
                </clipPath>
            </defs>
            
            {mounted && (
                <g transform="rotate(180, 400, 300)" filter="url(#glow)">
                {/* Clipped Butterfly Wings - Left Side (Now Right) */}
                <motion.g 
                    animate={{ opacity: [0.8, 0.95, 0.7, 1, 0.85, 0.6, 0.9, 0.8] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* Physically at Bottom-Right (originally TL) - Match Purple */}
                    <g clipPath="url(#clip-tl)">
                        {[...Array(600)].map((_, i) => {
                            const t = i / 600;
                            const angle = -Math.PI + (t * Math.PI/2); 
                            const radius = 650;
                            const cpX = (400 + Math.cos(angle - 0.2) * (radius * 0.4)).toFixed(3);
                            const cpY = (300 + Math.sin(angle - 0.2) * (radius * 0.4)).toFixed(3);
                            const endXVal = (400 + Math.cos(angle) * radius).toFixed(3);
                            const endYVal = (300 + Math.sin(angle) * radius).toFixed(3);
                            const pathD = `M 400 300 Q ${cpX} ${cpY}, ${endXVal} ${endYVal}`;
                            
                            return (
                                <motion.path 
                                    key={`silk-tl-${i}`}
                                    d={pathD}
                                    fill="none"
                                    stroke="var(--c-node-purple)"
                                    strokeWidth="0.6"
                                    initial={{ opacity: 0.1 }}
                                    animate={{ opacity: [0.1, 0.45, 0.1] }}
                                    transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
                                />
                            );
                        })}
                    </g>
                    
                    {/* Physically at Top-Right (originally BL) - Match Green */}
                    <g clipPath="url(#clip-bl)">
                        {[...Array(600)].map((_, i) => {
                            const t = i / 600;
                            const angle = Math.PI - (t * Math.PI/2); 
                            const radius = 650;
                            const cpX = (400 + Math.cos(angle + 0.2) * (radius * 0.4)).toFixed(3);
                            const cpY = (300 + Math.sin(angle + 0.2) * (radius * 0.4)).toFixed(3);
                            const endXVal = (400 + Math.cos(angle) * radius).toFixed(3);
                            const endYVal = (300 + Math.sin(angle) * radius).toFixed(3);
                            const pathD = `M 400 300 Q ${cpX} ${cpY}, ${endXVal} ${endYVal}`;
                            
                            return (
                                <motion.path 
                                    key={`silk-bl-${i}`}
                                    d={pathD}
                                    fill="none"
                                    stroke="var(--c-node-green)"
                                    strokeWidth="0.6"
                                    initial={{ opacity: 0.1 }}
                                    animate={{ opacity: [0.1, 0.45, 0.1] }}
                                    transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
                                />
                            );
                        })}
                    </g>
                    
                    <circle cx="400" cy="300" r="3" fill="white" filter="url(#glow)" className="opacity-80" />
                </motion.g>

                <motion.g 
                    animate={{ opacity: [0.85, 0.6, 1, 0.7, 0.95, 0.65, 0.85] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                    {/* Physically at Bottom-Left (originally TR) - Match Red */}
                    <g clipPath="url(#clip-tr)">
                        {[...Array(600)].map((_, i) => {
                            const t = i / 600;
                            const angle = -Math.PI/2 + (t * Math.PI/2);
                            const radius = 650;
                            const cpX = (400 + Math.cos(angle + 0.2) * (radius * 0.4)).toFixed(3);
                            const cpY = (300 + Math.sin(angle + 0.2) * (radius * 0.4)).toFixed(3);
                            const endXVal = (400 + Math.cos(angle) * radius).toFixed(3);
                            const endYVal = (300 + Math.sin(angle) * radius).toFixed(3);
                            const pathD = `M 400 300 Q ${cpX} ${cpY}, ${endXVal} ${endYVal}`;
                            
                            return (
                                <motion.path 
                                    key={`silk-tr-${i}`}
                                    d={pathD}
                                    fill="none"
                                    stroke="var(--c-node-red)"
                                    strokeWidth="0.6"
                                    initial={{ opacity: 0.1 }}
                                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                                    transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
                                />
                            );
                        })}
                    </g>
                    
                    {/* Physically at Top-Left (originally BR) - Match Brown */}
                    <g clipPath="url(#clip-br)">
                        {[...Array(600)].map((_, i) => {
                            const t = i / 600;
                            const angle = Math.PI/2 - (t * Math.PI/2);
                            const radius = 650;
                            const cpX = (400 + Math.cos(angle - 0.2) * (radius * 0.4)).toFixed(3);
                            const cpY = (300 + Math.sin(angle - 0.2) * (radius * 0.4)).toFixed(3);
                            const endXVal = (400 + Math.cos(angle) * radius).toFixed(3);
                            const endYVal = (300 + Math.sin(angle) * radius).toFixed(3);
                            const pathD = `M 400 300 Q ${cpX} ${cpY}, ${endXVal} ${endYVal}`;
                            
                            return (
                                <motion.path 
                                    key={`silk-br-${i}`}
                                    d={pathD}
                                    fill="none"
                                    stroke="var(--c-node-brown)"
                                    strokeWidth="0.6"
                                    initial={{ opacity: 0.1 }}
                                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                                    transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
                                />
                            );
                        })}
                    </g>
                </motion.g>
            </g>
            )}

            {/* Magical Neural Particles - Flow from Left to Right */}
            <AnimatePresence>
                {mounted && status === 'running' && (
                    <motion.g 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ filter: "url(#glow) blur(0.4px)", willChange: "transform" }}
                    >
                        {/* Input Flow (Left to Center) - Active from start */}
                        {[...Array(120)].map((_, i) => {
                            const isTop = i % 2 === 0;
                            const jitter = (Math.random() - 0.5) * 180;
                            return (
                                <motion.circle 
                                    key={`sparkle-in-${i}`} 
                                    r={0.5 + Math.random() * 1.5} 
                                    fill={isTop ? "var(--c-node-brown)" : "var(--c-node-red)"}
                                    initial={{ opacity: 0 }}
                                    animate={{ 
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1.2, 0.5],
                                        offsetDistance: ["0%", "100%"] 
                                    }}
                                    transition={{ 
                                        duration: 1.8 + Math.random() * 2, 
                                        repeat: Infinity, 
                                        ease: "linear", 
                                        delay: Math.random() * 5 
                                    }}
                                    style={{ 
                                        offsetPath: `path('M 50 ${isTop ? 100 : 500} C ${180 + Math.random() * 50} ${isTop ? 100 + jitter : 500 + jitter}, ${280 + Math.random() * 50} ${300 + jitter}, 400 300')`,
                                        willChange: "transform"
                                    }}
                                />
                            );
                        })}

                        {/* Output Flow (Center to Right) - Delayed until first stage analysis is underway */}
                        {progress > 15 && [...Array(150)].map((_, i) => {
                            const isTop = i % 2 === 0;
                            const jitter = (Math.random() - 0.5) * 180;
                            return (
                                <motion.circle 
                                    key={`sparkle-out-${i}`} 
                                    r={0.5 + Math.random() * 1.5} 
                                    fill={isTop ? "var(--c-node-green)" : "var(--c-node-purple)"}
                                    initial={{ opacity: 0 }}
                                    animate={{ 
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1.2, 0.5],
                                        offsetDistance: ["0%", "100%"] 
                                    }}
                                    transition={{ 
                                        duration: 1.8 + Math.random() * 2, 
                                        repeat: Infinity, 
                                        ease: "linear", 
                                        delay: Math.random() * 5 
                                    }}
                                    style={{ 
                                        offsetPath: `path('M 400 300 C ${520 + Math.random() * 50} ${300 + jitter}, ${620 + Math.random() * 50} ${isTop ? 100 + jitter : 500 + jitter}, 750 ${isTop ? 100 : 500}')`,
                                        willChange: "transform"
                                    }}
                                />
                            );
                        })}
                    </motion.g>
                )}
            </AnimatePresence>
        </svg>

        {/* Nodes Column - Defined width to ensure SVG visibility */}
        <div className="relative flex flex-col items-center justify-between h-[380px] w-16 z-10">
            {/* Straight Connecting Line - Behind Icons */}
            <div className="absolute top-0 bottom-0 w-[1.5px] bg-[var(--text-main)] opacity-30 z-0" />
          
          {STAGES.map((s, i) => {
            const isActive = i === activeStageIndex;
            return (
              <div key={s.id} className="flex items-center group">
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                  {/* Node Circle */}
                  <motion.div 
                      animate={isActive 
                          ? { 
                              scale: [1, 1.15, 1], 
                              boxShadow: [
                                  "0 0 20px rgba(0,0,0,0.1)", 
                                  `0 0 40px ${s.color}44`, 
                                  "0 0 20px rgba(0,0,0,0.1)"
                              ] 
                            } 
                          : {}
                      }
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className={`w-12 h-12 rounded-full border flex items-center justify-center bg-[var(--bg-app)] transition-all duration-700 relative z-20 ${
                          isActive 
                              ? 'border-[var(--text-main)] shadow-2xl scale-110' 
                              : i < activeStageIndex
                                  ? 'border-[var(--text-main)] opacity-100 scale-100'
                                  : 'border-[var(--border-main)] border-opacity-40 scale-90'
                      }`}
                  >
                      {/* Inner Ring Glow - Coherent with active stage */}
                      {isActive && (
                          <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 2.2, opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute inset-0 rounded-full border-2"
                              style={{ borderColor: s.color }}
                          />
                      )}
                      
                      {/* Icon */}
                      <motion.div 
                          whileHover={{ 
                            scale: 1.15, 
                            rotate: [0, -5, 5, 0],
                            backgroundColor: `${s.color}22`,
                            color: s.color,
                            borderColor: s.color
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className={`
                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                            ${isActive ? 'bg-[var(--text-main)] text-[var(--bg-app)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-white/5'}
                            group-hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]
                          `}
                      >
                          <s.icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                          
                          {/* Hover Ring */}
                          <motion.div 
                              className="absolute inset-0 rounded-full border border-white/20 opacity-0 group-hover:opacity-100"
                              initial={false}
                              whileHover={{ scale: 1.6, opacity: 0, borderColor: s.color }}
                              transition={{ duration: 1, repeat: Infinity }}
                          />
                      </motion.div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
