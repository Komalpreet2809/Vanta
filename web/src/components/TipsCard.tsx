"use client";

import { Lightbulb } from "lucide-react";
import { motion } from "motion/react";

export function TipsCard() {
  return (
    <div className="p-2 w-full group">
      <div className="flex items-center gap-3 mb-3 text-[var(--text-main)]">
        <motion.div 
            whileHover={{ 
              scale: 1.2, 
              rotate: 15,
              backgroundColor: "rgba(255, 191, 0, 0.1)",
              boxShadow: "0 0 25px rgba(255, 191, 0, 0.4)"
            }}
            className="h-8 w-8 rounded-full border border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-card)] transition-all duration-300 group-hover:border-yellow-500/50"
        >
          <Lightbulb className="h-5 w-5 text-[var(--text-muted)] group-hover:text-yellow-500 group-hover:fill-yellow-500/20 transition-all duration-300" />
        </motion.div>
        <span className="font-mono-heading text-[12px] opacity-80">TIPS</span>
      </div>
      <ul className="list-disc pl-5 text-[11px] text-[var(--text-main)] space-y-2 marker:text-[var(--text-muted)] font-medium">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
