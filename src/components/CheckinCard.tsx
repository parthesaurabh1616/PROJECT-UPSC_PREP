"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

/* COS M5 capture — the 20-second daily check-in (04:00 day boundary).
   Insights only ever appear in the Weekly Review, after evidence gates. */

interface Checkin {
  sleepHrs: number | null; energy: number | null; mood: number | null; stress: number | null;
  focus: number | null; confidence: number | null; distraction: number | null; note: string | null;
}
const FACTORS: { key: keyof Checkin; label: string }[] = [
  { key: "energy", label: "Energy" }, { key: "mood", label: "Mood" }, { key: "stress", label: "Stress" },
  { key: "focus", label: "Focus" }, { key: "confidence", label: "Confidence" }, { key: "distraction", label: "Distraction" },
];

export function CheckinCard() {
  const [c, setC] = useState<Checkin>({ sleepHrs: 7, energy: 3, mood: 3, stress: 3, focus: 3, confidence: 3, distraction: 3, note: null });
  const [saved, setSaved] = useState<boolean | null>(null); // null = loading
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/cos/checkin", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { checkin: Checkin | null }) => {
        if (j.checkin) { setC({ ...j.checkin }); setSaved(true); }
        else setSaved(false);
      })
      .catch(() => setSaved(false));
  }, []);

  const save = async () => {
    setBusy(true);
    await fetch("/api/cos/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).catch(() => {});
    setBusy(false); setSaved(true); setEditing(false);
  };

  if (saved === null) return null;

  if (saved && !editing) {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
            <HeartPulse size={13} className="text-success" /> Daily check-in
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-mono text-[9px] text-success"><Check size={9} /> done</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-ink-3">
            <span>😴 {c.sleepHrs ?? "—"}h</span>
            {FACTORS.map((f) => <span key={f.key}>{f.label.slice(0, 4)} {c[f.key] ?? "—"}</span>)}
            <button onClick={() => setEditing(true)} className="text-accent hover:underline">edit</button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
        <HeartPulse size={13} className="text-accent-2" /> Daily check-in <span className="font-mono text-[9px] normal-case tracking-normal text-ink-3">~20 seconds · feeds your weekly insights</span>
      </p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <div className="flex items-center justify-between"><span className="text-[10.5px] text-ink-2">Sleep</span><span className="font-mono text-[10px] text-ink">{c.sleepHrs}h</span></div>
          <input type="range" min={3} max={11} step={0.5} value={c.sleepHrs ?? 7}
            onChange={(e) => setC({ ...c, sleepHrs: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
        </div>
        {FACTORS.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between"><span className="text-[10.5px] text-ink-2">{f.label}</span><span className="font-mono text-[10px] text-ink">{c[f.key] as number}</span></div>
            <input type="range" min={1} max={5} step={1} value={(c[f.key] as number) ?? 3}
              onChange={(e) => setC({ ...c, [f.key]: Number(e.target.value) })} className={cn("w-full", f.key === "stress" || f.key === "distraction" ? "accent-[var(--danger)]" : "accent-[var(--accent)]")} />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <input value={c.note ?? ""} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="one-line note (optional)"
          className="flex-1 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none" />
        <button onClick={save} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white transition-all hover:brightness-110 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
        </button>
      </div>
    </Card>
  );
}
