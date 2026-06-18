"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Command, Loader2, Info, Trophy, Layers, BookOpen, Target, Map, Network,
  GraduationCap, ChevronRight, Check, AlertCircle, ArrowRight,
} from "lucide-react";
import { Card, Chip, Bar } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ── Types mirror /api/exam-center ─────────────────────────── */
interface Prov { value: unknown; source: string; method: string; updatedAt: string | null; activities: string }
interface Topper { name: string; year: number; air?: number; optional: string; essay: number; gs1: number; gs2: number; gs3: number; gs4: number; opt1: number; opt2: number; written: number; interview: number; final: number }
interface Band { key: string; label: string; max: number; min: number; avg: number; top: number }
interface Paper { code: string; name: string; marks: number; counted: boolean; note?: string }
interface Subject { name: string; paper: string; gsCode: string; sources: string[]; note: string }
interface Phase { when: string; title: string; items: string[] }
interface Data {
  exam: { code: string; shortName: string };
  target: { final: number; source: string };
  overview: { what: string; services: { code: string; name: string; note: string }[]; funnel: { stage: string; note: string; kind: string }[] };
  structure: { prelims: Paper[]; mains: Paper[]; mainsWrittenTotal: number; interview: number; grandTotal: number };
  toppers: Topper[];
  bands: Band[];
  blueprint: { key: string; label: string; target: number; max: number }[];
  insights: string[];
  subjects: Subject[];
  roadmap: Phase[];
  metrics: {
    ncertCoverage: Prov; pyqPractice: Prov; revision: Prov; currentAffairs: Prov;
    notes: Prov; study: Prov; streak: Prov;
    tests: { value: { attempted: number }; measured: false; note: string };
    mainsAnswers: { value: { written: number }; measured: false; note: string };
  };
}

const TABS = [
  { k: "overview", label: "Overview", icon: GraduationCap },
  { k: "structure", label: "Structure & Marks", icon: Layers },
  { k: "benchmark", label: "AIR-1 Benchmark", icon: Trophy },
  { k: "subjects", label: "Subjects", icon: BookOpen },
  { k: "gap", label: "Gap Analysis", icon: Target },
  { k: "roadmap", label: "Roadmap", icon: Map },
] as const;
type TabKey = typeof TABS[number]["k"];

export default function ExamCenterPage() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    fetch("/api/exam-center").then((r) => r.json()).then((j: Data) => setD(j)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading the Command Center…</div>;
  if (!d) return <div className="py-20 text-ink-3">Couldn’t load the Command Center.</div>;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Command size={18} className="text-accent" /> UPSC Command Center
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {d.exam.shortName} · understand the exam end-to-end · benchmark against real toppers · track your real progress
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex animate-fade-up flex-wrap gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] transition-colors",
                tab === t.k ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-up">
        {tab === "overview" && <Overview d={d} />}
        {tab === "structure" && <Structure d={d} />}
        {tab === "benchmark" && <Benchmark d={d} />}
        {tab === "subjects" && <Subjects d={d} />}
        {tab === "gap" && <Gap d={d} />}
        {tab === "roadmap" && <Roadmap d={d} />}
      </div>
    </div>
  );
}

/* ── Provenance chip — makes every metric auditable ───────────── */
function Source({ p }: { p: { source: string; method: string; updatedAt: string | null; activities: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-0.5 text-[10px] text-ink-3 hover:text-accent">
        <Info size={10} /> source
      </button>
      {open && (
        <span className="absolute right-0 z-20 mt-1 block w-64 rounded-lg border border-line bg-surface p-3 text-left shadow-soft">
          <span className="block text-[10px] leading-relaxed text-ink-2"><b className="text-ink">Source:</b> {p.source}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-ink-2"><b className="text-ink">Method:</b> {p.method}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-ink-2"><b className="text-ink">From:</b> {p.activities}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-ink-2"><b className="text-ink">Updated:</b> {p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-IN") : "no activity yet"}</span>
        </span>
      )}
    </span>
  );
}

