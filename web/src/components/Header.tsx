"use client";

import { History, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync with system preference on mount if no preference stored
    const stored = localStorage.getItem("vanta-theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("vanta-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("vanta-theme", "light");
    }
  };

  return (
    <header className="pl-2 pr-6 py-1 flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-header)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 border-2 border-[var(--text-main)] flex items-center justify-center bg-[var(--bg-card)] shadow-[3px_3px_0_var(--text-main)] relative">
            <div className="absolute inset-0 bg-black/5 animate-pulse opacity-50" />
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="square" 
              strokeLinejoin="miter" 
              className="text-[var(--text-main)] relative z-10"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <span className="font-mono-heading font-black text-[54px] uppercase tracking-wider text-[var(--text-main)] leading-none -ml-1">VANTA</span>
        </div>
      </div>

      <div className="flex items-center gap-3">


        <button 
          onClick={toggleDark}
          className="btn-icon h-10 w-10 flex items-center justify-center"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
