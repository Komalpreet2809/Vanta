"use client";

import { Lightbulb } from "lucide-react";

export function TipsCard() {
  return (
    <div className="card-border p-4 bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 mb-2 text-[var(--text-main)]">
        <Lightbulb className="h-4 w-4 fill-current" />
        <span className="text-sm font-bold uppercase tracking-wide">Tips</span>
      </div>
      <ul className="list-disc pl-5 text-sm text-[var(--text-main)] space-y-1 marker:text-[var(--text-main)]">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