/* ── 1. OVERVIEW ──────────────────────────────────────────── */
function Overview({ d }: { d: Data }) {
  const tone: Record<string, string> = { apply: "bg-slate-500/15 text-slate-300", prelims: "bg-accent/15 text-accent", mains: "bg-accent-2/15 text-accent-2", interview: "bg-amber-400/15 text-amber-300", final: "bg-emerald-400/15 text-emerald-300" };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-[13.5px] leading-relaxed text-ink-2">{d.overview.what}</p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">The selection funnel</p>
        <div className="flex flex-wrap items-stretch gap-2">
          {d.overview.funnel.map((f, i) => (
            <div key={f.stage} className="flex items-center gap-2">
              <div className={cn("rounded-xl px-3.5 py-2.5", tone[f.kind])}>
                <p className="font-display text-[13px] font-semibold">{f.stage}</p>
                <p className="mt-0.5 text-[10.5px] opacity-80">{f.note}</p>
              </div>
              {i < d.overview.funnel.length - 1 && <ChevronRight size={14} className="shrink-0 text-ink-3" />}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">What you can become</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {d.overview.services.map((s) => (
            <div key={s.code} className="rounded-xl border border-line-subtle p-3">
              <p className="font-display text-[13px] font-semibold text-ink">{s.code} <span className="font-normal text-ink-2">· {s.name}</span></p>
              <p className="mt-0.5 text-[11px] text-ink-3">{s.note}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── 2. STRUCTURE & MARKS ─────────────────────────────────── */
function Structure({ d }: { d: Data }) {
  const Row = ({ p, denom }: { p: Paper; denom: number }) => (
    <div className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
      <div className="w-44 shrink-0">
        <p className="text-[12.5px] text-ink">{p.code}</p>
        {p.note && <p className="text-[10px] text-ink-3">{p.note}</p>}
      </div>
      <Bar value={Math.round((p.marks / denom) * 100)} />
      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-ink-2">{p.marks}{p.counted ? "" : " (q)"}</span>
    </div>
  );
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Stage 1 · Prelims <span className="font-normal text-ink-3">— screening only, marks not counted in the final</span></p>
        <div className="mt-2">{d.structure.prelims.map((p) => <Row key={p.code} p={p} denom={200} />)}</div>
      </Card>
      <Card className="p-5">
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-2">Stage 2 · Mains <span className="font-normal text-ink-3">— {d.structure.mainsWrittenTotal} counted marks (7 papers × 250) + 2 qualifying</span></p>
        <div className="mt-2">{d.structure.mains.map((p) => <Row key={p.code} p={p} denom={250} />)}</div>
      </Card>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-300">Stage 3 · Interview</p>
          <p className="mt-2 font-display text-[28px] font-semibold text-ink">{d.structure.interview}<span className="text-[14px] text-ink-3"> marks</span></p>
          <p className="mt-1 text-[11.5px] text-ink-3">Personality Test — scored on judgement, awareness & balance, not bookish knowledge.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Final tally</p>
          <p className="mt-2 font-display text-[28px] font-semibold text-ink">{d.structure.grandTotal}<span className="text-[14px] text-ink-3"> marks</span></p>
          <p className="mt-1 text-[11.5px] text-ink-3">{d.structure.mainsWrittenTotal} (Mains written) + {d.structure.interview} (Interview). The rank is decided here.</p>
        </Card>
      </div>
    </div>
  );
}

/* ── 3. AIR-1 BENCHMARK ───────────────────────────────────── */
function Benchmark({ d }: { d: Data }) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Your target & a realistic blueprint</p>
            <p className="mt-1 text-[11.5px] text-ink-3">Target final <b className="text-ink">{d.target.final}</b> · {d.target.source}. The per-paper targets below are scaled from the real topper averages — a template, not a prediction.</p>
          </div>
          <Link href="/settings" className="rounded-lg border border-line px-3 py-1.5 text-[11.5px] text-ink-2 hover:border-accent/40 hover:text-ink">Change target</Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {d.blueprint.map((b) => {
            const band = d.bands.find((x) => x.key === b.key);
            return (
              <div key={b.key} className="flex items-center gap-3">
                <div className="w-40 shrink-0"><p className="text-[12px] text-ink">{b.label}</p></div>
                <Bar value={Math.round((b.target / b.max) * 100)} />
                <span className="w-28 shrink-0 text-right font-mono text-[11px] text-ink-2">
                  {b.target}<span className="text-ink-3">/{b.max}</span>
                  {band && <span className="ml-1 text-[9.5px] text-ink-3">· top {band.top}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><Trophy size={13} className="text-amber-300" /> Real topper marksheets</p>
        <p className="mb-3 text-[11px] text-ink-3">Published UPSC results — your benchmark band per paper is computed from these.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-ink-3">
                {["Topper", "Yr", "Optional", "Essay", "GS-I", "GS-II", "GS-III", "GS-IV", "Opt", "Writ.", "Intv", "Final"].map((h) => (
                  <th key={h} className="border-b border-line px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.toppers.map((t) => (
                <tr key={t.name + t.year} className="text-ink-2 hover:bg-surface-2/40">
                  <td className="border-b border-line-subtle px-2 py-1.5 text-ink">{t.name}{t.air ? <span className="ml-1 rounded bg-amber-400/15 px-1 text-[9px] text-amber-300">AIR {t.air}</span> : null}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.year}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5 text-ink-3">{t.optional}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.essay}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.gs1}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.gs2}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.gs3}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.gs4}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5 font-medium text-accent">{t.opt1 + t.opt2}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.written}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5">{t.interview}</td>
                  <td className="border-b border-line-subtle px-2 py-1.5 font-semibold text-ink">{t.final}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">What the numbers teach</p>
        <ul className="space-y-2">
          {d.insights.map((i, k) => (
            <li key={k} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2"><ArrowRight size={13} className="mt-0.5 shrink-0 text-accent" />{i}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ── 4. SUBJECTS ──────────────────────────────────────────── */
function Subjects({ d }: { d: Data }) {
  const accBy = (d.metrics.pyqPractice.value as { accuracyBySubject: { subject: string; pct: number; attempted: number }[] }).accuracyBySubject ?? [];
  const accFor = (gs: string) => accBy.find((a) => a.subject === gs);
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="text-[11.5px] text-ink-3">Standard sources are well-established references. Your <b className="text-ink-2">accuracy</b> below is real (from self-rated PYQ attempts on this platform); it appears once you have ≥3 attempts in that GS paper. For the full topic-by-topic graph use the <Link href="/knowledge" className="text-accent hover:underline">Knowledge Hub</Link>.</p>
      </Card>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {d.subjects.map((s) => {
          const a = accFor(s.gsCode);
          return (
            <Card key={s.name} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[14px] font-semibold text-ink">{s.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">{s.note}</p>
                </div>
                <Chip tone="accent">{s.paper}</Chip>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {s.sources.map((src) => <span key={src} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">{src}</span>)}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-2.5">
                {a ? (
                  <>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Your PYQ accuracy</span>
                    <Bar value={a.pct} className="flex-1" />
                    <span className="font-mono text-[11px] text-ink-2">{a.pct}% · {a.attempted} attempts</span>
                  </>
                ) : (
                  <span className="text-[11px] text-ink-3">No accuracy yet — attempt PYQs in <Link href="/pyq" className="text-accent hover:underline">PYQ Intelligence</Link> to measure this.</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── 5. GAP ANALYSIS ──────────────────────────────────────── */
function Gap({ d }: { d: Data }) {
  const m = d.metrics;
  const cov = m.ncertCoverage.value as { done: number; total: number; pct: number };
  const pyq = m.pyqPractice.value as { attempted: number };
  const rev = m.revision.value as { totalCards: number; due: number; reviewed: number };
  const ca = m.currentAffairs.value as { read: number; total: number };
  const study = m.study.value as { minutes: number; sessions: number };
  const notes = m.notes.value as { count: number };

  const MetricRow = ({ label, value, pct, prov }: { label: string; value: string; pct?: number; prov: Prov }) => (
    <div className="flex items-center gap-3 border-b border-line-subtle py-3 last:border-0">
      <div className="w-48 shrink-0">
        <p className="text-[12.5px] text-ink">{label}</p>
      </div>
      <div className="flex-1">{typeof pct === "number" && <Bar value={pct} />}</div>
      <span className="w-32 shrink-0 text-right font-mono text-[11.5px] text-ink-2">{value}</span>
      <span className="w-14 shrink-0 text-right"><Source p={prov} /></span>
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Foundation readiness — measured from your real activity</p>
        <p className="mt-1 mb-2 text-[11.5px] text-ink-3">Every figure below is auditable. Tap “source” on any row to see exactly where it comes from.</p>
        <div className="mt-2">
          <MetricRow label="NCERT coverage" value={`${cov.done}/${cov.total} · ${cov.pct}%`} pct={cov.pct} prov={m.ncertCoverage} />
          <MetricRow label="PYQs attempted" value={`${pyq.attempted}`} prov={m.pyqPractice} />
          <MetricRow label="Current affairs read" value={`${ca.read} / ${ca.total}`} pct={ca.total ? Math.round((ca.read / ca.total) * 100) : 0} prov={m.currentAffairs} />
          <MetricRow label="Revision (SM-2)" value={`${rev.reviewed} done · ${rev.due} due`} prov={m.revision} />
          <MetricRow label="Deep-work logged" value={`${Math.floor(study.minutes / 60)}h ${study.minutes % 60}m · ${study.sessions}×`} prov={m.study} />
          <MetricRow label="Notes created" value={`${notes.count}`} prov={m.notes} />
        </div>
      </Card>

      <Card className="p-5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><AlertCircle size={13} className="text-amber-300" /> Not measured yet — shown honestly, never faked</p>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-line-subtle p-3">
            <p className="text-[12.5px] font-medium text-ink">Mains / Essay / Optional scores</p>
            <p className="mt-0.5 text-[11.5px] text-ink-3">{m.mainsAnswers.note}</p>
          </div>
          <div className="rounded-xl border border-line-subtle p-3">
            <p className="text-[12.5px] font-medium text-ink">Test-series performance</p>
            <p className="mt-0.5 text-[11.5px] text-ink-3">{m.tests.note}</p>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          Because written-paper scores aren’t evaluated yet, the platform will not show a “readiness %” or an AIR prediction against the {d.target.final} target — that would be a fabricated number. The benchmark tab shows what the score <i>looks like</i>; the rows above show what you’ve genuinely done toward it.
        </p>
      </Card>
    </div>
  );
}

/* ── 6. ROADMAP ───────────────────────────────────────────── */
function Roadmap({ d }: { d: Data }) {
  return (
    <div className="space-y-3">
      {d.roadmap.map((p, i) => (
        <Card key={p.when} className="p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 font-mono text-[11px] font-semibold text-accent">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-semibold text-ink">{p.title} <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-3">{p.when}</span></p>
              <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-1.5 text-[12px] text-ink-2"><Check size={12} className="mt-0.5 shrink-0 text-success" />{it}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}
      <Card className="p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-ink-2"><Network size={13} className="text-accent-2" /> Every phase connects to the platform: NCERTs, PYQ Intelligence, Current Affairs, Revision and the AI Mentor are all linked through the syllabus spine in the <Link href="/knowledge" className="text-accent hover:underline">Knowledge Hub</Link>.</p>
      </Card>
    </div>
  );
}
