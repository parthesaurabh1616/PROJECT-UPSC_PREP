"use client";

import { useCallback, useEffect, useState } from "react";
import { Gavel, Loader2, Plus, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

/* COS M4 — Decision Journal. Big decisions are made once, recorded with
   their evidence, and reviewed on schedule — not re-litigated at 2 AM. */

interface Rec {
  id: string; decidedAt: string; title: string; decision: string; reason: string;
  evidence: string | null; alternatives: string | null; expectedOutcome: string | null;
  reviewAt: string | null; status: string; reviewNote: string | null;
}

const STATUS_TONE: Record<string, "success" | "warning" | "muted"> = { ACTIVE: "success", REVIEWED: "muted", SUPERSEDED: "warning" };

export default function DecisionsPage() {
  const [records, setRecords] = useState<Rec[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", decision: "", reason: "", alternatives: "", expectedOutcome: "", reviewAt: "" });

  const load = useCallback(() => {
    fetch("/api/cos/decisions", { cache: "no-store" }).then((r) => r.json())
      .then((j: { records: Rec[] }) => setRecords(j.records)).catch(() => setRecords([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setOpen((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const create = async () => {
    setBusy(true);
    await fetch("/api/cos/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => {});
    setBusy(false); setShowAdd(false);
    setForm({ title: "", decision: "", reason: "", alternatives: "", expectedOutcome: "", reviewAt: "" });
    load();
  };

  const review = async (r: Rec) => {
    const note = window.prompt(`Review "${r.title}" — how did it hold up?`, r.reviewNote ?? "");
    if (note === null) return;
    await fetch("/api/cos/decisions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status: "REVIEWED", reviewNote: note }) }).catch(() => {});
    load();
  };

  if (records === null) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading the journal…</div>;

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
            <Gavel size={18} className="text-accent" /> Decision Journal
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Decided once, recorded with evidence, reviewed on schedule — never re-litigated at 2 AM.
          </p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20">
          <Plus size={12} /> Record a decision
        </button>
      </div>

      {showAdd && (
        <Card className="mb-4 animate-fade-up space-y-2 p-5">
          {([["title", "Decision title"], ["decision", "What exactly was decided?"], ["reason", "Why? (the core reasoning)"], ["alternatives", "Alternatives considered (optional)"], ["expectedOutcome", "Expected outcome (optional)"]] as const).map(([k, ph]) => (
            <input key={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph}
              className="w-full rounded-lg border border-line bg-surface-2/40 px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none" />
          ))}
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Review on</label>
            <input type="date" value={form.reviewAt} onChange={(e) => setForm({ ...form, reviewAt: e.target.value })}
              className="rounded-lg border border-line bg-surface-2/40 px-2 py-1.5 text-[12px] text-ink focus:outline-none" />
            <button onClick={create} disabled={busy || !form.title.trim() || !form.decision.trim() || !form.reason.trim()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white hover:brightness-110 disabled:opacity-40">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Record
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-2.5">
        {records.map((r) => {
          const isOpen = open.has(r.id);
          const reviewDue = r.status === "ACTIVE" && r.reviewAt && new Date(r.reviewAt) <= new Date();
          return (
            <Card key={r.id} className={cn("animate-fade-up p-0", reviewDue && "border-warning/40")}>
              <button onClick={() => toggle(r.id)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
                {isOpen ? <ChevronDown size={14} className="shrink-0 text-accent" /> : <ChevronRight size={14} className="shrink-0 text-ink-3" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{r.title}</p>
                  <p className="font-mono text-[9.5px] text-ink-3">
                    decided {new Date(r.decidedAt).toLocaleDateString()}
                    {r.reviewAt ? ` · review ${new Date(r.reviewAt).toLocaleDateString()}` : ""}
                    {reviewDue ? " · REVIEW DUE" : ""}
                  </p>
                </div>
                <Chip tone={STATUS_TONE[r.status] ?? "muted"}>{r.status}</Chip>
              </button>
              {isOpen && (
                <div className="space-y-2.5 border-t border-line-subtle px-4 py-3.5">
                  <Field label="Decision" text={r.decision} />
                  <Field label="Reason" text={r.reason} />
                  {r.evidence && <Field label="Evidence" text={r.evidence} />}
                  {r.alternatives && <Field label="Alternatives considered" text={r.alternatives} />}
                  {r.expectedOutcome && <Field label="Expected outcome" text={r.expectedOutcome} />}
                  {r.reviewNote && <Field label="Review note" text={r.reviewNote} />}
                  {r.status === "ACTIVE" && (
                    <button onClick={() => review(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 transition-colors hover:border-accent/40 hover:text-ink">
                      <Check size={11} /> Mark reviewed
                    </button>
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

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}
