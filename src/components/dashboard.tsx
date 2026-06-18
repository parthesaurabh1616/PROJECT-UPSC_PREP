"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FileText, Newspaper, RotateCcw, Sparkles, BookOpen, Target,
  Check, ArrowUpRight, CalendarClock, Brain, Crosshair, Loader2,
  Play, Pause, Square, TrendingUp, AlertCircle, BarChart3,
} from "lucide-react";
import {
  GlowCard, Tag, StatusDot, ProgressRing, Bar, Divider,
  SectionHeader, Eyebrow,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   HONEST DASHBOARD — every number comes from /api/overview,
   which is derived entirely from real activity. Where there is
   no data, we show an explicit empty/building state, never a
   fabricated value.
   ════════════════════════════════════════════════════════════ */

interface Milestone { date: string | null; days: number | null; estimate: boolean }

interface Overview {
  exam: {
    code: string; shortName: string; targetYear: number | null; prelimsEstimate: string | null; daysToPrelims: number | null;
    milestones: { prelims: Milestone; mains: Milestone; interview: Milestone };
  };
  streak: { streak: number; longest: number; active30: number; lastActive: string | null };
  studyToday: { minutes: number; sessions: number };
  thisWeek: Record<string, number>;
  retention: { pct: number | null; reviews: number; need: number };
  coverage: { ncert: { done: number; total: number; pct: number }; bySubject: { subject: string; done: number; total: number; pct: number }[] };
  accuracy: { min: number; bySubject: { subject: string; attempted: number; correct: number; pct: number }[]; totalAttempts: number };
  revision: { totalCards: number; dueToday: number };
  insights: { overdueRevision: { id: string; front: string; subject: string | null; daysOverdue: number }[]; pyqFrequency: { topic: string; count: number }[] };
  totals: { notes: number; mentorThreads: number; caTotal: number; caReadCount: number; caUnread: number; pyqExtracted: number; pyqAttempted: number; ncertDone: number; ncertTotal: number };
}

function useOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    fetch("/api/overview", { cache: "no-store" })
      .then((r) => r.json()).then((d: Overview) => setData(d))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload };
}

/* ── EMPTY STATE — honest "no data yet, here's how to create it" ── */
function Empty({ icon, children, href, cta }: { icon: React.ReactNode; children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="text-ink-3">{icon}</span>
      <p className="max-w-[280px] text-[12px] leading-relaxed text-ink-3">{children}</p>
      {href && cta && (
        <Link href={href} className="mt-1 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11.5px] text-accent hover:bg-accent/20">{cta}</Link>
      )}
    </div>
  );
}

const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

/* ════════════════════════════════════════════════════════════
   THE DASHBOARD
   ════════════════════════════════════════════════════════════ */
export function Dashboard() {
  const { data, loading, reload } = useOverview();

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading your real progress…</div>;
  if (!data) return <div className="py-20 text-ink-3">Couldn’t load the dashboard.</div>;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="animate-fade-up"><Hero d={data} /></div>

      {/* A. TODAY — action, not analytics */}
      <div className="grid animate-fade-up grid-cols-[1.4fr_1fr] gap-5" style={{ animationDelay: "60ms" }}>
        <TodayBlock d={data} />
        <DeepWorkTimer onLogged={reload} todayMinutes={data.studyToday.minutes} />
      </div>

      {/* COUNTDOWN — exact when set, else estimate (clearly marked) */}
      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}><CountdownBlock d={data} /></div>

      {/* B. WHERE I STAND — coverage (honestly labelled) */}
      <div className="grid animate-fade-up grid-cols-[1fr_1fr] gap-5" style={{ animationDelay: "120ms" }}>
        <CoverageBlock d={data} />
        <WeakBlock d={data} />
      </div>

      {/* D. DONE THIS WEEK — proof of work */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}><DoneThisWeek d={data} /></div>

      {/* QUICK ACCESS — real counts only */}
      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}><QuickLinks d={data} /></div>
    </div>
  );
}

/* ── HERO ─────────────────────────────────────────────── */
function Hero({ d }: { d: Overview }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/60 p-7 backdrop-blur-xl">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/14 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-3 flex items-center gap-2">
            <StatusDot variant={d.streak.streak > 0 ? "green" : "amber"} />
            {d.streak.streak > 0 ? `${d.streak.streak}-DAY STREAK` : "NO STREAK YET"} · {d.streak.active30} ACTIVE DAYS / 30
          </Eyebrow>
          <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-ink">
            {greeting}, <span className="text-gradient">Saurabh</span>.
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">
            {d.streak.streak > 0
              ? `You've shown up ${d.streak.active30} of the last 30 days. Keep the chain alive.`
              : "Log your first action today — read a chapter, attempt PYQs, or start a study session — and your streak begins."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d.exam.daysToPrelims != null && <Tag intent="amber">Prelims · ~T-{d.exam.daysToPrelims}</Tag>}
          <Tag intent="muted">{d.exam.shortName}</Tag>
        </div>
      </div>
      {d.exam.daysToPrelims != null && (
        <p className="relative mt-3 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">
          <CalendarClock size={10} className="mr-1 inline" />
          Countdown estimated from your target year {d.exam.targetYear} · set an exact date in settings for precision
        </p>
      )}
    </div>
  );
}

