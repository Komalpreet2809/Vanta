"use client";

import { Download, MoreVertical, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  source: Blob | File | string | null;
  label: string;
  /** Reference uses the green accent; everything else stays neutral. */
  variant?: "accent" | "neutral";
  onPlayingChange?: (playing: boolean) => void;
  onDownload?: () => void;
};

export function WaveformRow({
  source,
  label,
  variant = "neutral",
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

    const accent = variant === "accent" ? "#4ade80" : "#aab1b6";
    const progress = variant === "accent" ? "#22c55e" : "#e7eaec";

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: accent,
      progressColor: progress,
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      barRadius: 1,
      height: 60,
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
  }, [source, variant]);

  if (!source) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
      {/* header: label + actions */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] text-[var(--text)] font-medium">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => wsRef.current?.playPause()}
            disabled={!ready}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-[12px] text-[var(--text-soft)] hover:text-[var(--text)] hover:border-[var(--text-soft)] disabled:opacity-50 transition-colors"
          >
            {playing ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Play
              </>
            )}
          </button>
          {onDownload ? (
            <button
              type="button"
              onClick={onDownload}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
              aria-label="download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* circular play + waveform + duration */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-soft)] hover:text-[var(--text)] hover:border-[var(--text-soft)] disabled:opacity-40 transition-colors"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="wf" />
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-dim)] tabular-nums">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration, true)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number, withCs = false): string {
  if (!isFinite(seconds)) return withCs ? "00:00.00" : "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (!withCs) {
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
