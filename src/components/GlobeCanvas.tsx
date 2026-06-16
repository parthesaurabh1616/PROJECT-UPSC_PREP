"use client";

import { useEffect, useRef, useCallback } from "react";
import { resolveCoords } from "@/lib/geo/gazetteer";

export interface Article {
  id: string;
  headline: string;
  tags: string[];
  gsMapping: string[];
  priority: string;
  source?: string | null;
  summary?: string | null;
  whyInNews?: string | null;
  background?: string | null;
  keyFacts?: string | null;
  prelims?: string | null;
  mains?: string | null;
  interview?: string | null;
  category?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string;
  importanceScore?: number; // 0-100; when present, drives marker size/colour
  tier?: string;            // critical | high | normal | low
  layer?: string;           // global | india | maharashtra
}

/* ── Geographic coordinate lookup (DB-backed gazetteer) ──────── */
function getCoords(article: Article, seed: number): [number, number] {
  const text = `${article.headline} ${article.tags.join(" ")} ${article.source ?? ""}`;
  return resolveCoords(text, seed, article.layer ?? undefined);
}

/* ── 3-D projection (orthographic) ─────────────────────────── */
function project(
  lat: number, lng: number, rotY: number,
  cx: number, cy: number, R: number,
): { x: number; y: number; z: number; visible: boolean } {
  const TILT = -20 * (Math.PI / 180);
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + rotY) * (Math.PI / 180);

  const px = Math.sin(phi) * Math.cos(theta);
  const py = Math.cos(phi);
  const pz = Math.sin(phi) * Math.sin(theta);

  // Apply axial tilt
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const py2 = py * cosT - pz * sinT;
  const pz2 = py * sinT + pz * cosT;

  return { x: cx + px * R, y: cy - py2 * R, z: pz2, visible: pz2 > 0 };
}

/* ── Helpers ────────────────────────────────────────────────── */
function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

