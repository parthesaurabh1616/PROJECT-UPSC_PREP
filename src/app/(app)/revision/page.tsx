"use client";

import { useState } from "react";
import { Brain, Layers, TrendingDown, RotateCcw } from "lucide-react";
import { Card, Chip, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";
import { revStats, flashcards, retentionWatch, revisionModes } from "@/lib/data";

export default function RevisionPage() {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = flashcards[idx];

  const grade = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % flashcards.length);
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* header */}
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink">
            Today&apos;s Revision
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            38 cards due · forgetting-curve aware · ~18 minutes
          </p>
        </div>
        <div className="flex gap-1.5">
          <Chip tone="success">+12 reviewed</Chip>
          <Chip tone="muted">26 remaining</Chip>
        </div>
      </div>

      {/* stats */}
      <div className="grid animate-fade-up grid-cols-4 gap-4" style={{ animationDelay: "70ms" }}>
        {revStats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink">
              {s.value}
            </p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid animate-fade-up grid-cols-[1.45fr_1fr] gap-5" style={{ animationDelay: "140ms" }}>
        {/* flashcard */}
        <Card>
          <SectionHeading
            title={`Active Card · ${idx + 1} of ${flashcards.length}`}
            sub={`${card.source} · last seen ${card.lastSeen} · interval ${card.interval}`}
            icon={<Layers size={15} className="text-accent" />}
            action={<Chip tone="muted">SM-2 algorithm</Chip>}
          />

          <button
            onClick={() => setFlipped(!flipped)}
            className="mt-4 flex min-h-[230px] w-full flex-col justify-center rounded-xl border border-line bg-gradient-to-b from-bg to-surface-2 p-7 text-left shadow-card transition-all hover:border-accent/30"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              {flipped ? "Answer" : "Question · click to reveal"}
            </p>
            <p className="mt-3 font-display text-[20px] font-medium leading-snug tracking-tight text-ink">
              {card.front}
            </p>
            {flipped && (
              <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-ink-2">
                {card.back}
              </p>
            )}
            <div className="mt-5 flex items-center justify-between text-[11px] text-ink-3">
              <span>{card.source}</span>
              <span>
                Difficulty{" "}
                {"★".repeat(card.difficulty)}
                <span className="text-line">
                  {"★".repeat(5 - card.difficulty)}
                </span>
              </span>
            </div>
          </button>

          {/* grading */}
          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {[
              { label: "Again", note: "< 1 min", cls: "hover:border-danger hover:text-danger" },
              { label: "Hard", note: "6 days", cls: "hover:border-warning hover:text-warning" },
              { label: "Good", note: "14 days", cls: "hover:border-accent-2 hover:text-accent-2" },
              { label: "Easy", note: "32 days", cls: "hover:border-accent hover:text-accent" },
            ].map((g, i) => (
              <button
                key={g.label}
                onClick={grade}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border border-line bg-surface py-2.5 text-[12.5px] font-medium text-ink-2 transition-colors",
                  g.cls,
                )}
              >
                {g.label}
                <span className="text-[9px] uppercase tracking-wide text-ink-3">
                  {i + 1} · {g.note}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* side column */}
        <div className="space-y-4">
          <Card>
            <SectionHeading
              title="AI Retention Watch"
              sub="Topics predicted to drop below 60% recall"
              icon={<Brain size={15} className="text-accent" />}
            />
            <div className="mt-3 space-y-0">
              {retentionWatch.map((r) => (
                <div
                  key={r.title}
                  className="flex gap-3 border-b border-line-subtle py-2.5 last:border-0"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      r.tone === "danger" ? "bg-danger" : "bg-accent",
                    )}
                  />
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">
                      {r.title}
                    </p>
                    <p className="text-[10.5px] uppercase tracking-wide text-ink-3">
                      {r.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Revision Modes"
              sub="Switch the rhythm"
              icon={<RotateCcw size={15} className="text-accent" />}
            />
            <div className="mt-3 space-y-1.5">
              {revisionModes.map((m) => (
                <button
                  key={m}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-left text-[12px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
                >
                  {m}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* forgetting curve */}
      <Card className="animate-fade-up" >
        <SectionHeading
          title="Forgetting Curve — your last 6 weeks"
          sub="Ebbinghaus model · re-fitted weekly to your actual recall data"
          icon={<TrendingDown size={15} className="text-accent" />}
          action={
            <div className="flex items-center gap-3 text-[10.5px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-accent" /> Without revision
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-accent-2" /> With your cycle
              </span>
            </div>
          }
        />
        <ForgettingCurve />
      </Card>
    </div>
  );
}

/* ── Forgetting curve (SVG) ───────────────────────────── */
function ForgettingCurve() {
  const W = 900, H = 220, PL = 38, PR = 16, PT = 14, PB = 30;
  const days = 42;
  const x = (d: number) => PL + (d / days) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v) * (H - PT - PB);

  // decay without revision
  let pathA = "";
  for (let d = 0; d <= days; d += 0.5) {
    const v = Math.exp(-d / 2.6);
    pathA += `${d === 0 ? "M" : "L"}${x(d).toFixed(1)} ${y(v).toFixed(1)} `;
  }

  // sawtooth recovery with spaced revision
  const revs = [1, 3, 7, 14, 28];
  const pts: [number, number][] = [];
  let prev = 0;
  revs.forEach((r, i) => {
    const S = 2.6 + i * 1.6;
    for (let d = prev; d <= r; d += 0.4) {
      pts.push([d, Math.max(0.55, Math.exp(-(d - prev) / S))]);
    }
    prev = r;
  });
  for (let d = prev; d <= days; d += 0.4) {
    pts.push([d, Math.max(0.7, Math.exp(-(d - prev) / 20))]);
  }
  const pathB = pts
    .map(([d, v], i) => `${i === 0 ? "M" : "L"}${x(d).toFixed(1)} ${y(v).toFixed(1)} `)
    .join("");

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-bg-subtle">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={PL}
              x2={W - PR}
              y1={y(v)}
              y2={y(v)}
              stroke="rgb(var(--line))"
              strokeDasharray="2 4"
            />
            <text
              x={PL - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="rgb(var(--ink-3))"
            >
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, 28, 35, 42].map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - PB + 16}
            textAnchor="middle"
            fontSize={9}
            fill="rgb(var(--ink-3))"
          >
            Day {d}
          </text>
        ))}
        <path d={pathA} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} opacity={0.8} />
        <path d={pathB} fill="none" stroke="rgb(var(--accent-2))" strokeWidth={2.4} />
        {revs.map((r) => (
          <circle
            key={r}
            cx={x(r)}
            cy={y(1)}
            r={3.5}
            fill="rgb(var(--accent-2))"
            stroke="rgb(var(--surface))"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
}
