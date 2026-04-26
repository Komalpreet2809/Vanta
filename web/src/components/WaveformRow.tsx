"use client";

import { Download, MoreVertical, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  source: Blob | File | string | null;
  label: string;
  color?: string; // Hex or CSS variable
  onPlayingChange?: (playing: boolean) => void;
  onDownload?: () => void;
};

export function WaveformRow({
  source,
  label,
  color = "var(--accent-charcoal)",
  onPlayingChange,
  onDownload,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!source) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor: color,
      cursorColor: "var(--border-strong)",
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      height: 40,
      normalize: true,
      interact: true,
    });
    wsRef.current = ws;
    setReady(false);
    setPlaying(false);

    if (typeof source === "string") ws.load(source);
    else ws.loadBlob(source);

    ws.on("ready", () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on("audioprocess", () => setTime(ws.getCurrentTime()));
    ws.on("seeking", () => setTime(ws.getCurrentTime()));
    ws.on("play", () => {
      setPlaying(true);
      onPlayingChange?.(true);
    });
    ws.on("pause", () => {
      setPlaying(false);
      onPlayingChange?.(false);
    });
    ws.on("finish", () => {
      setPlaying(false);
      onPlayingChange?.(false);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, color]);

  if (!source) return null;

  return (
    <div className="inset-panel px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          className="industrial-button flex h-7 w-7 shrink-0 items-center justify-center border-[var(--border-strong)] bg-[var(--bg-card)] disabled:opacity-40"
        >
          {playing ? (
            <Pause className="h-3 w-3 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="wf" />
          <div className="mt-0.5 flex items-center justify-between text-[9px] font-bold text-[var(--text-dim)] uppercase tabular-nums">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="industrial-button flex h-7 w-7 shrink-0 items-center justify-center border-[var(--border-strong)] bg-[var(--bg-card)]"
            aria-label="download"
          >
            <Download className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
