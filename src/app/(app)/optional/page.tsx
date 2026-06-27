"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Scale, Loader2, Trophy, BarChart3, BookMarked, ArrowRight, Medal } from "lucide-react";
import { Card, Chip, Bar } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Stat {
  key: string; label: string; papersExtracted: number; questions: number; years: number[]; avgMarks: number | null;
  directives: { k: string; c: number }[]; topKeywords: { k: string; c: number }[]; topTopics: { k: string; c: number }[];
}
interface Data {
  coverage: { questionsAnalysed: number; note: string };
  stats: Stat[];
  overlap: ({ stage: string } & Record<string, number>)[];
  factors: { factor: string; SOC: string; PSIR: string; PUBAD: string }[];
}

const COLS = [{ key: "SOC", label: "Sociology" }, { key: "PSIR", label: "PSIR" }, { key: "PUBAD", label: "Public Admin" }];
const cell = (n: number) => n >= 5 ? "bg-emerald-500/25 text-emerald-200" : n >= 4 ? "bg-emerald-500/15 text-emerald-300" : n >= 3 ? "bg-amber-400/15 text-amber-300" : n >= 2 ? "bg-surface-2 text-ink-2" : "bg-surface-2/50 text-ink-3";

export default function OptionalPage() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/optional-analysis", { cache: "no-store" }).then((r) => r.json()).then((j: Data) => setD(j)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Crunching the optional papers…</div>;
  if (!d) return <div className="py-20 text-ink-3">Couldn’t load the analysis.</div>;

  const stat = (k: string) => d.stats.find((s) => s.key === k);

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Scale size={18} className="text-accent" /> Optional Decision — data-backed
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          Sociology vs PSIR vs Public Administration · {d.coverage.questionsAnalysed} optional PYQs decoded & analysed + verbatim syllabus-overlap mapping
        </p>
      </div>

      {/* Verdict */}
      <div className="mb-5 grid animate-fade-up grid-cols-1 gap-4 lg:grid-cols-3">
        <VerdictCard rank="Primary" medal="🥇" subject="Sociology" tone="border-emerald-500/40"
          why="Best ROI for a 1-year first attempt: smallest finishable syllabus, strongest Essay engine, near 1:1 with GS-I society, and the most consistent scoring of the three." />
        <VerdictCard rank="Strong alternative" medal="🥈" subject="PSIR" tone="border-amber-400/30"
          why="Broadest cross-stage footprint — powers Prelims (polity), GS-II + IR, Essay and the Interview/current-affairs the most. Cost: largest & most CA-volatile." />
        <VerdictCard rank="Third" medal="🥉" subject="Public Administration" tone="border-line"
          why="Outstanding GS-II + GS-IV (ethics) + Interview overlap — you study to BE the administrator. Risk: recent years' stingy, unpredictable marking." />
      </div>

      {/* Overlap matrix */}
      <Card className="mb-5 animate-fade-up p-5">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><BookMarked size={13} className="text-accent" /> Syllabus-overlap matrix</p>
        <p className="mb-3 text-[11px] text-ink-3">Each optional’s official syllabus mapped onto every exam stage (5 = near 1:1). Deterministic from the verbatim UPSC + optional syllabi.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr className="text-ink-3">
              <th className="px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wider">Stage</th>
              {COLS.map((c) => <th key={c.key} className="px-2 py-1.5 text-center font-mono text-[9.5px] uppercase tracking-wider">{c.label}</th>)}
            </tr></thead>
            <tbody>
              {d.overlap.map((row) => (
                <tr key={row.stage}>
                  <td className="border-t border-line-subtle px-2 py-1.5 text-ink-2">{row.stage}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="border-t border-line-subtle px-2 py-1.5 text-center">
                      <span className={cn("inline-block w-8 rounded py-0.5 text-[11px] font-semibold", cell(row[c.key] as number))}>{row[c.key]}</span>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="border-t border-line px-2 py-1.5 text-ink">Total (40 max)</td>
                {COLS.map((c) => {
                  const sum = d.overlap.reduce((s, r) => s + (r[c.key] as number), 0);
                  return <td key={c.key} className="border-t border-line px-2 py-1.5 text-center text-accent">{sum}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Real PYQ evidence per optional */}
      <Card className="mb-5 animate-fade-up p-5">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><BarChart3 size={13} className="text-accent-2" /> Real PYQ evidence (decoded papers)</p>
        <p className="mb-3 text-[11px] text-ink-3">Computed live from optional question papers actually decoded into your platform — directive-word mix and recurring themes per optional.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLS.map((c) => {
            const s = stat(c.key);
            if (!s) return null;
            const maxDir = Math.max(1, ...s.directives.map((x) => x.c));
            return (
              <div key={c.key} className="rounded-xl border border-line-subtle p-3.5">
                <p className="font-display text-[14px] font-semibold text-ink">{s.label}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  {s.questions > 0 ? <>{s.questions} Q · {s.papersExtracted} papers · {s.years.length ? `${s.years[0]}–${s.years[s.years.length - 1]}` : "—"}</> : "not decoded yet"}
                </p>
                {s.directives.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">Directive words</p>
                    {s.directives.slice(0, 6).map((dw) => (
                      <div key={dw.k} className="mb-1 flex items-center gap-2">
                        <span className="w-16 shrink-0 text-[10.5px] capitalize text-ink-2">{dw.k}</span>
                        <Bar value={Math.round((dw.c / maxDir) * 100)} className="flex-1" />
                        <span className="w-6 shrink-0 text-right font-mono text-[9.5px] text-ink-3">{dw.c}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.topKeywords.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">Recurring themes</p>
                    <div className="flex flex-wrap gap-1">
                      {s.topKeywords.slice(0, 10).map((k) => (
                        <span key={k.k} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-2">{k.k}{k.c > 1 ? ` ·${k.c}` : ""}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Completability factors */}
      <Card className="mb-5 animate-fade-up p-5">
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><Medal size={13} className="text-gold" /> Fit for a 1-year, from-scratch run</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead><tr className="text-ink-3">
              <th className="px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wider">Factor</th>
              {COLS.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wider">{c.label}</th>)}
            </tr></thead>
            <tbody>
              {d.factors.map((f) => (
                <tr key={f.factor}>
                  <td className="border-t border-line-subtle px-2 py-1.5 text-ink">{f.factor}</td>
                  <td className="border-t border-line-subtle px-2 py-1.5 text-ink-2">{f.SOC}</td>
                  <td className="border-t border-line-subtle px-2 py-1.5 text-ink-2">{f.PSIR}</td>
                  <td className="border-t border-line-subtle px-2 py-1.5 text-ink-2">{f.PUBAD}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="animate-fade-up p-4">
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <ArrowRight size={13} className="text-accent" /> The matrix is deterministic from the official syllabi; the PYQ evidence grows as you decode more optional papers in <Link href="/pyq" className="text-accent hover:underline">PYQ Intelligence</Link>. Browse the full syllabi in <Link href="/syllabus" className="text-accent hover:underline">Syllabus Intelligence</Link>.
        </p>
      </Card>
    </div>
  );
}

function VerdictCard({ rank, medal, subject, why, tone }: { rank: string; medal: string; subject: string; why: string; tone: string }) {
  return (
    <Card className={cn("p-4", tone)}>
      <div className="flex items-center gap-2">
        <span className="text-[20px]">{medal}</span>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{rank}</p>
          <p className="font-display text-[15px] font-semibold text-ink">{subject}</p>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">{why}</p>
    </Card>
  );
}
