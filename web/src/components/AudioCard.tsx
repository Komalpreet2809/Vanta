"use client";

import { Download, Music, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Variant = "green" | "red" | "purple";

type Props = {
  /** Section title shown above the card, e.g. "REFERENCE AUDIO". */
  heading: string;
  /** When provided, the card shows the file with a waveform. */
  source?: Blob | File | null;
  /** Display name shown above the size — defaults to source.name. */
  filenameOverride?: string;
  /** Color of the waveform / accent dot. */
  variant?: Variant;
  /** Show a clear (×) button. */
  onClear?: () => void;
  /** Show a download button. */
  onDownload?: () => void;
  /** Renders the empty state with this label when no source. */
  emptyLabel?: string;
};

const COLOR: Record<Variant, { wave: string; progress: string; tile: string; tileBorder: string }> = {
  green: {
    wave: "#3d5a3d",
    progress: "#2c4429",
    tile: "rgba(61, 90, 61, 0.12)",
    tileBorder: "rgba(61, 90, 61, 0.3)",
  },
  red: {
    wave: "#b84a3d",
    progress: "#8e3528",
    tile: "rgba(184, 74, 61, 0.12)",
    tileBorder: "rgba(184, 74, 61, 0.3)",
  },
  purple: {
    wave: "#6e548a",
    progress: "#523f68",
    tile: "rgba(110, 84, 138, 0.12)",
    tileBorder: "rgba(110, 84, 138, 0.3)",
  },
};

export function AudioCard({
  heading,
  source,
  filenameOverride,
  variant = "green",
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
      height: 36,
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

  const filename =
    filenameOverride ??
    (source instanceof File ? source.name : "audio.wav");
  const sizeStr = source ? `${(source.size / 1024).toFixed(1)} KB` : "";
  const colors = COLOR[variant];

  return (
    <div>
      <h3 className="font-medium text-[12px] tracking-[0.14em] uppercase text-[var(--text-soft)] mb-3">
        {heading}
      </h3>

      {source ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
          {/* file row */}
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border-faint)]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm"
              style={{
                background: colors.tile,
                border: `1px solid ${colors.tileBorder}`,
              }}
            >
              <Music
                className="h-4 w-4"
                style={{ color: colors.wave }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-[var(--text)] font-medium">
                {filename}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] tabular-nums">
                {sizeStr} • {formatTime(duration)}
              </div>
            </div>
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                aria-label="clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onDownload ? (
              <button
                type="button"
                onClick={onDownload}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
                aria-label="download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* waveform row */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={() => wsRef.current?.playPause()}
              disabled={!ready}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-page)] text-[var(--text)] hover:bg-[var(--bg-input)] disabled:opacity-40"
              aria-label={playing ? "pause" : "play"}
            >
              {playing ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3 fill-current ml-0.5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div ref={containerRef} className="wf" />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-[var(--text-dim)] tabular-nums">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/50 px-3 py-6 text-center">
          <span className="text-[12px] text-[var(--text-dim)]">
            {emptyLabel ?? "—"}
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
