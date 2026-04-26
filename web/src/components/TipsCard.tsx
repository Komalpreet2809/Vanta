"use client";

import { Lightbulb } from "lucide-react";

export function TipsCard() {
  return (
    <div className="card-border p-4 bg-[var(--bg-app)] w-full">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border-main)]/50 text-[var(--text-main)]">
        <Lightbulb className="h-4 w-4 fill-current" />
        <span className="text-[14px] font-black uppercase tracking-wide">Tips</span>
      </div>
      <ul className="list-disc pl-5 text-sm text-[var(--text-main)] space-y-1 marker:text-[var(--text-main)]">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
