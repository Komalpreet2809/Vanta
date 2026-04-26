"use client";

import { useCallback, useRef, useState } from "react";
import { File, Play, X } from "lucide-react";

type Props = {
  slot: string;
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  spinning?: boolean;
  defaultFilename?: string;
  defaultSize?: string;
};

const ACCEPT = "audio/*,video/*,.wav,.mp3,.flac,.ogg,.m4a,.mp4,.webm,.mov,.aac";

export function FileUploadSlot({ slot, label, file, onFile, defaultFilename, defaultSize }: Props) {
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
    <div className="bg-[var(--bg-panel-dark)] rounded border border-[var(--border-color)] p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[13px] tracking-widest">
          <span className="text-[var(--text-dim)]">{slot} </span>
          <span className="text-[var(--text-main)]">{label}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFile(null);
          }}
          className="flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 rounded border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors"
        >
          Clear <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex items-center justify-between gap-6 px-6 py-5 rounded border border-dashed transition-all cursor-pointer
          ${dragOver ? "border-[var(--gold)] bg-[var(--gold-dim)]" : "border-[var(--border-color)] hover:border-[var(--text-dim)]"}
        `}
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center justify-center text-[var(--text-dim)]">
            <File className="h-7 w-7" strokeWidth={1} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[var(--text-main)]">
              {file ? file.name : defaultFilename || "Audio1.mp4"}
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-dim)]">
              <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : defaultSize || "46.2 KB"}</span>
              <span>•</span>
              <span>00:05</span>
            </div>
          </div>
        </div>

        <button className="h-8 w-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-panel)] text-[var(--text-main)] hover:text-[var(--gold)] hover:border-[var(--gold)] transition-all">
          <Play className="h-3 w-3 fill-current ml-0.5" />
        </button>

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
