"use client";

import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  progress: number;
  stage: string;
  onExtract: () => void;
};

export function EngineCenter({
  canExtract,
  status,
  progress,
  stage,
  onExtract,
}: Props) {
  const isRunning = status === "running";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">


      {/* SVG Diagram Container - Fully responsive aspect-square */}
      <div className="relative w-full aspect-square max-w-[600px] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
          
          {/* LEFT CURLY BRACE { */}
          <motion.g animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.8 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
            {/* Top Curve - Straight then curve */}
            <path
              d="M 15 200 L 100 200 C 160 200, 130 400, 180 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3.5"
            />
            {/* Bottom Curve - Straight then curve */}
            <path
              d="M 15 600 L 100 600 C 160 600, 130 400, 180 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3.5"
            />
          </motion.g>

          {/* RIGHT CURLY BRACE } */}
          <motion.g animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.8 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}>
            {/* Top Curve - Straight then curve */}
            <path
              d="M 785 200 L 700 200 C 640 200, 670 400, 620 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3.5"
            />
            {/* Bottom Curve - Straight then curve */}
            <path
              d="M 785 600 L 700 600 C 640 600, 670 400, 620 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3.5"
            />
          </motion.g>

          {/* Node Indicators */}
          {/* Reference */}
          <g transform="translate(15, 200)">
            <circle r="10" fill="var(--bg-card)" stroke="var(--c-node-brown)" strokeWidth="3.5" />
            <circle r="4" fill="var(--c-node-brown)" />
          </g>
          {/* Noise */}
          <g transform="translate(15, 600)">
            <circle r="10" fill="var(--bg-card)" stroke="var(--c-node-red)" strokeWidth="3.5" />
            <circle r="4" fill="var(--c-node-red)" />
          </g>
          {/* Clean Voice */}
          <g transform="translate(785, 200)">
            <circle r="10" fill="var(--bg-card)" stroke="var(--c-node-green)" strokeWidth="3.5" />
            <circle r="4" fill="var(--c-node-green)" />
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(785, 600)">
            <circle r="10" fill="var(--bg-card)" stroke="var(--c-node-purple)" strokeWidth="3.5" />
            <circle r="4" fill="var(--c-node-purple)" />
          </g>
        </svg>

        {/* Central Hero Circle - Fully Responsive */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] max-w-[320px]">
          <div className="relative w-full aspect-square rounded-full border-[10px] border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-app)]">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] -rotate-90 pointer-events-none">
              {isRunning && (
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="var(--text-main)"
                  strokeWidth="10"
                  strokeDasharray="301.59%" 
                  initial={{ strokeDashoffset: "301.59%" }}
                  animate={{ strokeDashoffset: `${301.59 * (1 - Math.max(2, progress) / 100)}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              )}
            </svg>
            
            <motion.button
              disabled={!canExtract || isRunning}
              onClick={onExtract}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative w-[80%] aspect-square rounded-full bg-[var(--bg-card)] border-[3px] border-[var(--text-main)] shadow-[6px_6px_0_var(--text-main)] flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--text-main)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]"
            >
              {/* Waveform Icon (Green bars in reference) */}
              <div className="flex items-center gap-[4px] h-10 mb-4">
                {[0.4, 0.7, 1.0, 0.8, 0.5, 0.8, 1.0, 0.7, 0.4].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={isRunning ? { height: ["40%", "100%", "40%"] } : { height: `${h * 100}%` }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                    className="w-[4px] rounded-none bg-[var(--text-main)]"
                  />
                ))}
              </div>

              {/* Main Text */}
              <div className="flex flex-col items-center mt-2 px-6">
                <span className={`font-bold text-[#333330] tracking-wider text-center ${isRunning ? 'text-[16px]' : 'text-[20px] uppercase mb-4'}`}>
                  {isRunning ? stage : "Extract Voice"}
                </span>
                
                {isRunning ? (
                  <span className="text-[24px] font-mono-heading font-black text-[var(--text-main)] mt-2">
                    {Math.round(progress)}%
                  </span>
                ) : null}
              </div>
            </motion.button>
          </div>
          

        </div>
      </div>


    </div>
  );
}











