"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Loader2 } from "lucide-react";
import { Card, Chip, Bar } from "@/components/ui";
import { cn } from "@/lib/utils";

/* COS macro layer — tracked topics with live Ebbinghaus retention and the
   1/7/21/60/120 revision ladder. Due topics are gradable right here (E9:
   works with or without an active sprint). Cards (SM-2) stay separate. */

interface TopicT {
  id: string; nodeId: string; title: string; status: string; ladderStage: number;
  retention: number; lastGrade: number | null; nextRevisionAt: string | null; due: boolean;
}

const STATUS_TONE: Record<string, "accent" | "accent-2" | "success" | "warning" | "danger" | "muted"> = {
  TOUCHED: "muted", REVISING: "accent", MASTERED: "success", DECAYED: "danger", PROCESSED: "accent-2", PRACTICED: "accent-2",
};

export function TopicMemoryPanel() {
  const [topics, setTopics] = useState<TopicT[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/cos/topics", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { topics?: TopicT[] }) => setTopics(j.topics ?? []))
      .catch(() => setTopics([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const grade = async (t: TopicT, g: number) => {
    setBusy(t.id);
    await fetch("/api/cos/topics", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: t.id, grade: g }) }).catch(() => {});
    setBusy(null);
    load();
  };

  if (topics === null) return null;

  const due = topics.filter((t) => t.due);
  const upcoming = topics.filter((t) => !t.due).slice(0, 6);

  return (
    <Card className="animate-fade-up p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <Brain size={13} className="text-accent-2" /> Topic memory · revision ladder
        </p>
        <span className="font-mono text-[10px] text-ink-3">{topics.length} tracked · {due.length} due</span>
      </div>
      <p className="mb-3 text-[11px] text-ink-3">
        1d → 7d → 21d → 60d → 120d. Track topics from the <Link href="/syllabus" className="text-accent hover:underline">Syllabus</Link> — revisions schedule themselves.
      </p>

      {topics.length === 0 && (
        <p className="py-2 text-[12px] text-ink-3">Nothing tracked yet. Open a topic on the Syllabus page and press “I studied this”.</p>
      )}

      {due.length > 0 && (
        <div className="mb-3 space-y-2">
          {due.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-ink">{t.title}</p>
                <p className="font-mono text-[9.5px] text-ink-3">stage R{Math.max(1, t.ladderStage)} · est. retention {t.retention}%</p>
              </div>
              <span className="mr-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-3">recall</span>
              {[1, 2, 3, 4, 5].map((g) => (
                <button key={g} disabled={busy === t.id} onClick={() => grade(t, g)}
                  className={cn("grid h-6 w-6 place-items-center rounded-md border font-mono text-[10.5px] transition-colors disabled:opacity-40",
                    g >= 4 ? "border-success/40 text-success hover:bg-success/15" : g === 3 ? "border-warning/40 text-warning hover:bg-warning/15" : "border-danger/40 text-danger hover:bg-danger/15")}>
                  {busy === t.id ? <Loader2 size={9} className="animate-spin" /> : g}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          {upcoming.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-1">
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">{t.title}</span>
              <Bar value={t.retention} className="h-1 w-28" />
              <span className="w-9 text-right font-mono text-[9.5px] tabular-nums text-ink-3">{t.retention}%</span>
              <Chip tone={STATUS_TONE[t.status] ?? "muted"}>{t.status === "REVISING" ? `R${t.ladderStage}` : t.status}</Chip>
              <span className="w-20 text-right font-mono text-[9.5px] text-ink-3">
                {t.nextRevisionAt ? new Date(t.nextRevisionAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
