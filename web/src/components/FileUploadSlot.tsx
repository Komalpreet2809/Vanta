"use client";

import { Music } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  slot: string;          // "01" / "02"
  label: string;         // "Reference Voice"
  file: File | null;
  onFile: (f: File | null) => void;
  defaultFilename?: string;
  defaultSize?: string;
};

const ACCEPT =
  "audio/*,video/*,.wav,.mp3,.flac,.ogg,.m4a,.mp4,.webm,.mov,.aac";

export function FileUploadSlot({
  slot,
  label,
  file,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  // Reset audio state when file changes / clears.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, [file]);


  const sizeStr = file ? `${(file.size / 1024).toFixed(1)} KB` : "";

  return (
    <div className="panel p-5">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text)]">
          {label}
        </span>
        {file ? (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="flex h-6 w-6 items-center justify-center border border-[var(--border)] hover:bg-[var(--accent-red)]/10 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* dropzone / loaded card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`inset-panel min-h-[50px] transition-all duration-200 ${
          dragOver ? "bg-[var(--bg-hover)] border-[var(--border-strong)]" : ""
        } ${!file ? "cursor-pointer hover:border-[var(--border-strong)]" : ""}`}
      >
        {file ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-8 w-8 shrink-0 border border-[var(--border)] flex items-center justify-center bg-[var(--bg-card)]">
               <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
               </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold text-[var(--text)]">
                {file.name}
              </div>
              <div className="text-[10px] text-[var(--text-dim)] uppercase">
                {sizeStr} • <span className="text-[var(--accent-green)]">Loaded</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[80px] flex-col items-center justify-center gap-2 px-4 py-3 border border-dashed border-[var(--border)] m-1">
            <svg className="h-5 w-5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            <span className="text-[10px] text-[var(--text-dim)] text-center leading-tight">
              Drag & drop audio files here<br/>or click to browse
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </div>
  );
}
