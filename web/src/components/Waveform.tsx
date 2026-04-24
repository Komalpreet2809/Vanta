"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  source: Blob | File | string | null;
  /** Color of the drawn waveform. Defaults to a mid-gray. */
  color?: string;
  progressColor?: string;
  label?: string;
};

/** Thin wavesurfer.js wrapper: mounts a waveform for a blob/file/url and exposes
 *  a built-in play/pause button. Rebuilds if `source` changes. */
export function Waveform({
  source,
  color = "#737373",
  progressColor = "#f5f5f5",
  label,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !source) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor,
      cursorColor: "#f5f5f5",
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      height: 72,
      normalize: true,
      interact: true,
    });
    wsRef.current = ws;
    setReady(false);
    setPlaying(false);

    if (typeof source === "string") {
      ws.load(source);
    } else {
      // wavesurfer.js supports Blob directly via loadBlob
      ws.loadBlob(source);
    }

    ws.on("ready", () => setReady(true));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [source, color, progressColor]);

  if (!source) return null;

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--dim)]">
          <span>{label}</span>
          <button
            type="button"
            disabled={!ready}
            onClick={() => wsRef.current?.playPause()}
            className="border border-[var(--line)] px-2 py-0.5 text-[var(--light)] hover:bg-[var(--light)] hover:text-[var(--void)] disabled:opacity-40"
          >
            {playing ? "PAUSE" : "PLAY"}
          </button>
        </div>
      ) : null}
      <div ref={containerRef} className="wf" />
    </div>
  );
}
