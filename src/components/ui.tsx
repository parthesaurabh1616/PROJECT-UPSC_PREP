"use client";

import { useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   UI primitives — UPSC PREP OS
   GlowCard · Panel · Tag · StatusDot · Eyebrow · SectionHeader
   ProgressRing · Bar · Divider
   ════════════════════════════════════════════════════════════ */

/* ── GlowCard — signature glass card with mouse-tracking glow ── */
interface GlowCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  hover?: boolean;
  tone?: "amber" | "blue" | "green";
}
export function GlowCard({
  children, className, interactive = true, tone = "amber", ...rest
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const tint =
    tone === "blue"  ? "var(--analyt)" :
    tone === "green" ? "var(--accent-2)" :
                       "var(--accent)";
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (!interactive || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-5",
        "backdrop-blur-xl transition-all duration-500",
        "hover:border-accent/30 hover:bg-surface",
        className,
      )}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: pos
            ? `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgb(${tint} / 0.18), transparent 55%)`
            : `radial-gradient(420px circle at 50% 0%, rgb(${tint} / 0.10), transparent 55%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Panel — solid surface card (sidebars, dense content) ── */
export function Panel({
  children, className, style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* Backwards-compat alias used by existing pages. */
export const Card = GlowCard;

/* ── Eyebrow — small mono label, often above titles ── */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/* ── SectionHeader — gradient divider + eyebrow + display title ── */
export function SectionHeader({
  eyebrow, title, sub, icon, action, align = "left",
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  icon?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("mb-1 flex items-start justify-between gap-4", align === "center" && "flex-col items-center text-center")}>
      <div>
        {eyebrow && (
          <div className={cn("mb-2 flex items-center gap-2.5", align === "center" && "justify-center")}>
            <span className="h-px w-7 bg-gradient-to-r from-accent/0 via-accent to-accent-2" />
            <span className="eyebrow">{eyebrow}</span>
            <span className="h-px w-7 bg-gradient-to-r from-accent-2 via-accent to-accent/0" />
          </div>
        )}
        <h3 className="flex items-center gap-2 font-display text-[15.5px] font-semibold tracking-tight text-ink">
          {icon}
          {title}
        </h3>
        {sub && <p className="mt-0.5 text-[11.5px] text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* Backwards-compat alias */
export const SectionHeading = SectionHeader;

/* ── Tag / Chip ── */
type Intent = "default" | "amber" | "blue" | "green" | "gold" | "danger" | "muted";
const intents: Record<Intent, string> = {
  default: "border-line bg-surface-2/70 text-ink-2",
  amber:   "border-accent/30 bg-accent/10 text-accent",
  blue:    "border-analyt/30 bg-analyt/10 text-analyt",
  green:   "border-accent-2/30 bg-accent-2/10 text-accent-2",
  gold:    "border-gold/30 bg-gold/10 text-gold",
  danger:  "border-danger/30 bg-danger/10 text-danger",
  muted:   "border-line-subtle bg-surface-2/40 text-ink-3",
};
export function Tag({
  children, intent = "default", className,
}: {
  children: ReactNode;
  intent?: Intent;
  className?: string;
}) {
  return <span className={cn("pill", intents[intent], className)}>{children}</span>;
}

/* Backwards-compat: existing pages still call Chip with tone={accent|accent-2|success|warning|danger|muted} */
type ToneAlias = "accent" | "accent-2" | "success" | "warning" | "danger" | "muted";
const toneAlias: Record<ToneAlias, Intent> = {
  accent: "amber", "accent-2": "green", success: "green", warning: "gold", danger: "danger", muted: "muted",
};
export function Chip({
  children, tone = "accent", className,
}: {
  children: ReactNode;
  tone?: ToneAlias;
  className?: string;
}) {
  return <Tag intent={toneAlias[tone]} className={className}>{children}</Tag>;
}

/* ── StatusDot — pulsing live indicator ── */
export function StatusDot({
  variant = "amber", className,
}: {
  variant?: "amber" | "green" | "blue" | "danger";
  className?: string;
}) {
  const map = {
    amber:  "bg-accent  shadow-[0_0_10px_rgb(var(--accent)/.7)]",
    green:  "bg-accent-2 shadow-[0_0_10px_rgb(var(--accent-2)/.7)]",
    blue:   "bg-analyt  shadow-[0_0_10px_rgb(var(--analyt)/.7)]",
    danger: "bg-danger  shadow-[0_0_10px_rgb(var(--danger)/.7)]",
  };
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", map[variant])} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", map[variant])} />
    </span>
  );
}

/* ── ProgressRing ── */
export function ProgressRing({
  value, size = 56, stroke = 7, tone = "amber", children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "amber" | "blue" | "green" | "gold";
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100);
  const colour =
    tone === "blue"  ? "rgb(var(--analyt))" :
    tone === "green" ? "rgb(var(--accent-2))" :
    tone === "gold"  ? "rgb(var(--gold))" :
                       "rgb(var(--accent))";
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={colour} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)",
            filter: `drop-shadow(0 0 6px ${colour})`,
          }} />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

/* ── Linear bar ── */
export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-2 via-accent to-gold transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
