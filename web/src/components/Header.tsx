"use client";

import { History, Moon, Sun, Mic } from "lucide-react";
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
        <div className="flex items-center gap-3">
          <svg 
            width="44" 
            height="44" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--text-main)" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-[var(--text-main)] shrink-0"
          >
            {/* Mic Capsule */}
            <path d="M12 2a3.5 3.5 0 0 0-3.5 3.5v6a3.5 3.5 0 0 0 7 0v-6A3.5 3.5 0 0 0 12 2z" />
            
            {/* Mic Slits (Right side like image) */}
            <line x1="13.5" y1="5.5" x2="15" y2="5.5" strokeWidth="1" />
            <line x1="13.5" y1="8.5" x2="15" y2="8.5" strokeWidth="1" />
            
            {/* Cradle & Stand */}
            <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="9" y1="22" x2="15" y2="22" />
            
            {/* Jagged Waveform (matches image pattern) */}
            <path 
              d="M2 13h2.5l1.5-3.5 2 7 2.5-9.5 2.5 12.5 2.5-10.5 2.5 7.5 2-3.5h2" 
              strokeWidth="1.5"
              strokeLinejoin="miter"
              className="opacity-100"
            />
          </svg>
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
