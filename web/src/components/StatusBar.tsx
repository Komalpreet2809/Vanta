"use client";

type Props = {
  backend: "checking" | "online" | "offline";
};

export function StatusBar({ backend }: Props) {
  return (
    <footer className="flex items-center justify-between px-8 py-3 border-t border-[var(--border)] text-[11px] text-[var(--text-dim)]">
      <span className="font-medium tracking-wider">VANTA v1.0.0</span>
      <div className="flex items-center gap-2">
        <span
          className={`block h-2 w-2 rounded-full ${
            backend === "online"
              ? "bg-[var(--ok)]"
              : backend === "offline"
                ? "bg-[var(--err)]"
                : "bg-[var(--text-faint)]"
          }`}
        />
        <span className="font-medium">
          {backend === "online"
            ? "Ready"
            : backend === "offline"
              ? "Offline"
              : "Connecting"}
        </span>
      </div>
    </footer>
  );
}
