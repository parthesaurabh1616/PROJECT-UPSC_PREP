"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarRange, Loader2, TrendingUp, TrendingDown, Minus, Sparkles, Flame,
  AlertCircle, Target, BookOpen, Newspaper, RotateCcw, Brain, ClipboardCheck, PenLine, FileText, ArrowRight,
} from "lucide-react";
import { Card, Bar, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Digest {
  period: { from: string; to: string };
  activity: { type: string; label: string; thisWeek: number; lastWeek: number; delta: number }[];
  activeDays: number; streak: number;
  study: { minutes: number; lastWeekMinutes: number };
  performance: {
    tests: { thisWeek: number; avgPct: number | null; lastAvgPct: number | null };
    answers: { thisWeek: number; avgPct: number | null };
    revision: { reviewedThisWeek: number; dueNow: number; overdue: number };
    pyqAccuracy: { subject: string; pct: number; attempted: number }[];
  };
  weakAreas: { kind: string; label: string; detail: string }[];
  focus: { priority: "high" | "medium" | "low"; action: string; why: string }[];
  narrative: string; exam: string;
}

const ICONS: Record<string, typeof BookOpen> = {
  CHAPTER_READ: BookOpen, PYQ_ATTEMPTED: Target, CA_READ: Newspaper, NOTE_CREATED: FileText,
  REVISION_REVIEWED: RotateCcw, STUDY_SESSION: Brain, TEST_ATTEMPTED: ClipboardCheck, ANSWER_WRITTEN: PenLine,
};
const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ReviewPage() {
  const [d, setD] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/review", { cache: "no-store" }).then((r) => r.json()).then((j: Digest) => setD(j)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Compiling your week…</div>;
  if (!d) return <div className="py-20 text-ink-3">Couldn’t load the review.</div>;

  const totalActions = d.activity.reduce((s, a) => s + a.thisWeek, 0);
  const PRIO: Record<string, string> = { high: "border-danger/40 bg-danger/5", medium: "border-amber-400/30 bg-amber-400/5", low: "border-line-subtle" };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <CalendarRange size={18} className="text-accent" /> Weekly Review
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{d.exam} · {fmtDate(d.period.from)} – {fmtDate(d.period.to)} · every figure measured from what you actually did</p>
      </div>

      {/* AI read — grounded in the real numbers */}
      {d.narrative && (
        <Card tone="blue" className="mb-5 animate-fade-up p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-2"><Sparkles size={13} /> Your week, read honestly</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{d.narrative}</p>
        </Card>
      )}

      {/* Consistency strip */}
      <div className="mb-5 grid animate-fade-up grid-cols-2 gap-4 sm:grid-cols-4" style={{ animationDelay: "40ms" }}>
        <Stat icon={<Flame size={14} className="text-amber-300" />} label="Active days" value={`${d.activeDays}/7`} />
        <Stat icon={<Flame size={14} className="text-accent" />} label="Streak" value={`${d.streak}d`} />
        <Stat icon={<Brain size={14} className="text-accent-2" />} label="Study" value={fmtMin(d.study.minutes)} delta={d.study.minutes - d.study.lastWeekMinutes} unit="m" />
        <Stat icon={<Target size={14} className="text-emerald-400" />} label="Total actions" value={`${totalActions}`} />
      </div>

      {/* Activity vs last week */}
      <Card className="mb-5 animate-fade-up p-5" style={{ animationDelay: "80ms" }}>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">What you did — vs last week</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
          {d.activity.map((a) => {
            const Icon = ICONS[a.type] ?? Target;
            return (
              <div key={a.type} className="flex items-center gap-2.5">
                <Icon size={15} className={cn(a.thisWeek > 0 ? "text-accent" : "text-ink-3")} />
                <div className="min-w-0">
                  <p className="font-display text-[18px] font-semibold leading-none text-ink">{a.thisWeek}</p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">
                    {a.label} <DeltaTag delta={a.delta} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance + Weak areas */}
      <div className="mb-5 grid animate-fade-up grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: "120ms" }}>
        <Card className="p-5">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Performance signals (real)</p>
          <div className="space-y-2.5 text-[12.5px]">
            <Signal label="Prelims test avg" value={d.performance.tests.avgPct != null ? `${d.performance.tests.avgPct}%` : "no tests"} sub={d.performance.tests.thisWeek ? `${d.performance.tests.thisWeek} this week` : "take one →"} href="/tests" />
            <Signal label="Mains answer avg" value={d.performance.answers.avgPct != null ? `${d.performance.answers.avgPct}%` : "no answers"} sub={d.performance.answers.thisWeek ? `${d.performance.answers.thisWeek} evaluated` : "write one →"} href="/answers" />
            <Signal label="Revision" value={`${d.performance.revision.reviewedThisWeek} reviewed`} sub={`${d.performance.revision.overdue} overdue · ${d.performance.revision.dueNow} due`} href="/revision" />
          </div>
          {d.performance.pyqAccuracy.length > 0 && (
            <div className="mt-4 border-t border-line-subtle pt-3">
              <p className="mb-2 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">PYQ accuracy by area</p>
              {d.performance.pyqAccuracy.slice(0, 5).map((a) => (
                <div key={a.subject} className="mb-1.5 flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[11.5px] text-ink">{a.subject}</span>
                  <Bar value={a.pct} className="flex-1" />
                  <span className="w-16 shrink-0 text-right font-mono text-[10px] text-ink-2">{a.pct}% · {a.attempted}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><AlertCircle size={13} className="text-amber-300" /> Where you&apos;re weak</p>
          {d.weakAreas.length === 0 ? (
            <p className="py-3 text-[12.5px] text-ink-3">No weak signals surfaced this week. Consolidate and push volume.</p>
          ) : (
            <div className="space-y-2">
              {d.weakAreas.map((w, i) => (
                <div key={i} className="rounded-xl border border-line-subtle p-3">
                  <p className="text-[12.5px] font-medium text-ink">{w.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">{w.detail}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Next week's focus */}
      <Card className="animate-fade-up p-5" style={{ animationDelay: "160ms" }}>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Next week — focus, drawn from your real gaps</p>
        <div className="space-y-2">
          {d.focus.map((f, i) => (
            <div key={i} className={cn("flex items-start gap-3 rounded-xl border p-3", PRIO[f.priority])}>
              <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider",
                f.priority === "high" ? "bg-danger/15 text-danger" : f.priority === "medium" ? "bg-amber-400/15 text-amber-300" : "bg-surface-2 text-ink-3")}>{f.priority}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{f.action}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">{f.why}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
          <ArrowRight size={12} className="text-accent" /> Track these in the <Link href="/exam" className="text-accent hover:underline">Command Center</Link> and <Link href="/command" className="text-accent hover:underline">Dashboard</Link>.
        </p>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, delta, unit }: { icon: React.ReactNode; label: string; value: string; delta?: number; unit?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5">{icon}<span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{label}</span></div>
      <p className="mt-1.5 font-display text-[22px] font-semibold leading-none text-ink">{value}</p>
      {typeof delta === "number" && delta !== 0 && <p className="mt-1"><DeltaTag delta={delta} unit={unit} /></p>}
    </Card>
  );
}

function DeltaTag({ delta, unit }: { delta: number; unit?: string }) {
  if (delta === 0) return <span className="inline-flex items-center text-ink-3"><Minus size={9} /></span>;
  const up = delta > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[8.5px]", up ? "text-success" : "text-danger")}>
      {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{up ? "+" : ""}{delta}{unit ?? ""}
    </span>
  );
}

function Signal({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
      <span className="text-ink">{label}</span>
      <span className="text-right"><span className="font-medium text-ink">{value}</span> <span className="text-[10.5px] text-ink-3">· {sub}</span></span>
    </Link>
  );
}
