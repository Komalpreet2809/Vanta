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
    <header className="px-6 py-4 flex items-center justify-between bg-[var(--bg-header)] shadow-sm">
      <div className="flex items-center gap-3">
        {/* Waveform Logo */}
        <div className="flex items-center gap-[3px] h-7 mr-1">
          {[0.3, 0.5, 0.8, 1, 0.7, 0.4, 0.6].map((h, i) => (
            <div key={i} className="w-[3px] bg-[var(--text-main)] rounded-sm" style={{ height: `${h * 100}%` }} />
          ))}
        </div>
        <span className="font-mono-heading font-black text-3xl uppercase tracking-tight">Vanta</span>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={toggleDark}
          className="btn-icon h-9 w-9"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="btn-icon px-4 py-1.5 text-xs font-mono font-bold gap-2">
          <History className="h-3.5 w-3.5" />
          History
        </button>
      </div>
    </header>
  );
}
