"use client";

import { motion } from "motion/react";
import { ParticleWave } from "./ParticleWave";

export function DescriptionCard() {
  return (
    <div className="relative w-full flex flex-col xl:flex-row justify-between items-center gap-12">
      {/* Left text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex-shrink-0"
      >
        <h1 className="text-[60px] md:text-[80px] font-bold tracking-[0.2em] font-mono text-[var(--gold)] mb-4 leading-none">
          VANTA
        </h1>
        <h2 className="text-[28px] md:text-[32px] leading-[1.3] tracking-[0.08em] font-mono whitespace-nowrap">
          <div>
            <span className="text-[var(--gold)]">ISOLATE</span>{" "}
            <span className="text-[#d4d4d4]">VOICES.</span>
          </div>
          <div>
            <span className="text-[var(--gold)]">REMOVE</span>{" "}
            <span className="text-[#d4d4d4]">EVERYTHING ELSE.</span>
          </div>
        </h2>
      </motion.div>

      {/* Right — animated particle mountain */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="w-full xl:w-[600px] h-[260px] shrink-0"
      >
        <ParticleWave />
      </motion.div>
    </div>
  );
}
