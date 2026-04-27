"use client";

import { Moon, Sun, RefreshCw, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function Header({ 
  onReset, 
  onStartTour 
}: { 
  onReset?: () => void;
  onStartTour?: () => void;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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
    <header className="px-8 py-4 flex items-center justify-between bg-transparent">
      <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="var(--text-main)" 
            >
              <path d="M12 2L4 12h16L12 2z" />
              <rect x="6" y="14" width="12" height="1.5" />
              <rect x="8" y="17.5" width="8" height="1.5" />
              <rect x="11" y="21" width="2" height="1.5" />
            </svg>
          </div>
          <span className="text-[28px] font-black tracking-[0.1em] text-[var(--text-main)] uppercase leading-none">VANTA</span>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onStartTour}
          className="vanta-btn w-10 h-10"
          aria-label="Start guided tour"
          title="How to use Vanta"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <button 
          onClick={onReset}
          className="vanta-btn w-10 h-10"
          aria-label="Reset session"
          title="Clear all inputs and results"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        <button 
          onClick={toggleDark}
          className="vanta-btn w-10 h-10"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
