"use client";

import { Lightbulb } from "lucide-react";

export function TipsCard() {
  return (
    <div className="card-border p-4 bg-[var(--bg-app)] w-full">
      <div className="flex items-center gap-2 pb-1 mb-2 text-[var(--text-main)]">
        <Lightbulb className="h-4 w-4 fill-current" />
        <span className="text-[13px] font-black uppercase tracking-tight opacity-90">Tips</span>
      </div>
      <ul className="list-disc pl-5 text-[12px] text-[var(--text-main)] space-y-1.5 marker:text-[var(--text-main)] font-medium opacity-80">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
