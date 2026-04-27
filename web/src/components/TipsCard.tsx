"use client";

import { Lightbulb } from "lucide-react";

export function TipsCard() {
  return (
    <div className="p-2 w-full">
      <div className="flex items-center gap-3 mb-3 text-[var(--text-main)]">
        <div className="h-8 w-8 rounded-full border border-[var(--border-main)] flex items-center justify-center bg-[var(--bg-card)]">
          <Lightbulb className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <span className="font-mono-heading text-[12px] opacity-80">TIPS</span>
      </div>
      <ul className="list-disc pl-5 text-[11px] text-[var(--text-main)] space-y-2 marker:text-[var(--text-muted)] font-medium">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
