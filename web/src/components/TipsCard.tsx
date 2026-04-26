"use client";

import { Lightbulb, MoreHorizontal } from "lucide-react";

export function TipsCard() {
  return (
    <div className="card-border p-4 bg-[var(--bg-card)] w-full">
      <div className="flex items-center justify-between pb-1 mb-2">
        <div className="flex items-center gap-2.5 text-[var(--text-main)]">
          <div className="h-8 w-8 rounded-full border border-[var(--border-card)] flex items-center justify-center bg-black/5 dark:bg-white/5">
            <Lightbulb className="h-4 w-4 fill-current opacity-70" />
          </div>
          <span className="font-mono-heading text-[13px] font-black uppercase tracking-tight text-[var(--c-green)]">TIPS</span>
        </div>
        <MoreHorizontal className="h-4 w-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" />
      </div>
      <ul className="list-disc pl-5 text-[12px] text-[var(--text-main)] space-y-1.5 marker:text-[var(--text-main)] font-medium opacity-80">
        <li>Supports WAV, MP3, M4A</li>
        <li>Recommended: 5–30 seconds</li>
      </ul>
    </div>
  );
}
