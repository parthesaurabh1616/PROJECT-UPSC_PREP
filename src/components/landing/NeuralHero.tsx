"use client";

/**
 * NeuralHero — cinematic preparation topology background.
 * Layered SVG: floating concept nodes + connecting links + glow orbs.
 * Pure CSS animation, no Three.js needed.
 */

import { useMemo } from "react";

interface Node { id: string; label: string; x: number; y: number; r: number; ring: number; }

function buildGraph() {
  // Concept clusters around the canvas (1400x800 viewBox).
  const nodes: Node[] = [
    { id: "core",  label: "UPSC PREP OS",   x: 700, y: 410, r: 22, ring: 0 },
    // ring 1 — major modules
    { id: "polity",label: "Polity",          x: 380, y: 270, r: 11, ring: 1 },
    { id: "geo",   label: "Geography",       x: 1020,y: 270, r: 11, ring: 1 },
    { id: "hist",  label: "History",         x: 300, y: 470, r: 11, ring: 1 },
    { id: "econ",  label: "Economy",         x: 1100,y: 470, r: 11, ring: 1 },
    { id: "env",   label: "Environment",     x: 460, y: 620, r: 10, ring: 1 },
    { id: "ethics",label: "Ethics",          x: 940, y: 620, r: 10, ring: 1 },
    { id: "ir",    label: "Intl. Relations", x: 700, y: 220, r: 11, ring: 1 },
    { id: "soc",   label: "Sociology",       x: 700, y: 640, r: 10, ring: 1 },
    // ring 2 — current affairs and intelligence
    { id: "ca",    label: "Current Affairs", x: 200, y: 360, r: 9,  ring: 2 },
    { id: "pyq",   label: "PYQ Vault",       x: 1200,y: 360, r: 9,  ring: 2 },
    { id: "rev",   label: "Revision",        x: 160, y: 560, r: 9,  ring: 2 },
    { id: "test",  label: "Tests",           x: 1240,y: 560, r: 9,  ring: 2 },
    { id: "ai",    label: "AI Mentor",       x: 700, y: 110, r: 11, ring: 2 },
    { id: "notes", label: "Notes",           x: 700, y: 740, r: 10, ring: 2 },
    // ring 3 — outer signals
    { id: "kesav", label: "Kesavananda",     x: 90,  y: 220, r: 7, ring: 3 },
    { id: "njac",  label: "NJAC",            x: 1310,y: 220, r: 7, ring: 3 },
    { id: "mpc",   label: "MPC · RBI",       x: 100, y: 700, r: 7, ring: 3 },
    { id: "cbam",  label: "CBAM",            x: 1300,y: 700, r: 7, ring: 3 },
    { id: "bhakti",label: "Bhakti–Sufi",     x: 380, y: 140, r: 7, ring: 3 },
    { id: "monsoon",label:"Monsoon system",  x: 1020,y: 140, r: 7, ring: 3 },
  ];

  // Links — primary spokes + a few cross-links to feel organic.
  const links: [string, string][] = [
    ["core","polity"],["core","geo"],["core","hist"],["core","econ"],
    ["core","env"],["core","ethics"],["core","ir"],["core","soc"],
    ["core","ai"],["core","notes"],
    ["polity","kesav"],["polity","njac"],["polity","ca"],
    ["econ","mpc"],["econ","cbam"],["geo","monsoon"],
    ["hist","bhakti"],["hist","rev"],["soc","rev"],
    ["env","ethics"],["ir","cbam"],["ai","pyq"],["ai","test"],
    ["notes","ca"],["notes","rev"],["polity","pyq"],
    ["hist","pyq"],["econ","test"],["ir","ai"],
  ];
  return { nodes, links };
}

export function NeuralHero() {
  const { nodes, links } = useMemo(buildGraph, []);
  const byId = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Hero radial glow */}
      <div className="absolute inset-0 bg-hero-glow" />

      {/* Distant blur orbs */}
      <div className="absolute -left-1/4 top-1/2 h-[640px] w-[640px] -translate-y-1/2 rounded-full bg-accent/10 blur-[140px]" />
      <div className="absolute -right-1/4 top-1/3 h-[520px] w-[520px] rounded-full bg-accent-2/10 blur-[130px]" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-analyt/8 blur-[120px]" />

      {/* The neural graph */}
      <svg
        viewBox="0 0 1400 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full mask-radial opacity-90"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgb(var(--accent))" stopOpacity="0.6" />
            <stop offset="60%" stopColor="rgb(var(--accent))" stopOpacity="0.0" />
          </radialGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgb(var(--accent))" stopOpacity="0.85" />
            <stop offset="55%" stopColor="rgb(var(--accent))" stopOpacity="0.10" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="linkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="rgb(var(--accent) / 0.55)" />
            <stop offset="100%" stopColor="rgb(var(--accent-2) / 0.45)" />
          </linearGradient>
        </defs>

        {/* Links */}
        <g>
          {links.map(([a, b], i) => {
            const A = byId[a], B = byId[b];
            if (!A || !B) return null;
            return (
              <line
                key={i}
                x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="url(#linkGrad)"
                strokeWidth={A.ring === 0 || B.ring === 0 ? 1.4 : 0.9}
                opacity={A.ring === 0 || B.ring === 0 ? 0.55 : 0.32}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n, i) => {
            const isCore = n.ring === 0;
            return (
              <g
                key={n.id}
                style={{
                  transformOrigin: `${n.x}px ${n.y}px`,
                  animation: `nh-float ${8 + (i % 5)}s ease-in-out ${i * 0.18}s infinite alternate`,
                }}
              >
                {/* halo */}
                <circle
                  cx={n.x} cy={n.y}
                  r={isCore ? 80 : n.r * 3.5}
                  fill={isCore ? "url(#coreGlow)" : "url(#nodeGlow)"}
                  opacity={isCore ? 0.9 : 0.5}
                />
                {/* node */}
                <circle
                  cx={n.x} cy={n.y} r={n.r}
                  fill={isCore ? "rgb(var(--accent))" : n.ring === 1 ? "rgb(var(--gold))" : "rgb(var(--analyt))"}
                  stroke={isCore ? "rgb(var(--gold))" : "rgb(var(--bg))"}
                  strokeWidth={isCore ? 2 : 1.5}
                  opacity={n.ring === 3 ? 0.7 : 0.95}
                />
                {/* label */}
                <text
                  x={n.x}
                  y={n.y + n.r + 16}
                  textAnchor="middle"
                  fill="rgb(var(--ink-2))"
                  fontSize={isCore ? 12 : n.ring === 3 ? 9.5 : 10.5}
                  fontFamily="var(--font-mono)"
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                  opacity={n.ring === 3 ? 0.55 : 0.75}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <style>{`
        @keyframes nh-float {
          from { transform: translate(0, 0); }
          to   { transform: translate(8px, -10px); }
        }
      `}</style>
    </div>
  );
}
