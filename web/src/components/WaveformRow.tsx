"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  source: Blob | File | string | null;
  label: string;
  /** Called with `true` while playing, `false` when paused/stopped — drives reel spin. */
  onPlayingChange?: (playing: boolean) => void;
  /** Compact mode — drops label + time + handle, smaller height. Used inside OUTPUT PREVIEW. */
  compact?: boolean;
};

import { Search } from "lucide-react";

export function WaveformRow({ source, label, onPlayingChange, compact }: Props) {
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
      waveColor: "#333",
      progressColor: "#777",
      cursorColor: "#c8b387",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 1,
      height: compact ? 24 : 36,
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
      
      // Inject custom dots for cursor
      const wrapper = containerRef.current?.querySelector("div");
      if (wrapper && wrapper.lastChild) {
        const cursor = wrapper.lastChild as HTMLElement;
        if (cursor && cursor.style) {
          cursor.style.overflow = "visible";
          cursor.style.zIndex = "10";
          cursor.innerHTML = `
            <div style="position:absolute; top:-3px; left:-2px; width:6px; height:6px; border-radius:50%; background:#c8b387;"></div>
            <div style="position:absolute; bottom:-3px; left:-2px; width:6px; height:6px; border-radius:50%; background:#c8b387;"></div>
          `;
        }
      }
    });
    ws.on("audioprocess", () => setTime(ws.getCurrentTime()));
    ws.on("seeking", () => setTime(ws.getCurrentTime()));
    ws.on("play", () => { setPlaying(true); onPlayingChange?.(true); });
    ws.on("pause", () => { setPlaying(false); onPlayingChange?.(false); });
    ws.on("finish", () => { setPlaying(false); onPlayingChange?.(false); });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div ref={containerRef} className="w-full" />
        <div className="flex items-center justify-between">
           <span className="font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-widest">Quality</span>
           <div className="flex items-center gap-1.5 ml-4">
             {Array.from({ length: 10 }).map((_, i) => (
               <div key={i} className={`h-2.5 w-2.5 rounded-sm ${i < 8 ? 'bg-[var(--gold)]' : 'bg-[#222]'}`} />
             ))}
           </div>
           <span className="font-mono text-[10px] text-[var(--text-main)] uppercase tracking-widest ml-auto">82%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] tracking-[0.15em] text-[var(--text-dim)]">
          {label}
        </span>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] bg-transparent hover:bg-[var(--border-color)] transition-colors text-[var(--text-main)]">
          <Search className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px]">Zoom</span>
        </button>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          disabled={!ready || !source}
          onClick={() => wsRef.current?.playPause()}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[var(--bg-panel-dark)] border border-[var(--border-color)] text-[var(--text-main)] hover:text-[var(--gold)] hover:border-[var(--gold)] transition-all shrink-0"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="font-mono text-[11px] text-[var(--text-dim)] tabular-nums shrink-0">
          {formatTime(time)} / {formatTime(duration)}
        </div>

        <div ref={containerRef} className="flex-1 min-w-0" />
      </div>
    </div>
  );
}

function PlayIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="ml-0.5"><polygon points="2,1 9,5 2,9" /></svg>;
}

function PauseIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="1" width="2" height="8" /><rect x="6" y="1" width="2" height="8" /></svg>;
}



function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
