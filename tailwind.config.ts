import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:         "rgb(var(--bg) / <alpha-value>)",
        "bg-subtle":"rgb(var(--bg-subtle) / <alpha-value>)",
        surface:    "rgb(var(--surface) / <alpha-value>)",
        "surface-2":"rgb(var(--surface-2) / <alpha-value>)",
        line:       "rgb(var(--line) / <alpha-value>)",
        "line-subtle":"rgb(var(--line-subtle) / <alpha-value>)",
        ink:        "rgb(var(--ink) / <alpha-value>)",
        "ink-2":    "rgb(var(--ink-2) / <alpha-value>)",
        "ink-3":    "rgb(var(--ink-3) / <alpha-value>)",
        accent:     "rgb(var(--accent) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        analyt:     "rgb(var(--analyt) / <alpha-value>)",
        gold:       "rgb(var(--gold) / <alpha-value>)",
        success:    "rgb(var(--success) / <alpha-value>)",
        warning:    "rgb(var(--warning) / <alpha-value>)",
        danger:     "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans:      ["var(--font-sans)", "system-ui", "sans-serif"],
        display:   ["var(--font-display)", "system-ui", "sans-serif"],
        editorial: ["var(--font-editorial)", "system-ui", "sans-serif"],
        mono:      ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgb(var(--accent) / 0.18) 0%, transparent 65%)",
        "glow-card":
          "radial-gradient(circle at 50% 0%, rgb(var(--accent) / 0.22), transparent 60%)",
      },
      boxShadow: {
        soft:        "0 2px 16px 0 rgb(0 0 0 / 0.35)",
        "glow-amber":"0 0 24px 4px rgb(var(--gold) / 0.35)",
        "glow-blue": "0 0 24px 4px rgb(var(--accent) / 0.3)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease both",
        "fade-in": "fade-in 0.4s ease both",
        pulse:     "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
