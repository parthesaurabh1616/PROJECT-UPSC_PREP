"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Newspaper, RotateCcw, Sparkles, Library, Target,
  ClipboardCheck, PenLine, TrendingUp, Check, ArrowUpRight,
  CalendarClock, Brain, Activity, Crosshair,
} from "lucide-react";
import {
  GlowCard, Tag, StatusDot, ProgressRing, Bar, Divider,
  SectionHeader, Eyebrow,
} from "@/components/ui";
import { cn, daysUntil, formatLongDate, seeded } from "@/lib/utils";
import {
  user, exam, shloka, stats, subjects, todayTasks, insights, quickLinks,
} from "@/lib/data";

/* ── HERO STRIP ──────────────────────────────────────── */
export function Hero() {
  const tPrelims = daysUntil(exam.prelims.date);
  const [examTag, setExamTag] = useState("UPSC CSE");
  useEffect(() => {
    fetch("/api/exams/active")
      .then((r) => r.json())
      .then((d: { shortName?: string }) => { if (d.shortName) setExamTag(d.shortName); })
      .catch(() => {});
  }, []);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/60 p-7 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/14 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-accent-2/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-3 flex items-center gap-2">
            <StatusDot variant="amber" /> WAR ROOM · DAY {user.dayOfPrep}
          </Eyebrow>
          <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-ink">
            Good morning, <span className="text-gradient">{user.name}</span>.
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
            <span className="font-editorial text-[15px] italic text-accent">
              {shloka.sanskrit}
            </span>{" "}
            — {shloka.meaning} The system is calibrated to your trajectory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag intent="green">On Track</Tag>
          <Tag intent="amber">Prelims · T-{tPrelims}</Tag>
          <Tag intent="muted">{examTag}</Tag>
        </div>
      </div>
    </div>
  );
}

/* ── TELEMETRY STAT ROW ──────────────────────────────── */
const STAT_TONE = ["amber", "green", "gold"] as const;
export function StatRow() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <GlowCard
          key={s.label}
          tone={STAT_TONE[i] === "green" ? "green" : "amber"}
          className="flex items-center justify-between"
        >
          <div>
            <p className="eyebrow">{s.label}</p>
            <p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-tight text-ink">
              {s.value}
              <span className="text-[16px] text-ink-3">{s.unit}</span>
            </p>
            <p className="mt-2 text-[11.5px] text-ink-2">{s.foot}</p>
          </div>
          <ProgressRing value={s.ring} tone={STAT_TONE[i]} size={64} stroke={7}>
            <span className="font-display text-[12px] font-semibold text-ink">
              {s.ring}
            </span>
          </ProgressRing>
        </GlowCard>
      ))}
    </div>
  );
}

/* ── COUNTDOWN + DOT CALENDAR ────────────────────────── */
export function Countdown() {
  const cells = [
    { ...exam.prelims, days: daysUntil(exam.prelims.date), tone: "amber" as const },
    { ...exam.mains,   days: daysUntil(exam.mains.date),   tone: "green" as const },
    { ...exam.interview, days: daysUntil(exam.interview.date), tone: "blue" as const },
  ];
  return (
    <GlowCard>
      <SectionHeader
        title="Time until the examination"
        sub="CSE 2027 cycle · synced with the UPSC notification"
        icon={<CalendarClock size={15} className="text-accent" />}
        action={<Tag intent="muted">UPSC 2027</Tag>}
      />
      <div className="mt-5 grid grid-cols-3 gap-3">
        {cells.map((c) => {
          const tint =
            c.tone === "green" ? "var(--accent-2)" :
            c.tone === "blue"  ? "var(--analyt)"   : "var(--accent)";
          return (
            <div
              key={c.label}
              className="relative overflow-hidden rounded-xl border border-line bg-bg-subtle/60 p-4 text-center"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{ background: `radial-gradient(circle at 50% 0%, rgb(${tint} / 0.22), transparent 60%)` }}
              />
              <p className="relative font-display text-[40px] font-semibold leading-none tracking-tighter text-ink">
                {c.days}
              </p>
              <p className="relative mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">
                {c.label}
              </p>
              <p className="relative mt-1 text-[10.5px] text-ink-2">
                {formatLongDate(c.date)}
              </p>
            </div>
          );
        })}
      </div>
      <Divider className="my-5" />
      <DotCalendar />
    </GlowCard>
  );
}