/* ── Component ──────────────────────────────────────────────── */
export function GlobeCanvas({
  articles,
  onSelect,
}: {
  articles: Article[];
  onSelect?: (a: Article) => void;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const rotY        = useRef(0);
  const dragging    = useRef(false);
  const lastX       = useRef(0);
  const hovered     = useRef<number>(-1);
  const coordsCache = useRef<[number, number][]>([]);

  useEffect(() => {
    coordsCache.current = articles.map((a, i) => getCoords(a, i * 37));
  }, [articles]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = Math.min(W, H) * 0.42;
    const t  = Date.now() / 1000;

    ctx.clearRect(0, 0, W, H);

    /* ── Outer atmosphere ── */
    const atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.18);
    atm.addColorStop(0, rgba(59, 130, 246, 0.22));
    atm.addColorStop(0.5, rgba(59, 130, 246, 0.06));
    atm.addColorStop(1,   rgba(59, 130, 246, 0));
    ctx.fillStyle = atm;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
    ctx.fill();

    /* ── Globe body ── */
    const body = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, 0, cx, cy, R);
    body.addColorStop(0,   rgba(17, 26, 54, 1));
    body.addColorStop(0.7, rgba(7,  12, 30, 1));
    body.addColorStop(1,   rgba(3,   6, 18, 1));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    /* ── Grid lines (clipped to sphere) ── */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    ctx.lineWidth = 0.5;
    // Latitudes
    for (let lat = -75; lat <= 75; lat += 15) {
      const isEquator = lat === 0;
      ctx.strokeStyle = isEquator ? rgba(59, 130, 246, 0.18) : rgba(59, 130, 246, 0.07);
      ctx.lineWidth   = isEquator ? 0.8 : 0.4;
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 2) {
        const { x, y, visible } = project(lat, lng, rotY.current, cx, cy, R);
        if (!visible || first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Longitudes
    for (let lng = -180; lng < 180; lng += 15) {
      ctx.strokeStyle = rgba(59, 130, 246, 0.07);
      ctx.lineWidth   = 0.4;
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 2) {
        const { x, y, visible } = project(lat, lng, rotY.current, cx, cy, R);
        if (!visible || first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    /* ── Rim glow ── */
    const rim = ctx.createRadialGradient(cx, cy, R - 8, cx, cy, R);
    rim.addColorStop(0, rgba(59, 130, 246, 0));
    rim.addColorStop(1, rgba(59, 130, 246, 0.28));
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    /* ── Specular highlight ── */
    const spec = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.32, 0, cx, cy, R);
    spec.addColorStop(0,   rgba(255, 255, 255, 0.07));
    spec.addColorStop(0.3, rgba(255, 255, 255, 0.015));
    spec.addColorStop(1,   rgba(255, 255, 255, 0));
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    /* ── News dots ── */
    articles.forEach((article, i) => {
      const [lat, lng] = coordsCache.current[i] ?? [20, 78];
      const { x, y, z, visible } = project(lat, lng, rotY.current, cx, cy, R);
      if (!visible) return;

      const depth  = Math.max(0, (z + 1) / 2);
      const isHov  = hovered.current === i;
      const pulse  = isHov ? 1.5 : 1 + 0.25 * Math.sin(t * 1.8 + i * 0.9);

      // Score-driven mode (Live Actions) vs legacy priority mode (Current Affairs).
      const hasScore = typeof article.importanceScore === "number";
      const tier = article.tier;
      const isHigh = hasScore ? (tier === "critical" || tier === "high") : article.priority === "high";
      const isCritical = hasScore && tier === "critical";

      // Size scales with score (3 → 6.5px) when available.
      const sizeBase = hasScore ? 3 + (article.importanceScore! / 100) * 3.5 : (isHigh ? 5 : 3.5);
      const baseR  = sizeBase * depth;
      const dotR   = baseR * pulse;
      const glowR  = dotR * (isHov ? 8 : 5);

      // Colour by tier: critical=red, high=amber, normal=blue, low=slate. Hover=purple.
      let cr = 59, cg = 130, cb = 246;
      if (isHov) { cr = 139; cg = 92; cb = 246; }
      else if (hasScore) {
        if (tier === "critical") { cr = 239; cg = 68; cb = 68; }
        else if (tier === "high") { cr = 245; cg = 158; cb = 11; }
        else if (tier === "low") { cr = 100; cg = 116; cb = 139; }
      } else if (isHigh) { cr = 239; cg = 68; cb = 68; }

      // Outer glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      glow.addColorStop(0, rgba(cr, cg, cb, 0.45 * depth));
      glow.addColorStop(1, rgba(cr, cg, cb, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = rgba(cr, cg, cb, 0.9 * depth);
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();

      // White centre for the loudest events
      if ((isCritical || (!hasScore && isHigh)) && depth > 0.5) {
        ctx.fillStyle = rgba(255, 255, 255, 0.7 * depth);
        ctx.beginPath();
        ctx.arc(x, y, dotR * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (!dragging.current) rotY.current += 0.08;
    animRef.current = requestAnimationFrame(render);
  }, [articles]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  /* ── Interaction helpers ── */
  function getHitIndex(e: React.MouseEvent): number {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const R  = Math.min(canvas.width, canvas.height) * 0.42;

    let best = -1, bestD = 18;
    articles.forEach((_, i) => {
      const [lat, lng] = coordsCache.current[i] ?? [20, 78];
      const { x, y, visible } = project(lat, lng, rotY.current, cx, cy, R);
      if (!visible) return;
      const d = Math.hypot(mx - x, my - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={420}
      className="cursor-grab active:cursor-grabbing select-none"
      onMouseDown={(e) => { dragging.current = true; lastX.current = e.clientX; }}
      onMouseMove={(e) => {
        if (dragging.current) { rotY.current += (e.clientX - lastX.current) * 0.35; lastX.current = e.clientX; }
        hovered.current = getHitIndex(e);
      }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; hovered.current = -1; }}
      onClick={(e) => {
        const idx = getHitIndex(e);
        if (idx >= 0 && onSelect) onSelect(articles[idx]);
      }}
    />
  );
}
