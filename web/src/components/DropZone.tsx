"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  onFile: (file: File) => void;
};

export function DropZone({ onFile }: Props) {
  const [active, setActive] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setActive(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFile(f);
        };
        input.click();
      }}
      className={`panel p-8 border-dashed flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
        active ? "bg-[var(--bg-page)] scale-[1.01] border-[var(--text)]" : "bg-[var(--bg-page)]/20 hover:bg-[var(--bg-page)]/40"
      }`}
    >
      <div className="h-10 w-10 flex items-center justify-center rounded-full border border-dashed border-[var(--border)] opacity-40">
        <Upload className="h-5 w-5" />
      </div>
      <span className="text-[11px] font-bold text-[var(--text-soft)] uppercase tracking-widest leading-relaxed">
        Drag & drop audio files here<br />or click to browse
      </span>
    </div>
  );
}
