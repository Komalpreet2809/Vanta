"use client";

import { motion } from "motion/react";

/** Realistic-ish cassette tape illustration matching the reference image's
 *  dark plastic body, two visible reels, label area, see-through tape window. */
export function CassetteSvg({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 220 130"
      xmlns="http://www.w3.org/2000/svg"
      className="block w-full h-full"
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2218" />
          <stop offset="60%" stopColor="#15110d" />
          <stop offset="100%" stopColor="#0a0805" />
        </linearGradient>
        <radialGradient id="reelGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3a2e1f" />
          <stop offset="60%" stopColor="#1a130d" />
          <stop offset="100%" stopColor="#0a0604" />
        </radialGradient>
        <linearGradient id="labelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3a26" />
          <stop offset="100%" stopColor="#2c2218" />
        </linearGradient>
        <radialGradient id="hubGrad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#e7c980" />
          <stop offset="100%" stopColor="#7a5a30" />
        </radialGradient>
      </defs>

      {/* outer body */}
      <rect
        x="2" y="6" width="216" height="118" rx="6"
        fill="url(#bodyGrad)"
        stroke="#1a130d" strokeWidth="0.8"
      />
      {/* top highlight line */}
      <rect x="4" y="8" width="212" height="1" fill="rgba(255,220,160,0.08)" />

      {/* corner screws */}
      {[{x:11,y:15},{x:209,y:15},{x:11,y:115},{x:209,y:115}].map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          <circle r="4" fill="#1a130d" />
          <circle r="3.2" fill="url(#reelGrad)" />
          <circle r="2.8" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="0.4" />
          <line x1="-2" y1="0.5" x2="2" y2="-0.5" stroke="rgba(0,0,0,0.7)" strokeWidth="0.6" />
        </g>
      ))}

      {/* label area at top */}
      <rect
        x="22" y="20" width="176" height="34" rx="2"
        fill="url(#labelGrad)"
        stroke="#0a0604" strokeWidth="0.5"
      />
      {/* label tick marks */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1={28 + i * 22}
          y1={50}
          x2={28 + i * 22}
          y2={52}
          stroke="rgba(232,220,196,0.35)"
          strokeWidth="0.6"
        />
      ))}

      {/* see-through window (the "tape view") */}
      <rect
        x="22" y="60" width="176" height="50" rx="2"
        fill="#0d0907"
        stroke="#0a0604" strokeWidth="0.5"
      />
      {/* inner window highlight */}
      <rect x="24" y="62" width="172" height="0.6" fill="rgba(255,220,160,0.08)" />

      {/* tape strip stretched between reels */}
      <line
        x1="74" y1="85" x2="146" y2="85"
        stroke="#3a2c1c" strokeWidth="2.5" strokeLinecap="round"
      />
      <line
        x1="74" y1="85" x2="146" y2="85"
        stroke="#5a4a30" strokeWidth="0.6" strokeLinecap="round" opacity="0.5"
      />

      {/* LEFT reel */}
      <g transform="translate(60,85)">
        <circle r="22" fill="#0a0604" />
        <motion.g
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: spinning ? Infinity : 0, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        >
          <circle r="20" fill="url(#reelGrad)" />
          <circle r="20" fill="none" stroke="#0a0604" strokeWidth="0.8" />
          {/* spokes */}
          {[0, 60, 120].map((deg) => (
            <line
              key={deg}
              x1={-18} y1={0} x2={18} y2={0}
              stroke="#3a2c1c" strokeWidth="2.5"
              transform={`rotate(${deg})`}
            />
          ))}
          {/* tape spool ring */}
          <circle r="14" fill="none" stroke="#1a130d" strokeWidth="2" />
          {/* hub */}
          <circle r="5" fill="url(#hubGrad)" />
          <circle r="5" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.4" />
          {/* hub teeth */}
          {[0, 90, 180, 270].map((deg) => (
            <rect
              key={deg}
              x="-0.6" y="-3.5" width="1.2" height="2"
              fill="#2a2110"
              transform={`rotate(${deg})`}
            />
          ))}
        </motion.g>
      </g>

      {/* RIGHT reel */}
      <g transform="translate(160,85)">
        <circle r="22" fill="#0a0604" />
        <motion.g
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: spinning ? Infinity : 0, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        >
          <circle r="20" fill="url(#reelGrad)" />
          <circle r="20" fill="none" stroke="#0a0604" strokeWidth="0.8" />
          {[0, 60, 120].map((deg) => (
            <line
              key={deg}
              x1={-18} y1={0} x2={18} y2={0}
              stroke="#3a2c1c" strokeWidth="2.5"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r="14" fill="none" stroke="#1a130d" strokeWidth="2" />
          <circle r="5" fill="url(#hubGrad)" />
          <circle r="5" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.4" />
          {[0, 90, 180, 270].map((deg) => (
            <rect
              key={deg}
              x="-0.6" y="-3.5" width="1.2" height="2"
              fill="#2a2110"
              transform={`rotate(${deg})`}
            />
          ))}
        </motion.g>
      </g>
    </svg>
  );
}
