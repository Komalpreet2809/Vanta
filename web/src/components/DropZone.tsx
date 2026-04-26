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
      className={`card-border border-dashed p-4 flex items-center justify-center gap-4 cursor-pointer transition-colors ${
        active ? "bg-black/5" : "bg-[var(--bg-app)] hover:bg-black/5"
      }`}
    >
      <Upload className="h-5 w-5 stroke-[1.5] text-[var(--text-main)]" />
      <div className="text-sm text-[var(--text-main)] leading-tight text-left">
        Drag & drop audio files here<br />or click to browse
      </div>
    </div>
  );
}
