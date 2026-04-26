"use client";

import { Download, MoreHorizontal, Music, Pause, Play, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Variant = "charcoal" | "red" | "green" | "purple" | "brown";

type Props = {
  heading: string;
  source?: Blob | File | null;
  filenameOverride?: string;
  variant?: Variant;
  onClear?: () => void;
  onDownload?: () => void;
  onFile?: (file: File) => void;
  emptyLabel?: string;
  className?: string;
};

const COLOR: Record<Variant, { wave: string; progress: string }> = {
  charcoal: { wave: "#999999", progress: "#222222" },
  red: { wave: "#B54545", progress: "#8A2A2A" },
  green: { wave: "#4A6B4A", progress: "#2B3D2B" },
  purple: { wave: "#745296", progress: "#4B3263" },
  brown: { wave: "#A68A64", progress: "#7D6448" },
};

export function AudioCard({
  heading,
  source,
  filenameOverride,
  variant = "charcoal",
  onClear,
  onDownload,
  onFile,
  emptyLabel,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
      barWidth: 2,
      barGap: 2,
      barRadius: 0,
      height: 24,
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

  const filename = filenameOverride ?? (source instanceof File ? source.name : "audio.mp3");
  const sizeStr = source ? `${(source.size / (1024 * 1024)).toFixed(1)} MB` : "";

  return (
    <div className={`card-border p-5 flex flex-col gap-4 bg-[var(--bg-card)] ${className} relative overflow-hidden`}>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-[var(--border-card)] flex items-center justify-center bg-[var(--bg-header)]">
            <Music className="h-4 w-4 opacity-70" />
          </div>
          <h3 className="font-sans text-[15px] font-bold tracking-tight text-[var(--text-main)]">
            {heading}
          </h3>
        </div>
        <button className="opacity-40 hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {source ? (
        <div className="flex flex-col gap-3">
          {/* File Info Row */}
          <div className="flex items-center gap-2">
            <div className="btn-icon h-9 w-9 shrink-0">
              <Music className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[12px] font-bold">{filename}</div>
              <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] mt-0.5">
                {sizeStr} • {formatTime(duration)}
              </div>
            </div>
            {onClear && (
              <button onClick={onClear} className="btn-icon h-9 w-9 shrink-0">
                <X className="h-4 w-4 stroke-[1.5]" />
              </button>
            )}
            {onDownload && (
              <button onClick={onDownload} className="btn-icon h-9 w-9 shrink-0">
                <Download className="h-4 w-4 stroke-[1.5]" />
              </button>
            )}
          </div>

          {/* Waveform Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => wsRef.current?.playPause()}
              disabled={!ready}
              className="btn-icon h-9 w-9 shrink-0 disabled:opacity-50"
            >
              {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current translate-x-[1px]" />}
            </button>
            <div className="flex-1 relative">
              <div ref={containerRef} className="w-full" />
              <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] mt-1">
                <span>{formatTime(time)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (onFile && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (!onFile) return;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*,video/*,.mp3,.wav,.m4a,.mp4,.flac,.ogg,.aac";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) onFile(f);
            };
            input.click();
          }}
          className={`h-full border border-dashed border-[var(--border-dashed)] rounded-[20px] flex items-center justify-center transition-all min-h-[160px] relative ${
            onFile ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" : ""
          } ${isDragging ? "bg-black/5 dark:bg-white/5" : "bg-transparent"}`}
        >
          <div className="flex flex-col items-center gap-4 relative z-10 py-6">
            <Upload className="h-8 w-8 stroke-[1.5] text-[var(--text-main)] opacity-70" />
            <div className="text-[13px] text-[var(--text-main)] leading-relaxed text-center opacity-80 font-medium max-w-[180px]">
               Drag & drop an audio file here or click to browse
            </div>
          </div>
          
          {/* Subtle Background Waveform (Matches Reference) */}
          <div className="absolute bottom-4 left-4 right-4 h-10 opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full fill-[var(--text-main)]">
              {Array.from({ length: 40 }).map((_, i) => (
                <rect key={i} x={i * 2.5} y={10 - (Math.random() * 8)} width="1.5" height={Math.random() * 16} rx="0.75" />
              ))}
            </svg>
          </div>
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
