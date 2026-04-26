"use client";

import { Info } from "lucide-react";

export function TipsCard() {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-3.5 w-3.5 text-[var(--text-soft)]" />
        <span className="font-bold text-[11px] tracking-[0.16em] uppercase text-[var(--text-soft)]">
          Tips
        </span>
      </div>
      <ul className="space-y-1 text-[12px] text-[var(--text-dim)]">
        <li className="flex items-center gap-2">
          <span className="block h-1 w-1 rounded-full bg-[var(--text-faint)]" />
          Supports WAV, MP3, M4A
        </li>
        <li className="flex items-center gap-2">
          <span className="block h-1 w-1 rounded-full bg-[var(--text-faint)]" />
          Recommended: 5–30 seconds
        </li>
      </ul>
    </div>
  );
}
