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
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <svg 
              width="44" 
              height="44" 
              viewBox="0 0 24 24" 
              fill="var(--text-main)" 
              className="text-[var(--text-main)]"
            >
              {/* Unique 'Diamond Signal' mark */}
              {/* The Prism / Focus Top */}
              <path d="M12 2L4 12h16L12 2z" />
              {/* The Isolated Signal Bars */}
              <rect x="6" y="14" width="12" height="1.5" />
              <rect x="8" y="17.5" width="8" height="1.5" />
              <rect x="11" y="21" width="2" height="1.5" />
            </svg>
          </div>
          <span className="font-mono-heading font-black text-[54px] uppercase tracking-wider text-[var(--text-main)] leading-none -ml-2">VANTA</span>
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
