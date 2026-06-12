"use client";

import { useEffect, useRef } from "react";

// Fixed seed-based dot positions (stable across renders, no random drift)
const DOTS: [number, number][] = [
  [20.59, 78.96],   // India (primary)
  [28.61, 77.21],   // Delhi
  [35.86, 104.19],  // China
  [37.09, -95.71],  // USA
  [61.52, 105.32],  // Russia
  [48.38, 31.17],   // Ukraine
  [30.38, 69.35],   // Pakistan
  [1.35,  103.82],  // ASEAN
  [29.30, 42.55],   // Middle East
  [8.78,  34.51],   // Africa
  [54.52, 15.26],   // Europe
  [51.17, 10.45],   // Germany
  [-33.87, 151.21], // Australia
  [-15.78, -47.93], // Brazil
];

function project(lat: number, lng: number, rotY: number, cx: number, cy: number, R: number) {
  const TILT = -20 * (Math.PI / 180);
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + rotY) * (Math.PI / 180);

  const px = Math.sin(phi) * Math.cos(theta);
  const py = Math.cos(phi);
  const pz = Math.sin(phi) * Math.sin(theta);

  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const py2 = py * cosT - pz * sinT;
  const pz2 = py * sinT + pz * cosT;

  return { x: cx + px * R, y: cy - py2 * R, z: pz2, visible: pz2 > 0 };
}

export function MiniGlobe({ size = 40 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const rotY      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    canvas.width  = size * DPR;
    canvas.height = size * DPR;
    ctx.scale(DPR, DPR);

    const cx = size / 2;
    const cy = size / 2;
    const R  = size * 0.42;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      const t = Date.now() / 1000;

      // Outer atmosphere
      const atm = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.22);
      atm.addColorStop(0, "rgba(59,130,246,0.20)");
      atm.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = atm;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();

      // Globe body
      const body = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, 0, cx, cy, R);
      body.addColorStop(0,   "rgba(17,26,54,1)");
      body.addColorStop(0.7, "rgba(7,12,30,1)");
      body.addColorStop(1,   "rgba(3,6,18,1)");
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Rim glow
      const rim = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R);
      rim.addColorStop(0, "rgba(59,130,246,0)");
      rim.addColorStop(1, "rgba(59,130,246,0.30)");
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      spec.addColorStop(0,   "rgba(255,255,255,0.07)");
      spec.addColorStop(0.4, "rgba(255,255,255,0.01)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Subtle latitude lines (equator only at small size)
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = "rgba(59,130,246,0.12)";
      ctx.lineWidth = 0.4;
      for (const lat of [0, 30, -30]) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 5) {
          const p = project(lat, lng, rotY.current, cx, cy, R);
          if (!p.visible || first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // News dots
      DOTS.forEach(([lat, lng], i) => {
        const { x, y, z, visible } = project(lat, lng, rotY.current, cx, cy, R);
        if (!visible) return;
        const depth = Math.max(0, (z + 1) / 2);
        const pulse = 1 + 0.25 * Math.sin(t * 2 + i * 0.8);
        const r     = 1.4 * depth * pulse;
        const glowR = r * 5;
        const isIndia = i === 0; // India highlighted

        const [cr, cg, cb] = isIndia ? [245, 158, 11] : [59, 130, 246];

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 * depth})`);
        glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.9 * depth})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });

      rotY.current += 0.07;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="shrink-0"
    />
  );
}
