"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  label: string;
  hint?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
};

const DEFAULT_ACCEPT =
  "audio/*,video/*,.wav,.mp3,.flac,.ogg,.m4a,.mp4,.webm,.mov,.aac";

export function FileDrop({ label, hint, file, onFile, accept = DEFAULT_ACCEPT }: Props) {
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
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--dim)]">
        <span>{label}</span>
        {file ? (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-[var(--light)] hover:underline"
          >
            CLEAR
          </button>
        ) : null}
      </div>
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
        className={`group flex cursor-pointer flex-col items-start justify-center gap-2 border px-4 py-6 transition-colors ${
          dragOver
            ? "border-[var(--light)] bg-[var(--line)]"
            : "border-[var(--line)] hover:border-[var(--light)]"
        }`}
      >
        {file ? (
          <>
            <span className="text-sm text-[var(--light)] truncate max-w-full">
              {file.name}
            </span>
            <span className="text-xs text-[var(--dim)]">
              {(file.size / 1024).toFixed(1)} KB · click to replace
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-[var(--light)]">
              Drop audio file or click to browse
            </span>
            {hint ? (
              <span className="text-xs text-[var(--dim)]">{hint}</span>
            ) : null}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
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