function DotCalendar() {
  const pattern = [4,3,4,4,3,2,1,4,4,3,4,3,4,0,4,2,4,4,3,4,
    1,4,4,4,3,5,4,2,4,4,3,4,6,2,1,4,3,4,4,3,
    4,0,4,4,5,3,4,4,2,4,4,4,6,3,4,1,4,4,3,4];
  const cls = (v: number) =>
    v === 0 ? "bg-line-subtle"
      : v === 5 ? "bg-warning/80"
        : v === 6 ? "bg-danger/55"
          : ["", "bg-accent-2/30", "bg-accent-2/55", "bg-accent-2/80", "bg-accent-2"][v];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2">
          <Activity size={11} /> Last 60 days · productivity telemetry
        </p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">
          Hover for detail
        </p>
      </div>
      <div className="grid grid-cols-[repeat(30,1fr)] gap-[5px]">
        {pattern.map((v, i) => (
          <span
            key={i}
            title={`${60 - i} days ago`}
            className={cn(
              "aspect-square rounded-[3px] transition-transform hover:scale-150",
              cls(v),
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
        <LegendSq className="bg-accent-2" label="Strong" />
        <LegendSq className="bg-accent-2/55" label="Good" />
        <LegendSq className="bg-warning/80" label="Partial" />
        <LegendSq className="bg-danger/55" label="Missed" />
        <LegendSq className="bg-line-subtle" label="Rest" />
      </div>
    </div>
  );
}
function LegendSq({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-[2px]", className)} />
      {label}
    </span>
  );
}

/* ── STUDY INTENSITY HEATMAP ─────────────────────────── */
export function Heatmap() {
  const weeks = 26;
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const recent = i > weeks * 7 * 0.55;
    const r = seeded(i + 7);
    let lvl = 0;
    if (r > (recent ? 0.74 : 0.85)) lvl = 4;
    else if (r > (recent ? 0.52 : 0.66)) lvl = 3;
    else if (r > (recent ? 0.32 : 0.46)) lvl = 2;
    else if (r > 0.22) lvl = 1;
    if (i % 7 === 0 && seeded(i) < 0.4) lvl = 0;
    return lvl;
  });
  const lvlCls = ["bg-line-subtle", "bg-accent/22", "bg-accent/45", "bg-accent/70", "bg-accent"];
  return (
    <GlowCard>
      <SectionHeader
        title="Study intensity · 6 months"
        sub="1,247 hours logged · 187 productive days · current streak 47 days"
        icon={<TrendingUp size={15} className="text-accent" />}
        action={
          <div className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
            Less
            {lvlCls.map((c) => (
              <span key={c} className={cn("h-2.5 w-2.5 rounded-[2px]", c)} />
            ))}
            More
          </div>
        }
      />
      <div className="mt-5 grid grid-flow-col grid-rows-7 gap-[3px]">
        {cells.map((lvl, i) => (
          <span key={i} className={cn("aspect-square rounded-[2px]", lvlCls[lvl])} />
        ))}
      </div>
    </GlowCard>
  );
}

/* ── TODAY'S FOCUS ────────────────────────────────────── */
export function TodayFocus() {
  const [tasks, setTasks] = useState(todayTasks);
  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <GlowCard>
      <SectionHeader
        title="Today's directives"
        sub={`${done} of ${tasks.length} targets executed · ${pct}% of the daily plan`}
        icon={<Crosshair size={15} className="text-accent" />}
        action={
          <span className="inline-flex items-center gap-1.5">
            <StatusDot variant="amber" />
            <Tag intent="amber">Deep work</Tag>
          </span>
        }
      />
      <div className="mt-3 -mb-1">
        {tasks.map((t, i) => (
          <button
            key={i}
            onClick={() =>
              setTasks((prev) => prev.map((x, xi) => (xi === i ? { ...x, done: !x.done } : x)))
            }
            className="flex w-full items-center gap-3 border-b border-line-subtle py-2.5 text-left last:border-0"
          >
            <span
              className={cn(
                "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors",
                t.done ? "border-accent-2 bg-accent-2 text-bg" : "border-ink-3",
              )}
            >
              {t.done && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[13px]",
                  t.done ? "text-ink-3 line-through" : "text-ink",
                )}
              >
                {t.text}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
                {t.tag} · {t.time}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10px] text-ink-3">{t.dur}</span>
          </button>
        ))}
      </div>
    </GlowCard>
  );
}

/* ── AI INSIGHTS ──────────────────────────────────────── */
const dotTone: Record<string, "danger" | "amber" | "green"> = {
  danger: "danger", accent: "amber", success: "green",
};
export function AIInsights() {
  return (
    <GlowCard tone="blue">
      <SectionHeader
        title="Cognitive Intelligence"
        sub="Updated 12 minutes ago by the mentor model"
        icon={<Brain size={15} className="text-analyt" />}
        action={<Tag intent="blue">AI</Tag>}
      />
      <div className="mt-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex gap-3 border-b border-line-subtle py-3 last:border-0">
            <StatusDot variant={dotTone[ins.tone]} className="mt-1.5" />
            <div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">{ins.title}.</span> {ins.body}
              </p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
                {ins.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

/* ── SUBJECT MASTERY ─────────────────────────────────── */
export function SubjectMastery() {
  return (
    <GlowCard>
      <SectionHeader
        title="Subject mastery"
        sub="Live syllabus tracker across all papers"
        icon={<ClipboardCheck size={15} className="text-accent" />}
      />
      <div className="mt-4 space-y-2.5">
        {subjects.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <div className="w-36 shrink-0">
              <p className="text-[12.5px] text-ink">{s.name}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
                {s.paper}
              </p>
            </div>
            <Bar value={s.pct} />
            <span className="w-9 shrink-0 text-right font-display text-[14px] font-medium text-ink">
              {s.pct}
            </span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

/* ── QUICK ACCESS ────────────────────────────────────── */
const iconMap = {
  FileText, Newspaper, RotateCcw, Sparkles, Library, Target,
  ClipboardCheck, PenLine,
} as const;
export function QuickLinks() {
  return (
    <div>
      <p className="eyebrow mb-3 flex items-center gap-2">
        <span className="h-px w-7 bg-gradient-to-r from-accent/0 via-accent to-accent-2" />
        Quick access
        <span className="h-px w-7 bg-gradient-to-r from-accent-2 via-accent to-accent/0" />
      </p>
      <div className="grid grid-cols-4 gap-3.5">
        {quickLinks.map((q) => {
          const Icon = iconMap[q.icon as keyof typeof iconMap] ?? FileText;
          const href = q.href === "/" ? "/command" : q.href;
          return (
            <Link key={q.name} href={href}>
              <GlowCard className="group p-4">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon size={17} />
                  </span>
                  <ArrowUpRight size={15} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-3 font-display text-[14px] font-semibold text-ink">
                  {q.name}
                </p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
                  {q.meta}
                </p>
              </GlowCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
