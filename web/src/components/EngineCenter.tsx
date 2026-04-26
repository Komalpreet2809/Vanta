"use client";

import { Loader2, Play } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  canExtract: boolean;
  status: "idle" | "running" | "error";
  hasReference: boolean;
  hasNoise: boolean;
  hasOutput: boolean;
  onExtract: () => void;
};

/** Center column: heading, connection nodes (Reference / Noise on left,
 *  Clean Voice / Residue on right), and a big circular "EXTRACT VOICE" button
 *  in the middle. The whole thing reads as a flow diagram. */
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
    <div className="flex flex-col items-center text-center">
      {/* Heading */}
      <h2 className="font-bold text-[15px] tracking-[0.16em] uppercase text-[var(--text)] mb-1">
        Vanta Engine
      </h2>
      <p className="text-[12px] text-[var(--text-soft)] mb-12">
        Isolates the target voice from noise.
      </p>

      {/* The diagram: 4 corner nodes + center button + connecting lines */}
      <div className="relative w-[360px] h-[280px]">
        {/* SVG connection lines */}
        <svg
          viewBox="0 0 360 280"
          className="absolute inset-0 pointer-events-none"
          fill="none"
        >
          {/* Reference (top-left) -> center */}
          <line
            x1="20" y1="40" x2="180" y2="140"
            stroke={hasReference ? "var(--c-green)" : "var(--border-strong)"}
            strokeWidth="1"
            strokeDasharray={hasReference ? "0" : "3 3"}
          />
          {/* Noise (bottom-left) -> center */}
          <line
            x1="20" y1="240" x2="180" y2="140"
            stroke={hasNoise ? "var(--c-red)" : "var(--border-strong)"}
            strokeWidth="1"
            strokeDasharray={hasNoise ? "0" : "3 3"}
          />
          {/* center -> Clean Voice (top-right) */}
          <line
            x1="180" y1="140" x2="340" y2="40"
            stroke={hasOutput ? "var(--c-green)" : "var(--border-strong)"}
            strokeWidth="1"
            strokeDasharray={hasOutput ? "0" : "3 3"}
          />
          {/* center -> Residue (bottom-right) */}
          <line
            x1="180" y1="140" x2="340" y2="240"
            stroke={hasOutput ? "var(--c-purple)" : "var(--border-strong)"}
            strokeWidth="1"
            strokeDasharray={hasOutput ? "0" : "3 3"}
          />
        </svg>

        {/* Corner labels + dots */}
        <CornerNode
          label="Reference"
          color="var(--c-green)"
          active={hasReference}
          position="top-left"
        />
        <CornerNode
          label="Noise"
          color="var(--c-red)"
          active={hasNoise}
          position="bottom-left"
        />
        <CornerNode
          label="Clean Voice"
          color="var(--c-green)"
          active={hasOutput}
          position="top-right"
        />
        <CornerNode
          label="Residue (Noise)"
          color="var(--c-purple)"
          active={hasOutput}
          position="bottom-right"
        />

        {/* Center button — concentric rings around a dark circular pad */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* outer dashed ring */}
          <div className="absolute inset-[-32px] rounded-full border border-dashed border-[var(--border-strong)]" />
          {/* middle ring */}
          <div className="absolute inset-[-16px] rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]" />

          <motion.button
            type="button"
            disabled={!canExtract && !isRunning}
            onClick={onExtract}
            whileHover={canExtract ? { scale: 1.02 } : {}}
            whileTap={canExtract ? { scale: 0.98 } : {}}
            className="relative flex h-[160px] w-[160px] flex-col items-center justify-center gap-2 rounded-full bg-[var(--engine)] text-[var(--bg-page)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/* mini wave bars logo */}
            <div className="flex items-end gap-[2px] h-3 mb-1">
              {[0.4, 0.8, 1, 0.6, 0.3].map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 bg-[var(--bg-page)]"
                  style={{ height: `${h * 12}px` }}
                />
              ))}
            </div>
            <span className="font-bold text-[14px] tracking-[0.16em] uppercase">
              {isRunning ? "Extracting" : "Extract Voice"}
            </span>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-70" />
            ) : (
              <Play className="h-4 w-4 fill-current opacity-70" />
            )}
          </motion.button>
        </div>
      </div>

      {/* status footer */}
      <div className="mt-8 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`block h-2 w-2 rounded-full ${
              status === "error"
                ? "bg-[var(--err)]"
                : isRunning
                  ? "bg-[var(--warn)]"
                  : "bg-[var(--ok)]"
            }`}
          />
          <span className="font-medium text-[13px] text-[var(--text)]">
            {status === "error" ? "Error" : isRunning ? "Working" : "Ready"}
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-dim)]">
          {status === "error"
            ? "Something went wrong."
            : isRunning
              ? "Engine is processing."
              : hasOutput
                ? "Engine is idle. Outputs ready."
                : "Engine is idle."}
        </span>
      </div>
    </div>
  );
}

function CornerNode({
  label,
  color,
  active,
  position,
}: {
  label: string;
  color: string;
  active: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const styleMap: Record<typeof position, React.CSSProperties> = {
    "top-left": { top: 28, left: 0 },
    "top-right": { top: 28, right: 0 },
    "bottom-left": { bottom: 28, left: 0 },
    "bottom-right": { bottom: 28, right: 0 },
  };
  const isRight = position.endsWith("right");

  return (
    <div
      className={`absolute flex items-center gap-2 ${isRight ? "flex-row-reverse" : ""}`}
      style={styleMap[position]}
    >
      <span
        className="block h-2.5 w-2.5 rounded-full transition-colors"
        style={{
          background: active ? color : "var(--bg-elevated)",
          border: `1.5px solid ${active ? color : "var(--border-strong)"}`,
          boxShadow: active ? `0 0 0 2px ${color}30` : "none",
        }}
      />
      <span className="font-medium text-[11px] text-[var(--text-soft)] whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
