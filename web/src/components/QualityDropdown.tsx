"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type Quality = "high" | "balanced" | "fast";

const OPTIONS: { value: Quality; label: string; hint: string }[] = [
  { value: "high", label: "High Quality (Slow)", hint: "Best separation quality" },
  { value: "balanced", label: "Balanced", hint: "Good quality, faster" },
  { value: "fast", label: "Fast", hint: "Lower quality, fastest" },
];

type Props = {
  value: Quality;
  onChange: (q: Quality) => void;
};

export function QualityDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center gap-3">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-input)] px-4 py-2 text-[13px] text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
        >
          <span>{current.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--text-dim)] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open ? (
          <div className="absolute bottom-full left-0 mb-2 w-[260px] rounded-md border border-[var(--border-strong)] bg-[var(--bg-card-2)] shadow-lg overflow-hidden z-10">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-[var(--bg-input)] transition-colors ${
                  opt.value === value
                    ? "text-[var(--accent)]"
                    : "text-[var(--text)]"
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <span className="text-[13px] text-[var(--text-dim)]">{current.hint}</span>
    </div>
  );
}
