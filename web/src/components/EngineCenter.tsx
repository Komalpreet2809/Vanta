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
            {/* Top Curve - Spread to y=200 */}
            <path
              d="M 70 200 C 130 200, 130 400, 180 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3"
            />
            {/* Bottom Curve - Spread to y=600 */}
            <path
              d="M 70 600 C 130 600, 130 400, 180 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3"
            />
          </motion.g>

          {/* RIGHT CURLY BRACE } */}
          <motion.g animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.8 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}>
            {/* Top Curve - Spread to y=200 */}
            <path
              d="M 730 200 C 670 200, 670 400, 620 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3"
            />
            {/* Bottom Curve - Spread to y=600 */}
            <path
              d="M 730 600 C 670 600, 670 400, 620 400"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3"
            />
          </motion.g>

          {/* Node Indicators (Spread to y=200 and y=600) */}
          {/* Reference */}
          <g transform="translate(70, 200)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-green)" />
            <text x="10" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">REFERENCE</text>
          </g>
          {/* Noise */}
          <g transform="translate(70, 600)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-red)" />
            <text x="10" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight">NOISE</text>
          </g>
          {/* Clean Voice */}
          <g transform="translate(730, 200)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-green)" />
            <text x="-70" y="-12" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">CLEAN VOICE</text>
          </g>
          {/* Residue (Noise) */}
          <g transform="translate(730, 600)">
            <circle r="4" fill="var(--bg-card)" />
            <circle r="3" fill="var(--c-purple)" />
            <text x="-95" y="22" className="text-[10px] font-bold fill-[var(--text-main)] tracking-tight text-right">RESIDUE (NOISE)</text>
          </g>
        </svg>

        {/* Central Hero Circle - Fully Responsive */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] max-w-[320px]">
          <div className="relative w-full aspect-square rounded-full border-[10px] border-[#D9D7CE] shadow-lg flex items-center justify-center bg-[#EFEDE6]">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] -rotate-90 pointer-events-none">
              {isRunning && (
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="var(--c-green)"
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
                    className="w-[4px] rounded-full bg-[var(--c-green)]"
                  />
                ))}
              </div>

              {/* Main Text */}
              <div className="flex flex-col items-center mt-2 px-6">
                <span className={`font-bold text-[#333330] tracking-wider text-center ${isRunning ? 'text-[16px]' : 'text-[20px] uppercase mb-4'}`}>
                  {isRunning ? stage : "Extract Voice"}
                </span>
                
                {isRunning ? (
                  <span className="text-[24px] font-mono-heading font-black text-[var(--c-green)] mt-2">
                    {Math.round(progress)}%
                  </span>
                ) : (
                  <div className="mt-2">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="#333330">
                       <path d="M8 5v14l11-7z" />
                     </svg>
                  </div>
                )}
              </div>
            </motion.button>
          </div>
          
          {/* Subtle Glow behind the orb */}
          <div className="absolute -inset-10 bg-[var(--c-green)]/10 rounded-full blur-3xl -z-10" />
        </div>
      </div>


    </div>
  );
}











