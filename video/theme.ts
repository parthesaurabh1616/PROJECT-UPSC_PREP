/* Two visual identities that belong to one application (directive §38).
   PSIR = ideas, power, institutions, networks — warm amber on near-black.
   GEOGRAPHY = Earth, space, movement, process — cool cyan on deep navy.
   Clarity outranks cinematics: restrained palette, strong hierarchy. */

import { getSubject } from "../src/lib/visual/subjects";

export type SubjectKey = string;

export interface Theme {
  bg: string; bgSoft: string; grid: string;
  ink: string; ink2: string; ink3: string;
  accent: string; accent2: string; warn: string; good: string;
  line: string;
}

/* Palettes live in the subject registry so a new subject brings its own
   identity with it, rather than needing an edit here. */
export const THEMES: Record<string, Theme> = new Proxy({} as Record<string, Theme>, {
  get: (_t, key: string) => getSubject(key).theme,
});

export const FONT = {
  display: "'Rajdhani', 'Segoe UI', system-ui, sans-serif",
  body: "'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "'Consolas', 'SF Mono', ui-monospace, monospace",
};

export const SAFE = 96;          // edge padding, 1920×1080
export const FPS = 30;

/** Faint engineering grid — carries depth without competing with content. */
export function gridBackground(t: Theme): React.CSSProperties {
  return {
    backgroundColor: t.bg,
    backgroundImage:
      `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
    backgroundSize: "64px 64px",
  };
}

/** Label styling used for every eyebrow/tag so the system reads as one thing. */
export function eyebrow(t: Theme): React.CSSProperties {
  return {
    fontFamily: FONT.mono, fontSize: 20, letterSpacing: "0.22em",
    textTransform: "uppercase", color: t.ink3,
  };
}
