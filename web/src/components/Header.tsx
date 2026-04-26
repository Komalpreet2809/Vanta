"use client";

import { History, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="px-10 py-6 border-b border-[var(--border-strong)] flex items-center justify-between bg-[var(--bg-card)]">
      <div className="flex items-center gap-4">
        {/* Concept 1: Signal Flow V Logo */}
        <svg className="h-12 w-12 text-[var(--text)]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 24h6l6-16 8 32 8-20 4 8h8" />
          <path d="M14 16l8 16 8-16" className="opacity-30" />
        </svg>
        <span className="text-[30px] font-bold tracking-[0.6em] uppercase">Vanta</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="industrial-button px-6 py-2.5 text-[11px] font-bold uppercase flex items-center gap-2 bg-[var(--bg-page)] shadow-inner">
          <History className="h-4 w-4" />
          History
        </button>
        <button className="industrial-button px-6 py-2.5 text-[11px] font-bold uppercase flex items-center gap-2 bg-[var(--bg-page)] shadow-inner">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </header>
  );
}
