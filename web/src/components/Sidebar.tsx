"use client";

import {
  Activity,
  History,
  Settings,
  Mic2,
  Lightbulb,
  User,
  ChevronDown,
} from "lucide-react";

type Props = {
  backendStatus: "checking" | "online" | "offline";
  device?: string;
};

export function Sidebar({ backendStatus, device }: Props) {
  const isOnline = backendStatus === "online";
  const statusLabel = isOnline ? "online" : backendStatus;

  return (
    <aside className="w-[220px] shrink-0 h-screen sticky top-0 flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-6">
        <div className="flex items-center justify-center h-7 w-7 rounded bg-[#c9a35a]/10 border border-[#c9a35a]/20">
          <Activity className="h-4 w-4 text-[#c9a35a]" />
        </div>
        <span className="font-display text-[20px] tracking-[0.2em] text-[#e8e8e8]">
          VANTA
        </span>
      </div>

      {/* Engine status */}
      <div className="px-5 mb-6">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555] block mb-2 px-1">
          Engine
        </span>
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[#111] rounded-md border border-[#1a1a1a]">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              background: isOnline ? "#a3c16a" : "#d15a5a",
              boxShadow: isOnline ? "0 0 8px #a3c16a" : "none",
            }}
          />
          <span className="font-mono text-[10px] text-[#ccc] uppercase tracking-wider">
            {statusLabel} {device ? `• ${device}` : ""}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-4">
        <NavItem icon={<Mic2 className="h-[18px] w-[18px]" />} label="Extract" active />
        <NavItem icon={<History className="h-[18px] w-[18px]" />} label="History" />
        <NavItem icon={<Settings className="h-[18px] w-[18px]" />} label="Settings" />
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Tip */}
      <div className="mx-4 mb-4 p-4 bg-[#111]/60 rounded-lg border border-[#1a1a1a]/60">
        <div className="flex items-center gap-2 text-[#c9a35a] mb-2">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="font-serif italic text-[11px] font-semibold">Tip</span>
        </div>
        <p className="font-serif text-[11px] leading-relaxed text-[#666]">
          Best results with 5-10s reference audio.
        </p>
      </div>

      {/* User profile */}
      <div className="px-4 py-5 border-t border-[#1a1a1a]/50">
        <div className="flex items-center gap-3 px-1 py-1.5 hover:bg-[#111] rounded-md cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#777] border border-[#222]">
            <User className="h-4 w-4" />
          </div>
          <span className="text-[13px] text-[#ccc] font-medium flex-1">Vanta User</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#555]" />
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
        active
          ? "bg-[#c9a35a]/8 text-[#c9a35a] border border-[#c9a35a]/15"
          : "text-[#777] hover:text-[#ccc] hover:bg-[#111]"
      }`}
    >
      {icon}
      <span className="font-serif text-[14px] font-medium">{label}</span>
    </div>
  );
}
