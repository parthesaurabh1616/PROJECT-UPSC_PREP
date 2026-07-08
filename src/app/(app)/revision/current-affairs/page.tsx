"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, RefreshCw, Gavel, Layers, Network, ChevronDown } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CaDailyQuiz } from "@/components/CaDailyQuiz";

/* Revision → Current Affairs — calendar-first archive (scale-proof).
   One month grid, GitHub-heatmap style: each day cell is coloured by how
   much the Examination Board kept that day. Tap a day → ONLY that day's
   sheet loads. Month digest tab = the month's top items by revision
   priority (your monthly revision compilation). Never a jumbled list. */

interface SheetItem {
  affairId: string; headline: string; category: string; verdict: string;
  scores: { prelims: number; mains: number; revision: number };
  w25: string; keywords3: string[]; oneDayBefore: string;
  staticLinks: { paper: string; topic: string }[]; traps: string[]; confusable: string;
}
interface DayMeta { day: string; itemCount: number; skipped: number; pending: number }
interface Cluster { concept: string; papers: string[]; count: number; items: { day: string; affairId: string; headline: string; w25: string }[] }
interface Sheet { day: string; itemCount: number; content: { items: SheetItem[]; skipped: { count: number; headlines: string[] }; pendingJudgement: number } }

const fmtMonth = (m: string) => new Date(`${m}-15T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CaRevisionPage() {
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [days, setDays] = useState<DayMeta[]>([]);
  const [monthTop, setMonthTop] = useState<SheetItem[]>([]);
  const [monthItems, setMonthItems] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [view, setView] = useState<"day" | "month" | "concepts">("day");
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  /* index → months + latest day */
  useEffect(() => {
    fetch("/api/revision/ca-sheets", { cache: "no-store" }).then((r) => r.json())
      .then((j: { months: string[]; latestDay: string | null }) => {
        setMonths(j.months);
        if (j.latestDay) {
          const d = new Date(j.latestDay);
          setMonth(j.latestDay.slice(0, 7));
          setSelected(iso(d));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* month → calendar meta + digest */
  useEffect(() => {
    fetch(`/api/revision/ca-sheets?month=${month}`, { cache: "no-store" }).then((r) => r.json())
      .then((j: { days: DayMeta[]; top: SheetItem[]; monthItems: number }) => {
        setDays(j.days ?? []); setMonthTop(j.top ?? []); setMonthItems(j.monthItems ?? 0);
      })
      .catch(() => { setDays([]); setMonthTop([]); });
  }, [month]);

  /* concepts view → clusters (lazy) */
  useEffect(() => {
    if (view !== "concepts" || clusters !== null) return;
    fetch("/api/revision/ca-sheets?concepts=1", { cache: "no-store" }).then((r) => r.json())
      .then((j: { clusters: Cluster[] }) => setClusters(j.clusters)).catch(() => setClusters([]));
  }, [view, clusters]);

  /* selected day → ONE sheet */
  useEffect(() => {
    if (!selected) { setSheet(null); return; }
    setSheetLoading(true);
    fetch(`/api/revision/ca-sheets?day=${selected}`, { cache: "no-store" }).then((r) => r.json())
      .then((j: { sheet: Sheet | null }) => setSheet(j.sheet))
      .catch(() => setSheet(null))
      .finally(() => setSheetLoading(false));
  }, [selected]);

  const metaByDay = useMemo(() => new Map(days.map((d) => [iso(new Date(d.day)), d])), [days]);
  const sheetDays = useMemo(() => days.map((d) => iso(new Date(d.day))).sort(), [days]);

  /* keyboard ← → across days that have sheets */
  const step = useCallback((dir: 1 | -1) => {
    if (!sheetDays.length) return;
    const idx = selected ? sheetDays.indexOf(selected) : -1;
    const next = sheetDays[idx === -1 ? (dir === 1 ? 0 : sheetDays.length - 1) : Math.min(sheetDays.length - 1, Math.max(0, idx + dir))];
    if (next && next !== selected) { setSelected(next); setView("day"); }
  }, [sheetDays, selected]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const refresh = async () => { setBusy(true); await fetch("/api/revision/ca-sheets", { method: "POST" }).catch(() => {}); setBusy(false); setMonth((m) => m); setSelected((s) => s); location.reload(); };

  /* calendar grid (Mon-first) */
  const grid = useMemo(() => {
    const first = new Date(`${month}-01T00:00:00`);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday = 0
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const monthIdx = months.indexOf(month);
  const shiftMonth = (dir: 1 | -1) => {
    const d = new Date(`${month}-15T00:00:00`); d.setMonth(d.getMonth() + dir);
    setMonth(d.toISOString().slice(0, 7));
  };
  const today = iso(new Date());

  const intensity = (n: number) =>
    n === 0 ? "bg-surface-2/40 text-ink-3" : n <= 2 ? "bg-accent/15 text-ink" : n <= 5 ? "bg-accent/30 text-ink" : "bg-accent/50 text-white";

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading the archive…</div>;

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="mb-4 flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
            <CalendarDays size={18} className="text-accent" /> Daily CA Revision Sheets
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Pick a date — only that day loads. Colour = how much the Board kept that day. ← → to walk days.
          </p>
        </div>
        <button onClick={refresh} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent hover:bg-accent/20 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* ── Calendar ── */}
        <div>
          <Card className="animate-fade-up p-4">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => shiftMonth(-1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-2 hover:border-accent/40 hover:text-ink"><ChevronLeft size={14} /></button>
              <p className="font-display text-[14px] font-semibold text-ink">{fmtMonth(month)}</p>
              <button onClick={() => shiftMonth(1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-2 hover:border-accent/40 hover:text-ink"><ChevronRight size={14} /></button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <p key={i} className="text-center font-mono text-[9px] uppercase text-ink-3">{d}</p>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((c, i) => {
                if (!c) return <div key={i} />;
                const meta = metaByDay.get(c);
                const has = !!meta;
                return (
                  <button key={i}
                    onClick={() => { if (has) { setSelected(c); setView("day"); } }}
                    disabled={!has}
                    title={has ? `${meta!.itemCount} to revise · ${meta!.skipped} skipped${meta!.pending ? ` · ${meta!.pending} unjudged` : ""}` : "no sheet"}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-md text-[11px] font-medium transition-all",
                      has ? cn(intensity(meta!.itemCount), "cursor-pointer hover:ring-1 hover:ring-accent") : "text-ink-3/50",
                      selected === c && "ring-2 ring-accent",
                      c === today && "outline outline-1 outline-warning/60",
                    )}>
                    {Number(c.slice(8))}
                    {has && meta!.pending > 0 && <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-warning" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-ink-3">
                less <span className="h-2.5 w-2.5 rounded-sm bg-accent/15" /><span className="h-2.5 w-2.5 rounded-sm bg-accent/30" /><span className="h-2.5 w-2.5 rounded-sm bg-accent/50" /> more
              </div>
              <button onClick={() => { const t = sheetDays.includes(today) ? today : sheetDays[sheetDays.length - 1]; if (t) { setSelected(t); setMonth(t.slice(0, 7)); setView("day"); } }}
                className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent hover:underline">Latest</button>
            </div>
          </Card>

          {/* Month digest switch */}
          <Card className="mt-3 animate-fade-up p-3">
            <button onClick={() => setView(view === "month" ? "day" : "month")}
              className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors", view === "month" ? "bg-accent/10" : "hover:bg-surface-2/60")}>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink"><Layers size={13} className="text-accent-2" /> Month digest</span>
              <span className="font-mono text-[9.5px] text-ink-3">top {Math.min(20, monthItems)} of {monthItems}</span>
            </button>
            <p className="mt-1 px-2 text-[10.5px] text-ink-3">The month&apos;s highest-priority items in one read — your monthly revision pass.</p>
          </Card>

          {/* Concept view switch — news organised by knowledge node, date = metadata */}
          <Card className="mt-3 animate-fade-up p-3">
            <button onClick={() => setView(view === "concepts" ? "day" : "concepts")}
              className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors", view === "concepts" ? "bg-accent/10" : "hover:bg-surface-2/60")}>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink"><Network size={13} className="text-accent" /> Concept view</span>
              <span className="font-mono text-[9.5px] text-ink-3">{clusters ? `${clusters.length} nodes` : "→"}</span>
            </button>
            <p className="mt-1 px-2 text-[10.5px] text-ink-3">Recurring themes become one knowledge node — every new story enriches it instead of piling up.</p>
          </Card>
        </div>

        {/* ── Right: one day, the month digest, or the concept graph ── */}
        <div className="min-w-0">
          {view === "concepts" ? (
            <Card className="animate-fade-up p-5">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                <Network size={13} className="text-accent" /> Knowledge nodes — organised by concept, dated as metadata
              </p>
              <p className="mb-3 text-[11px] text-ink-3">A theme UPSC keeps returning to shows up here as one node with every story attached — natural repetition is the revision.</p>
              {clusters === null && <div className="flex items-center gap-2 py-6 text-ink-3"><Loader2 size={14} className="animate-spin" /> Clustering…</div>}
              {clusters?.length === 0 && <p className="text-[12.5px] text-ink-3">No judged items yet — run the Examination Board first.</p>}
              <div className="space-y-1.5">
                {clusters?.map((c) => {
                  const open = openCluster === c.concept;
                  return (
                    <div key={c.concept} className="rounded-xl border border-line-subtle">
                      <button onClick={() => setOpenCluster(open ? null : c.concept)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
                        {open ? <ChevronDown size={14} className="shrink-0 text-accent" /> : <ChevronRight size={14} className="shrink-0 text-ink-3" />}
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{c.concept}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {c.papers.slice(0, 2).map((p) => <Chip key={p} tone="accent-2">{p}</Chip>)}
                          <Chip tone={c.count > 1 ? "warning" : "muted"}>{c.count}×</Chip>
                        </span>
                      </button>
                      {open && (
                        <div className="space-y-2 border-t border-line-subtle px-3 py-3">
                          {c.items.map((it) => (
                            <div key={it.affairId}>
                              <p className="text-[12px] font-medium leading-snug text-ink">
                                <span className="mr-1.5 font-mono text-[9.5px] text-ink-3">{new Date(it.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                {it.headline}
                              </p>
                              {it.w25 && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">{it.w25}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : view === "month" ? (
            <Card className="animate-fade-up p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                <Layers size={13} className="text-accent-2" /> {fmtMonth(month)} — top {monthTop.length} by revision priority
              </p>
              {monthTop.length === 0 && <p className="text-[12.5px] text-ink-3">No judged items this month yet.</p>}
              <div className="space-y-2.5">
                {monthTop.map((it, i) => (
                  <div key={it.affairId} className="rounded-xl border border-line-subtle p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-ink"><span className="mr-1.5 font-mono text-[10px] text-ink-3">{i + 1}.</span>{it.headline}</p>
                      <span className="shrink-0 font-mono text-[9.5px] text-ink-3">R{it.scores.revision}</span>
                    </div>
                    {it.oneDayBefore && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">{it.oneDayBefore}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {it.keywords3.map((k, j) => <span key={j} className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9.5px] text-accent">{k}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : !selected ? (
            <Card className="animate-fade-up p-6 text-[12.5px] text-ink-3">Pick a coloured day on the calendar.</Card>
          ) : sheetLoading ? (
            <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={14} className="animate-spin" /> Loading {selected}…</div>
          ) : !sheet ? (
            <Card className="animate-fade-up p-6 text-[12.5px] leading-relaxed text-ink-3">
              No sheet for {selected}. Sheets appear once the <Link href="/current-affairs" className="text-accent hover:underline">Examination Board</Link> judges that day&apos;s news.
            </Card>
          ) : (
            <Card className="animate-fade-up p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-[16px] font-semibold text-ink">
                  {new Date(sheet.day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => step(-1)} className="grid h-6 w-6 place-items-center rounded border border-line text-ink-3 hover:text-ink"><ChevronLeft size={12} /></button>
                  <span className="font-mono text-[10px] text-ink-3">{sheet.itemCount} to revise · {sheet.content.skipped.count} skipped</span>
                  <button onClick={() => step(1)} className="grid h-6 w-6 place-items-center rounded border border-line text-ink-3 hover:text-ink"><ChevronRight size={12} /></button>
                </div>
              </div>

              {sheet.content.pendingJudgement > 0 && (
                <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[11.5px] text-warning">
                  <Gavel size={12} /> {sheet.content.pendingJudgement} item{sheet.content.pendingJudgement === 1 ? "" : "s"} not yet judged —
                  <Link href="/current-affairs" className="underline">run the Board</Link>; this sheet updates itself.
                </p>
              )}

              {sheet.content.items.length === 0 && (
                <p className="text-[12.5px] text-ink-3">The Board judged everything skippable this day — a legitimately free day. 🎉</p>
              )}

              <div className="space-y-3.5">
                {sheet.content.items.map((it, idx) => (
                  <div key={it.affairId} className="rounded-xl border border-line-subtle p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">
                        <span className="mr-1.5 font-mono text-[10px] text-ink-3">{idx + 1}.</span>{it.headline}
                      </p>
                      <span className="shrink-0 font-mono text-[9.5px] text-ink-3">P{it.scores.prelims} · M{it.scores.mains} · R{it.scores.revision}</span>
                    </div>
                    {it.w25 && <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{it.w25}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {it.keywords3.map((k, i) => <span key={i} className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">{k}</span>)}
                      {it.staticLinks.slice(0, 3).map((l, i) => <Chip key={i} tone="accent-2">{l.paper}</Chip>)}
                      {it.verdict === "MARGINAL" && <Chip tone="warning">marginal</Chip>}
                    </div>
                    {it.oneDayBefore && (
                      <p className="mt-2 rounded-lg border border-success/25 bg-success/5 px-2.5 py-1.5 text-[11.5px] text-ink">
                        <span className="font-mono text-[8.5px] uppercase tracking-wider text-success">exam eve → </span>{it.oneDayBefore}
                      </p>
                    )}
                    {it.traps.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 hover:text-warning">⚠ {it.traps.length} trap{it.traps.length === 1 ? "" : "s"}</summary>
                        <ul className="mt-1 space-y-1">{it.traps.map((tr, i) => <li key={i} className="text-[11.5px] leading-relaxed text-ink-2">⚠ {tr}</li>)}</ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {sheet.content.skipped.count > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink-2">
                    ✗ {sheet.content.skipped.count} skipped by the Board (don&apos;t spend time here)
                  </summary>
                  <ul className="mt-1.5 space-y-0.5">
                    {sheet.content.skipped.headlines.map((h, i) => <li key={i} className="text-[11.5px] text-ink-3">✗ {h}</li>)}
                  </ul>
                </details>
              )}

              {/* Daily MCQ drill — practice, don't just read */}
              {sheet.content.items.length > 0 && selected && <CaDailyQuiz day={selected} />}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
