"use client";

import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type Props = {
  /** Called when a file is dropped/selected. The parent decides which slot
   *  (reference vs noise) to assign it to via the chooser dialog. */
  onFile: (f: File) => void;
};

const ACCEPT =
  "audio/*,video/*,.wav,.mp3,.flac,.ogg,.m4a,.mp4,.webm,.mov,.aac";

export function DropZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={`flex items-center gap-3 rounded-md border border-dashed px-4 py-4 cursor-pointer transition-colors ${
        dragOver
          ? "border-[var(--text-soft)] bg-[var(--bg-elevated)]"
          : "border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-elevated)]"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
        <Upload className="h-3.5 w-3.5 text-[var(--text-soft)]" />
      </span>
      <span className="text-[12px] text-[var(--text-soft)] leading-tight">
        Drag & drop audio files here
        <br />
        <span className="text-[var(--text-dim)]">or click to browse</span>
      </span>
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
  );
}
