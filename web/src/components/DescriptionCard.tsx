"use client";

import { motion } from "motion/react";
import { ParticleWave } from "./ParticleWave";

export function DescriptionCard() {
  return (
    <div className="relative w-full flex flex-col md:flex-row justify-between items-start">
      {/* Left text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex-1 mt-6"
      >
        <h2 className="text-[34px] md:text-[38px] leading-[1.2] tracking-[0.05em] font-mono w-[400px]">
          <span className="text-[var(--gold)]">ISOLATE</span>{" "}
          <span className="text-[var(--text-main)]">VOICES.</span>
          <span className="text-[var(--gold)]">REMOVE</span>{" "}
          <span className="text-[var(--text-main)]">EVERYTHING ELSE.</span>
        </h2>
        <p className="mt-6 font-mono text-[13px] leading-[1.8] tracking-[0.02em] text-[var(--text-dim)] max-w-[420px]">
          Upload a 5-second reference clip of the target speaker and a noisy recording. Vanta extracts the voice and returns it — clean, clear, and isolated.
        </p>
      </motion.div>

      {/* Right — animated particle mountain */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="w-[500px] h-[200px] shrink-0"
      >
        <ParticleWave />
      </motion.div>
    </div>
  );
}
