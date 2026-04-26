"use client";

import { useEffect, useRef } from "react";

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

    // Mouse interaction state
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Normalize from -1 to 1
      targetMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetMouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    
    const handleMouseLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Grid configuration
    const COLS = 130;
    const ROWS = 65;
    const DOT_SIZE = 0.8;

    function noise(x: number, z: number, t: number): number {
      return (
        Math.sin(x * 0.4 + t * 0.3) * 0.4 +
        Math.sin(z * 0.6 + t * 0.2) * 0.3 +
        Math.cos((x + z) * 0.2 + t * 0.4) * 0.5
      );
    }

    function mountainEnvelope(nx: number, nz: number): number {
      const peak1 = Math.exp(-((nx - 0.4) ** 2) / 0.05 - ((nz - 0.5) ** 2) / 0.1);
      const peak2 = Math.exp(-((nx - 0.7) ** 2) / 0.08 - ((nz - 0.4) ** 2) / 0.1);
      const peak3 = Math.exp(-((nx - 0.5) ** 2) / 0.15 - ((nz - 0.6) ** 2) / 0.15);
      return 0.1 + peak1 * 0.8 + peak2 * 0.6 + peak3 * 0.4;
    }

    let t = 0;

    function draw() {
      const w = canvas!.getBoundingClientRect().width;
      const h = canvas!.getBoundingClientRect().height;

      ctx!.clearRect(0, 0, w, h);

      t += 0.01;

      // Smoothly interpolate mouse position
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Base 3D projection params modified by mouse
      const viewAngle = 0.6 + currentMouseY * 0.15; // tilt
      const perspective = 1.6;
      const rotationY = currentMouseX * 0.2; // slight horizontal rotation

      // Pre-calculate points to allow drawing connecting lines
      const points: { x: number, y: number, alpha: number, depth: number }[][] = [];

      for (let row = 0; row < ROWS; row++) {
        points[row] = [];
        for (let col = 0; col < COLS; col++) {
          const nx = col / COLS;
          const nz = row / ROWS;

          const env = mountainEnvelope(nx, nz);
          const n = noise(col * 0.6, row * 0.6, t);
          const height = env * (0.5 + n * 0.5);

          // 3D to 2D projection
          let x3d = (nx - 0.5) * 2;
          let z3d = (nz - 0.4) * 2;
          const y3d = -height * 0.9;

          // Apply horizontal rotation (mouse interaction)
          const rx3d = x3d * Math.cos(rotationY) - z3d * Math.sin(rotationY);
          const rz3d = x3d * Math.sin(rotationY) + z3d * Math.cos(rotationY);
          x3d = rx3d;
          z3d = rz3d;

          // Apply perspective tilt
          const zp = z3d * Math.cos(viewAngle) - y3d * Math.sin(viewAngle);
          const yp = z3d * Math.sin(viewAngle) + y3d * Math.cos(viewAngle);
          const depth = perspective / (perspective + zp);

          const screenX = w * 0.5 + x3d * depth * w * 0.45;
          const screenY = h * 0.6 + yp * depth * h * 0.5;

          const depthFade = Math.max(0, Math.min(1, (depth - 0.5) * 2));
          const heightBrightness = 0.2 + height * 0.8;
          const alpha = depthFade * heightBrightness * 0.6;

          points[row].push({ x: screenX, y: screenY, alpha, depth });
        }
      }

      // Draw mesh lines first (behind dots)
      ctx!.lineWidth = 0.5;
      for (let row = 0; row < ROWS - 1; row++) {
        for (let col = 0; col < COLS - 1; col++) {
          const p = points[row][col];
          const right = points[row][col + 1];
          const bottom = points[row + 1][col];

          // Only draw lines if points are visible enough to form a "mesh peak"
          if (p.alpha > 0.15) {
            ctx!.strokeStyle = `rgba(191, 163, 115, ${p.alpha * 0.3})`;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(right.x, right.y);
            ctx!.stroke();

            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(bottom.x, bottom.y);
            ctx!.stroke();
          }
        }
      }

      // Draw dots
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p = points[row][col];
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, DOT_SIZE * p.depth, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(191, 163, 115, ${p.alpha})`;
          ctx!.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: "block" }}
    />
  );
}
