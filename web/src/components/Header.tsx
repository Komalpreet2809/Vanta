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
        <div className="flex items-center gap-4">
          <svg 
            width="52" 
            height="52" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--text-main)" 
            strokeWidth="2.2" 
            strokeLinecap="square" 
            strokeLinejoin="miter" 
            className="text-[var(--text-main)] shrink-0"
          >
            {/* High-Stroke Mic Capsule */}
            <rect x="8.5" y="2" width="7" height="11" rx="3.5" strokeWidth="2.5" />
            
            {/* Technical Slits */}
            <line x1="11" y1="5" x2="13" y2="5" strokeWidth="1" />
            <line x1="11" y1="8" x2="13" y2="8" strokeWidth="1" />
            
            {/* Cradle & Heavy Base */}
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" strokeWidth="1.5" />
            
            {/* Sharp, Precise Waveform */}
            <path 
              d="M2 12h4l1.5-4 1.5 8 1.5-4h4" 
              strokeWidth="1.8"
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
