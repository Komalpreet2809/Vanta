"use client";

import { Music, Pause, Play, Upload, X, Download, AudioLines } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { motion } from "motion/react";

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
  id?: string;
};

const COLOR: Record<Variant, { wave: string; progress: string; dot: string }> = {
  charcoal: { wave: "#888880", progress: "#2C2C2A", dot: "#888880" },
  red: { wave: "#B54545", progress: "#2C2C2A", dot: "#B54545" },
  green: { wave: "#4A6B4A", progress: "#2C2C2A", dot: "#4A6B4A" },
  purple: { wave: "#745296", progress: "#2C2C2A", dot: "#745296" },
  brown: { wave: "#A68A64", progress: "#2C2C2A", dot: "#A68A64" },
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
  id,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      barGap: 3,
      barRadius: 10,
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

  const filename = filenameOverride ?? (source instanceof File ? source.name : "audio.mp3");
  const sizeStr = source ? `${(source.size / (1024 * 1024)).toFixed(1)} MB` : "";
  const colors = COLOR[variant];

  return (
    <div id={id} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
        <h3 className="font-mono-heading text-[11px] font-black tracking-widest text-[var(--text-main)] opacity-90">
          {heading}
        </h3>
      </div>

      {source ? (
        <div className="vanta-card p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full border border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-app)]">
                <Music className="h-5 w-5 text-[var(--text-muted)]" />
             </div>
             <div className="flex-1 min-w-0">
               <div className="truncate text-[12px] font-bold text-[var(--text-main)]">{filename}</div>
               <div className="text-[10px] font-medium text-[var(--text-muted)]">
                 {sizeStr} • {formatTime(duration)}
               </div>
             </div>
             <div className="flex items-center gap-1">
                {onClear && (
                    <motion.button 
                       whileHover={{ 
                         scale: 1.1, 
                         rotate: 5,
                         backgroundColor: "rgba(181, 69, 69, 0.2)",
                         color: "#B54545"
                       }}
                       whileTap={{ scale: 0.9 }}
                       onClick={onClear} 
                       className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    >
                        <X className="h-4 w-4" />
                    </motion.button>
                )}
                {onDownload && (
                    <motion.button 
                       whileHover={{ 
                         scale: 1.1, 
                         rotate: -5,
                         backgroundColor: "rgba(74, 107, 74, 0.2)",
                         color: "#4A6B4A"
                       }}
                       whileTap={{ scale: 0.9 }}
                       onClick={onDownload} 
                       className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    >
                        <Download className="h-4 w-4" />
                    </motion.button>
                )}
             </div>
          </div>

          <div className="flex items-center gap-4 px-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => wsRef.current?.playPause()}
              disabled={!ready}
              className="w-10 h-10 rounded-full bg-[var(--text-main)] text-[var(--bg-app)] flex items-center justify-center hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
            >
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current translate-x-[1px]" />}
            </motion.button>
            <div className="flex-1">
              <div ref={containerRef} className="w-full" />
              <div className="flex justify-between text-[9px] font-medium text-[var(--text-muted)] mt-1.5 px-0.5">
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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
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
          className={`flex-1 border-2 border-dashed border-[var(--border-main)] rounded-xl flex items-center justify-center transition-all duration-300 min-h-[120px] ${
            onFile ? "cursor-pointer hover:border-[var(--text-main)] hover:bg-[var(--bg-card)]" : "bg-black/[0.02]"
          } ${isDragging ? "border-[var(--text-main)] bg-[var(--bg-card)] scale-[0.99]" : ""}`}
        >
          <div className="flex flex-col items-center gap-2">
             <div className="w-9 h-9 rounded-full border border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-app)] shadow-sm">
                <div className="flex items-center gap-[2px] h-4">
                   {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={isHovered ? {
                          height: [6, 16, 8, 14, 6],
                          opacity: 1
                        } : {
                          height: 8,
                          opacity: 0.4
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: isHovered ? Infinity : 0,
                          repeatType: "reverse",
                          delay: i * 0.1,
                          ease: "easeInOut"
                        }}
                        className="w-[2.5px] bg-[var(--text-muted)] rounded-full"
                      />
                   ))}
                </div>
             </div>
             <div className="text-center px-6">
                <div className="text-[12px] font-bold text-[var(--text-main)] mb-0.5 uppercase tracking-wider">
                    {onFile ? "Drag & drop or click to upload" : emptyLabel ?? "No signal loaded"}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-tighter opacity-60">
                    WAV, MP3, M4A
                </p>
             </div>
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
