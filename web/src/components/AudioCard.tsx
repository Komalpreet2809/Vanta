"use client";

import { Download, Music, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Variant = "charcoal" | "red" | "green" | "purple";

type Props = {
  heading: string;
  source?: Blob | File | null;
  filenameOverride?: string;
  variant?: Variant;
  onClear?: () => void;
  onDownload?: () => void;
  emptyLabel?: string;
};

const COLOR: Record<Variant, { wave: string; progress: string }> = {
  charcoal: { wave: "#444444", progress: "#222222" },
  red: { wave: "#b84a3d", progress: "#8e3528" },
  green: { wave: "#3d5a3d", progress: "#2c4429" },
  purple: { wave: "#6e548a", progress: "#523f68" },
};

export function AudioCard({
  heading,
  source,
  filenameOverride,
  variant = "charcoal",
  onClear,
  onDownload,
  emptyLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !source) {
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }
      return;
    }
    const colors = COLOR[variant];
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: colors.wave,
      progressColor: colors.progress,
      cursorColor: "transparent",
      barWidth: 1.5,
      barGap: 1.5,
      barRadius: 0,
      height: 32,
      normalize: true,
      interact: true,
    });
    wsRef.current = ws;
    setReady(false);
    setPlaying(false);
    ws.loadBlob(source as Blob);
    ws.on("ready", () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on("audioprocess", () => setTime(ws.getCurrentTime()));
    ws.on("seeking", () => setTime(ws.getCurrentTime()));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [source, variant]);

  const filename = filenameOverride ?? (source instanceof File ? source.name : "audio.wav");
  const sizeStr = source ? `${(source.size / (1024 * 1024)).toFixed(1)} MB` : "";

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-bold text-[11px] tracking-[0.2em] uppercase text-[var(--text-soft)]">
        {heading}
      </h3>

      {source ? (
        <div className="panel p-4 bg-[var(--bg-card)] flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-page)] shadow-inner">
              <Music className="h-4 w-4 opacity-60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[13px] font-bold text-[var(--text)]">{filename}</div>
              <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                {sizeStr} • {formatTime(duration)}
              </div>
            </div>
            <div className="flex gap-2">
              {onDownload && (
                <button onClick={onDownload} className="industrial-button h-10 w-10 flex items-center justify-center bg-[var(--bg-page)]">
                  <Download className="h-4 w-4" />
                </button>
              )}
              {onClear && (
                <button onClick={onClear} className="industrial-button h-10 w-10 flex items-center justify-center bg-[var(--bg-page)]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => wsRef.current?.playPause()}
              disabled={!ready}
              className="industrial-button h-10 w-10 flex items-center justify-center bg-[var(--bg-page)] shadow-inner"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div ref={containerRef} className="h-8" />
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-bold tabular-nums text-[var(--text-dim)]">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      ) : (
        <div className="panel p-8 border-dashed flex flex-col items-center justify-center text-center gap-3 bg-[var(--bg-page)]/20">
          <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">
            {emptyLabel ?? "No signal loaded"}
          </span>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
