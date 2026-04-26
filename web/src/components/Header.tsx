"use client";

import { History, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-main)]">
      <div className="flex items-center gap-3">
        {/* Waveform Logo */}
        <div className="flex items-center gap-[3px] h-7 mr-1">
          {[0.3, 0.5, 0.8, 1, 0.7, 0.4, 0.6].map((h, i) => (
            <div key={i} className="w-[3px] bg-[var(--text-main)] rounded-sm" style={{ height: `${h * 100}%` }} />
          ))}
        </div>
        <span className="font-mono-heading font-black text-3xl uppercase">Vanta</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-icon px-4 py-1.5 text-xs font-mono font-bold gap-2">
          <History className="h-3.5 w-3.5" />
          History
        </button>
        <button className="btn-icon px-4 py-1.5 text-xs font-mono font-bold gap-2">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </header>
  );
}
