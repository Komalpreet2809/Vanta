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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[15px] text-[var(--accent)] font-medium tabular-nums">
            {slot}
          </span>
          <span className="text-[15px] text-[var(--text)] font-medium">
            {label}
          </span>
        </div>
        {file ? (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-[12px] text-[var(--text-soft)] hover:text-[var(--text)] px-3 py-1 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
          >
            Clear
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
        className={`rounded-lg border bg-[var(--bg-input)] px-4 py-3 transition-all duration-200 ${
          dragOver
            ? "border-[var(--accent)] bg-[var(--bg-card)] scale-[1.02] shadow-lg shadow-[var(--accent)]/20"
            : "border-[var(--border)]"
        } ${!file ? "cursor-pointer hover:border-[var(--border-strong)]" : ""}`}
      >
        {file ? (
          <div className="flex items-center gap-3">
            {/* music icon tile */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] border border-[var(--accent)]/20">
              <Music className="h-4 w-4 text-[var(--accent)]" />
            </div>
            {/* filename + meta */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] text-[var(--text)] font-medium">
                {file.name}
              </div>
              <div className="text-[12px] text-[var(--text-dim)]">
                {sizeStr} • <span className="text-[var(--accent)]">Ready</span>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center">
            <span className="text-[13px] text-[var(--text-dim)]">
              <span className="text-[var(--text-soft)]">Click</span> or drag and drop a file here
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

      {/* "Ready" footer */}
      {file ? (
        <div className="flex items-center gap-1.5 mt-3">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg viewBox="0 0 12 12" className="h-3 w-3 text-[var(--accent)]" fill="currentColor">
              <path d="M5 8.5L2.5 6l-1 1L5 10.5 11 4.5l-1-1z" />
            </svg>
          </span>
          <span className="text-[12px] text-[var(--text-soft)]">Ready</span>
        </div>
      ) : null}
    </div>
  );
}
