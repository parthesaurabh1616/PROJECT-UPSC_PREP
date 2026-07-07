"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, ChevronDown, ChevronRight, RefreshCw, Gavel } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

/* Revision → Current Affairs: one saved sheet per day, auto-compiled from
   the Examination Board's verdicts. This is the page you re-read — daily
   during prep, and again on exam eve via the one-liners and keyword cues. */

interface SheetItem {
  affairId: string; headline: string; category: string; verdict: string;
  scores: { prelims: number; mains: number; revision: number };
  w25: string; keywords3: string[]; oneDayBefore: string;
  staticLinks: { paper: string; topic: string }[]; traps: string[]; confusable: string;
}
interface Sheet {
  id: string; day: string; itemCount: number; judgedCount: number;
  content: { items: SheetItem[]; skipped: { count: number; headlines: string[] }; pendingJudgement: number };
}

export default function CaRevisionPage() {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/revision/ca-sheets", { cache: "no-store" }).then((r) => r.json())
      .then((j: { sheets: Sheet[] }) => {
        setSheets(j.sheets);
        if (j.sheets[0]) setOpen((s) => (s.size ? s : new Set([j.sheets[0].id]))); // today open by default
      })
      .catch(() => setSheets([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setBusy(true); await fetch("/api/revision/ca-sheets", { method: "POST" }).catch(() => {}); setBusy(false); load(); };
  const toggle = (id: string) => setOpen((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  if (sheets === null) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Compiling sheets…</div>;

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-4 flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
            <CalendarDays size={18} className="text-accent" /> Daily CA Revision Sheets
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            One sheet per day, auto-compiled from the Examination Board&apos;s verdicts and saved forever. Ranked by revision priority — read top-down.
          </p>
        </div>
        <button onClick={refresh} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent hover:bg-accent/20 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Refresh
        </button>
      </div>

      {sheets.length === 0 && (
        <Card className="p-6 text-[12.5px] leading-relaxed text-ink-3">
          No sheets yet — sheets appear automatically once the <Link href="/current-affairs" className="text-accent hover:underline">Examination Board</Link> has judged a day&apos;s news.
          Run the Board there (or let the nightly job do it) and this archive fills in day by day.
        </Card>
      )}

      <div className="space-y-3">
        {sheets.map((s) => {
          const isOpen = open.has(s.id);
          const d = new Date(s.day);
          return (
            <Card key={s.id} className="animate-fade-up p-0">
              <button onClick={() => toggle(s.id)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
                {isOpen ? <ChevronDown size={15} className="shrink-0 text-accent" /> : <ChevronRight size={15} className="shrink-0 text-ink-3" />}
                <p className="min-w-0 flex-1 font-display text-[15px] font-semibold text-ink">
                  {d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <span className="font-mono text-[10px] text-ink-3">
                  {s.itemCount} to revise · {s.content.skipped.count} skipped
                  {s.content.pendingJudgement > 0 ? ` · ${s.content.pendingJudgement} unjudged` : ""}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-line-subtle px-4 py-4">
                  {s.content.pendingJudgement > 0 && (
                    <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[11.5px] text-warning">
                      <Gavel size={12} /> {s.content.pendingJudgement} item{s.content.pendingJudgement === 1 ? "" : "s"} of this day not yet judged —
                      <Link href="/current-affairs" className="underline">run the Board</Link> and this sheet updates itself.
                    </p>
                  )}

                  {s.content.items.length === 0 && (
                    <p className="text-[12.5px] text-ink-3">The Board judged everything on this day as skippable — a legitimately free day. 🎉</p>
                  )}

                  <div className="space-y-3.5">
                    {s.content.items.map((it, idx) => (
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

                  {s.content.skipped.count > 0 && (
                    <details className="mt-3">
                      <summary className={cn("cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink-2")}>
                        ✗ {s.content.skipped.count} skipped by the Board (don&apos;t spend time here)
                      </summary>
                      <ul className="mt-1.5 space-y-0.5">
                        {s.content.skipped.headlines.map((h, i) => <li key={i} className="text-[11.5px] text-ink-3">✗ {h}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
