/* Two visual identities that belong to one application (directive §38).
   PSIR = ideas, power, institutions, networks — warm amber on near-black.
   GEOGRAPHY = Earth, space, movement, process — cool cyan on deep navy.
   Clarity outranks cinematics: restrained palette, strong hierarchy. */

export type SubjectKey = "PSIR" | "GEOGRAPHY";

export interface Theme {
  bg: string; bgSoft: string; grid: string;
  ink: string; ink2: string; ink3: string;
  accent: string; accent2: string; warn: string; good: string;
  line: string;
}

export const THEMES: Record<SubjectKey, Theme> = {
  GEOGRAPHY: {
    bg: "#05080F", bgSoft: "#0B1220", grid: "rgba(120,190,255,0.055)",
    ink: "#EAF2FF", ink2: "#A9BDD6", ink3: "#61748C",
    accent: "#4CC9F0", accent2: "#FFB703", warn: "#FF6B6B", good: "#4ADE80",
    line: "rgba(120,190,255,0.16)",
  },
  PSIR: {
    bg: "#08070A", bgSoft: "#12101A", grid: "rgba(255,190,120,0.05)",
    ink: "#F5EFE6", ink2: "#C9BCA8", ink3: "#7C6F60",
    accent: "#F0A500", accent2: "#8AB4F8", warn: "#FF6B6B", good: "#4ADE80",
    line: "rgba(255,190,120,0.16)",
  },
};

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
