"use client";

import { History, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-end gap-[2px] h-4">
          {[0.4, 0.7, 1, 0.7, 0.4, 0.6].map((h, i) => (
            <span
              key={i}
              className="w-[2px] bg-[var(--text)] rounded-sm"
              style={{ height: `${h * 16}px` }}
            />
          ))}
        </div>
        <span className="font-bold text-[18px] tracking-[0.16em] uppercase text-[var(--text)]">
          Vanta
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[12px] text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[12px] text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-input)]"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </header>
  );
}