/* ── COUNTDOWN ────────────────────────────────────────── */
function CountdownBlock({ d }: { d: Overview }) {
  const m = d.exam.milestones;
  const cells = [
    { label: "Prelims", ms: m.prelims, tint: "var(--accent)" },
    { label: "Mains", ms: m.mains, tint: "var(--accent-2)" },
    { label: "Interview", ms: m.interview, tint: "var(--analyt)" },
  ];
  const anyExact = cells.some((c) => !c.ms.estimate && c.ms.days != null);
  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  return (
    <GlowCard>
      <SectionHeader title="Time until the examination" icon={<CalendarClock size={15} className="text-accent" />}
        sub={anyExact ? `${d.exam.shortName} · exact dates you set` : `${d.exam.shortName} · estimated from your target year — set exact dates for precision`}
        action={<Link href="/settings" className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-ink-2 hover:border-accent/40 hover:text-ink">Set dates</Link>} />
      <div className="mt-5 grid grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="relative overflow-hidden rounded-xl border border-line bg-bg-subtle/60 p-4 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 0%, rgb(${c.tint} / 0.22), transparent 60%)` }} />
            <p className="relative font-display text-[38px] font-semibold leading-none tracking-tighter text-ink">{c.ms.days ?? "—"}</p>
            <p className="relative mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-3">{c.label}{c.ms.estimate && c.ms.days != null ? " ~est" : ""}</p>
            <p className="relative mt-1 text-[10.5px] text-ink-2">{fmt(c.ms.date)}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

/* ── A. TODAY ─────────────────────────────────────────── */
function TodayBlock({ d }: { d: Overview }) {
  const next: { label: string; sub: string; href: string }[] = [];
  if (d.revision.dueToday > 0) next.push({ label: `${d.revision.dueToday} flashcards due for revision`, sub: "Spaced repetition · SM-2", href: "/revision" });
  if (d.totals.caUnread > 0) next.push({ label: `${d.totals.caUnread} current-affairs items unread`, sub: "Stay current", href: "/current-affairs" });
  if (d.coverage.ncert.done < d.coverage.ncert.total) next.push({ label: "Continue the NCERT foundation", sub: `${d.coverage.ncert.done} of ${d.coverage.ncert.total} chapters done`, href: "/ncert" });
  if (d.totals.pyqAttempted === 0) next.push({ label: "Attempt your first PYQ set", sub: "Build real accuracy data", href: "/pyq" });

  return (
    <GlowCard>
      <SectionHeader title="Today" sub="What to do next — drawn from your real due items" icon={<Crosshair size={15} className="text-accent" />} />
      <div className="mt-3 -mb-1">
        {next.length === 0 ? (
          <Empty icon={<Check size={24} className="text-success" />}>You&apos;re all caught up. Start a study session or explore a new topic.</Empty>
        ) : next.map((t, i) => (
          <Link key={i} href={t.href} className="flex items-center gap-3 border-b border-line-subtle py-3 last:border-0 hover:opacity-90">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent"><Target size={13} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-ink">{t.label}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">{t.sub}</span>
            </span>
            <ArrowUpRight size={15} className="shrink-0 text-ink-3" />
          </Link>
        ))}
      </div>
    </GlowCard>
  );
}

/* ── DEEP-WORK TIMER → writes a real StudySession ─────── */
function DeepWorkTimer({ onLogged, todayMinutes }: { onLogged: () => void; todayMinutes: number }) {
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const end = async () => {
    setRunning(false);
    const minutes = Math.round(elapsed / 60);
    if (minutes < 1) { setElapsed(0); setMsg("Session too short to log (min 1m)"); setTimeout(() => setMsg(""), 3000); return; }
    setSaving(true);
    try {
      await fetch("/api/study/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minutes }) });
      setMsg(`Logged ${fmtMin(minutes)}`); setElapsed(0); onLogged();
    } catch { setMsg("Failed to log"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <GlowCard tone="green">
      <SectionHeader title="Deep work" sub={`${fmtMin(todayMinutes)} studied today · real sessions only`} icon={<Brain size={15} className="text-accent-2" />} />
      <div className="mt-4 flex flex-col items-center gap-4">
        <p className="font-display text-[44px] font-semibold leading-none tracking-tighter text-ink tabular-nums">{mm}:{ss}</p>
        <div className="flex items-center gap-2">
          {!running ? (
            <button onClick={() => setRunning(true)} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-2 to-accent px-4 py-2 text-[12.5px] font-medium text-white">
              <Play size={14} /> {elapsed > 0 ? "Resume" : "Start session"}
            </button>
          ) : (
            <button onClick={() => setRunning(false)} className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-[12.5px] text-ink-2 hover:text-ink">
              <Pause size={14} /> Pause
            </button>
          )}
          <button onClick={() => { void end(); }} disabled={saving || (elapsed === 0)} className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-[12.5px] text-ink-2 hover:border-accent/40 hover:text-ink disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />} End & log
          </button>
        </div>
        {msg && <p className="text-[11px] text-success">{msg}</p>}
      </div>
    </GlowCard>
  );
}

/* ── B. COVERAGE (real, labelled coverage NOT mastery) ── */
function CoverageBlock({ d }: { d: Overview }) {
  const hasData = d.coverage.ncert.done > 0;
  return (
    <GlowCard>
      <SectionHeader title="Syllabus coverage" sub="How much you've actually completed — coverage, not mastery" icon={<BookOpen size={15} className="text-accent" />}
        action={<Tag intent="muted">{d.coverage.ncert.pct}% NCERT</Tag>} />
      {!hasData ? (
        <Empty icon={<BookOpen size={24} />} href="/ncert" cta="Open NCERT Library">No chapters marked complete yet. Mark a chapter as read and your coverage starts tracking — every % here is real.</Empty>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing value={d.coverage.ncert.pct} tone="amber" size={64} stroke={7}>
              <span className="font-display text-[12px] font-semibold text-ink">{d.coverage.ncert.pct}%</span>
            </ProgressRing>
            <div>
              <p className="font-display text-[20px] font-semibold text-ink">{d.coverage.ncert.done}<span className="text-[13px] text-ink-3"> / {d.coverage.ncert.total}</span></p>
              <p className="text-[11.5px] text-ink-3">NCERT chapters completed</p>
            </div>
          </div>
          <Divider className="my-4" />
          <div className="space-y-2.5">
            {d.coverage.bySubject.filter((s) => s.total > 0).slice(0, 6).map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <div className="w-32 shrink-0"><p className="truncate text-[12px] text-ink">{s.subject}</p></div>
                <Bar value={s.pct} />
                <span className="w-16 shrink-0 text-right font-mono text-[10.5px] text-ink-2">{s.done}/{s.total}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlowCard>
  );
}

/* ── C. WHAT'S WEAK / REVISE (real insights) ──────────── */
function WeakBlock({ d }: { d: Overview }) {
  const { overdueRevision, pyqFrequency } = d.insights;
  return (
    <GlowCard tone="blue">
      <SectionHeader title="What needs attention" sub="Derived from your revision schedule & the PYQ corpus" icon={<AlertCircle size={15} className="text-analyt" />} action={<Tag intent="blue">Real</Tag>} />

      {/* Overdue revision (SM-2) */}
      <p className="mt-3 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3"><RotateCcw size={10} className="mr-1 inline" /> Overdue revision</p>
      {overdueRevision.length === 0 ? (
        <p className="py-2 text-[12px] text-ink-3">Nothing overdue. {d.revision.dueToday > 0 ? `${d.revision.dueToday} due today.` : "Revision is on schedule."}</p>
      ) : (
        <div className="space-y-1.5">
          {overdueRevision.map((r) => (
            <div key={r.id} className="flex items-start gap-2 border-b border-line-subtle py-1.5 last:border-0">
              <StatusDot variant="danger" className="mt-1.5" />
              <p className="flex-1 text-[12px] leading-snug text-ink-2">{r.front.slice(0, 80)}{r.front.length > 80 ? "…" : ""}</p>
              <span className="shrink-0 font-mono text-[9.5px] text-danger">{r.daysOverdue}d</span>
            </div>
          ))}
          <Link href="/revision" className="mt-1 inline-block text-[11px] text-accent hover:underline">Clear overdue cards →</Link>
        </div>
      )}

      <Divider className="my-3.5" />

      {/* PYQ frequency — real counts, no fake confidence */}
      <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3"><TrendingUp size={10} className="mr-1 inline" /> Most-asked PYQ topics ({d.exam.shortName})</p>
      {pyqFrequency.length === 0 ? (
        <Empty icon={<Target size={20} />} href="/pyq" cta="Decode papers">Extract questions from past papers to surface the topics examined most.</Empty>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {pyqFrequency.map((p) => (
            <span key={p.topic} className="flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] text-accent">
              {p.topic} <span className="font-mono text-[9px] text-accent-2">×{p.count}</span>
            </span>
          ))}
        </div>
      )}
    </GlowCard>
  );
}

/* ── D. DONE THIS WEEK + retention/accuracy ───────────── */
function DoneThisWeek({ d }: { d: Overview }) {
  const w = d.thisWeek;
  const cells = [
    { label: "Chapters read", value: w.CHAPTER_READ ?? 0, icon: BookOpen },
    { label: "PYQs attempted", value: w.PYQ_ATTEMPTED ?? 0, icon: Target },
    { label: "Notes created", value: w.NOTE_CREATED ?? 0, icon: FileText },
    { label: "Cards reviewed", value: w.REVISION_REVIEWED ?? 0, icon: RotateCcw },
    { label: "Affairs read", value: w.CA_READ ?? 0, icon: Newspaper },
    { label: "Study sessions", value: w.STUDY_SESSION ?? 0, icon: Brain },
  ];
  const totalActions = cells.reduce((n, c) => n + c.value, 0);
  return (
    <GlowCard>
      <SectionHeader title="Done this week" sub={totalActions > 0 ? `${totalActions} real actions in the last 7 days` : "No activity logged in the last 7 days yet"} icon={<BarChart3 size={15} className="text-accent" />}
        action={
          <div className="flex items-center gap-2">
            {d.retention.pct != null
              ? <Tag intent="green">Retention {d.retention.pct}%</Tag>
              : <Tag intent="muted">Retention: {d.retention.reviews}/{d.retention.need} reviews</Tag>}
          </div>
        } />
      <div className="mt-4 grid grid-cols-6 gap-3">
        {cells.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-line-subtle bg-bg-subtle/40 p-3 text-center">
              <Icon size={15} className={cn("mx-auto", c.value > 0 ? "text-accent" : "text-ink-3")} />
              <p className="mt-2 font-display text-[22px] font-semibold leading-none text-ink">{c.value}</p>
              <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">{c.label}</p>
            </div>
          );
        })}
      </div>
      {/* PYQ accuracy — only when enough attempts exist */}
      {d.accuracy.bySubject.length > 0 && (
        <>
          <Divider className="my-4" />
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">PYQ accuracy by topic (self-rated · ≥{d.accuracy.min} attempts)</p>
          <div className="space-y-2">
            {d.accuracy.bySubject.slice(0, 5).map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <div className="w-36 shrink-0"><p className="truncate text-[12px] text-ink">{s.subject}</p></div>
                <Bar value={s.pct} />
                <span className="w-20 shrink-0 text-right font-mono text-[10px] text-ink-2">{s.correct}/{s.attempted} · {s.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
      {totalActions === 0 && d.accuracy.bySubject.length === 0 && (
        <p className="mt-3 text-center text-[11.5px] text-ink-3">Your weekly proof-of-work builds automatically as you study. No fabricated numbers here.</p>
      )}
    </GlowCard>
  );
}

/* ── QUICK ACCESS — real counts only ──────────────────── */
function QuickLinks({ d }: { d: Overview }) {
  const links = [
    { name: "Notes", meta: `${d.totals.notes} notes`, icon: FileText, href: "/notes" },
    { name: "Current Affairs", meta: `${d.totals.caUnread} unread`, icon: Newspaper, href: "/current-affairs" },
    { name: "Revision", meta: `${d.revision.dueToday} due today`, icon: RotateCcw, href: "/revision" },
    { name: "AI Mentor", meta: `${d.totals.mentorThreads} threads`, icon: Sparkles, href: "/mentor" },
    { name: "NCERT Library", meta: `${d.totals.ncertDone}/${d.totals.ncertTotal} chapters`, icon: BookOpen, href: "/ncert" },
    { name: "PYQ Intelligence", meta: `${d.totals.pyqAttempted} attempted`, icon: Target, href: "/pyq" },
    { name: "Knowledge Hub", meta: "syllabus spine", icon: Brain, href: "/knowledge" },
    { name: "Live Actions", meta: `${d.totals.caTotal} signals`, icon: Newspaper, href: "/intelligence" },
  ];
  return (
    <div>
      <Eyebrow className="mb-3 flex items-center gap-2">
        <span className="h-px w-7 bg-gradient-to-r from-accent/0 via-accent to-accent-2" /> Quick access
      </Eyebrow>
      <div className="grid grid-cols-4 gap-3.5">
        {links.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.name} href={q.href}>
              <GlowCard className="group p-4">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><Icon size={17} /></span>
                  <ArrowUpRight size={15} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-3 font-display text-[14px] font-semibold text-ink">{q.name}</p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">{q.meta}</p>
              </GlowCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
