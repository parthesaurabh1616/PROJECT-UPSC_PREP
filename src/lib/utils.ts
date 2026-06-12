import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (resolves conflicts). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Whole days between now and a target date (never negative). */
export function daysUntil(target: Date | string): number {
  const t = typeof target === "string" ? new Date(target) : target;
  const ms = t.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** "Sun, 23 May 2027" */
export function formatLongDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
