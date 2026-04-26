"use client";

import { History, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="px-10 py-6 border-b border-[var(--border-strong)] flex items-center justify-between bg-[var(--bg-card)]/50">
      <div className="flex items-center gap-4">
        {/* Waveform Bars Logo from Inspo */}
        <div className="flex items-end gap-1 mb-1">
          {[0.3, 0.6, 1, 0.7, 0.4].map((h, i) => (
            <div key={i} className="w-1.5 bg-[var(--text)]" style={{ height: h * 24 }} />
          ))}
        </div>
        <span className="text-[30px] font-bold tracking-[0.55em] uppercase text-[var(--text)]">Vanta</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="industrial-button px-6 py-2.5 text-[11px] font-bold uppercase flex items-center gap-2 bg-[var(--bg-page)]/80 shadow-inner">
          <History className="h-4 w-4" />
          History
        </button>
        <button className="industrial-button px-6 py-2.5 text-[11px] font-bold uppercase flex items-center gap-2 bg-[var(--bg-page)]/80 shadow-inner">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </header>
  );
}
