"use client";

import { useEffect, useRef } from "react";

/**
 * Animated 3D particle mountain/wave visualization.
 * Renders golden dots on a dark canvas that form undulating mountain peaks.
 * Matches the reference design's top-right visualization exactly.
 */
export function ParticleWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Grid configuration
    const COLS = 80;
    const ROWS = 40;
    const DOT_SIZE_MIN = 0.6;
    const DOT_SIZE_MAX = 1.8;

    // Simplex-like noise using multiple sine waves
    function noise(x: number, z: number, t: number): number {
      return (
        Math.sin(x * 0.3 + t * 0.4) * 0.5 +
        Math.sin(z * 0.5 + t * 0.3) * 0.4 +
        Math.sin((x + z) * 0.2 + t * 0.5) * 0.6 +
        Math.sin(x * 0.7 - z * 0.3 + t * 0.2) * 0.3 +
        Math.cos(x * 0.15 + t * 0.15) * Math.sin(z * 0.4 + t * 0.25) * 0.5
      );
    }

    // Mountain shape envelope — peaks in the middle-back
    function mountainEnvelope(nx: number, nz: number): number {
      // Multiple mountain peaks
      const peak1 = Math.exp(-((nx - 0.35) ** 2) / 0.08 - ((nz - 0.4) ** 2) / 0.12);
      const peak2 = Math.exp(-((nx - 0.6) ** 2) / 0.06 - ((nz - 0.3) ** 2) / 0.08);
      const peak3 = Math.exp(-((nx - 0.5) ** 2) / 0.15 - ((nz - 0.5) ** 2) / 0.2);
      const peak4 = Math.exp(-((nx - 0.75) ** 2) / 0.1 - ((nz - 0.45) ** 2) / 0.15);
      // Rolling hills base
      const base = 0.15;
      return base + peak1 * 0.7 + peak2 * 0.9 + peak3 * 0.5 + peak4 * 0.6;
    }

    let t = 0;

    function draw() {
      const w = canvas!.getBoundingClientRect().width;
      const h = canvas!.getBoundingClientRect().height;

      ctx!.clearRect(0, 0, w, h);

      t += 0.008;

      // 3D projection params
      const viewAngle = 0.55; // tilt
      const perspective = 1.8;

      // Sort back-to-front for proper depth
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const nx = col / COLS;
          const nz = row / ROWS;

          // Height from noise + mountain shape
          const env = mountainEnvelope(nx, nz);
          const n = noise(col * 0.8, row * 0.8, t);
          const height = env * (0.6 + n * 0.4);

          // 3D to 2D projection
          const x3d = (nx - 0.5) * 2;
          const z3d = (nz - 0.3) * 2;
          const y3d = -height * 0.8;

          // Apply perspective
          const zp = z3d * Math.cos(viewAngle) - y3d * Math.sin(viewAngle);
          const yp = z3d * Math.sin(viewAngle) + y3d * Math.cos(viewAngle);
          const depth = perspective / (perspective + zp);

          const screenX = w * 0.5 + x3d * depth * w * 0.45;
          const screenY = h * 0.65 + yp * depth * h * 0.5;

          // Depth-based opacity and size
          const depthFade = Math.max(0, Math.min(1, (depth - 0.4) * 1.5));
          const heightBrightness = 0.3 + height * 0.7;
          const alpha = depthFade * heightBrightness * 0.85;
          const dotSize = DOT_SIZE_MIN + (DOT_SIZE_MAX - DOT_SIZE_MIN) * depth * heightBrightness;

          // Golden color with height-based warmth
          const r = Math.round(180 + height * 75);
          const g = Math.round(130 + height * 50);
          const b = Math.round(40 + height * 30);

          ctx!.beginPath();
          ctx!.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx!.fill();

          // Add glow for bright peaks
          if (height > 0.6 && alpha > 0.5) {
            ctx!.beginPath();
            ctx!.arc(screenX, screenY, dotSize * 2.5, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.12})`;
            ctx!.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
