"use client";

import { History, Moon, Settings, Sun } from "lucide-react";
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
    <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-header)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Vanta Logo" className="h-10 w-auto" />
          <span className="font-mono-heading font-black text-[28px] uppercase tracking-[0.3em] text-[var(--c-green)] leading-none">VANTA</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-icon h-10 px-4 flex items-center gap-2 font-mono-heading text-[11px] uppercase tracking-wider">
          <History className="h-4 w-4" />
          <span>History</span>
        </button>
        <button className="btn-icon h-10 px-4 flex items-center gap-2 font-mono-heading text-[11px] uppercase tracking-wider">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
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
