"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Loader2, Check, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui";

interface Dates {
  examCode: string; shortName: string; targetYear: number | null;
  prelimsDate: string | null; mainsDate: string | null; interviewDate: string | null;
}

const toInput = (d: string | null) => d ? new Date(d).toISOString().slice(0, 10) : "";

export default function SettingsPage() {
  const [data, setData]     = useState<Dates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [form, setForm]     = useState({ targetYear: "", prelimsDate: "", mainsDate: "", interviewDate: "" });

  useEffect(() => {
    fetch("/api/exams/dates").then((r) => r.json()).then((d: Dates) => {
      setData(d);
      setForm({
        targetYear: d.targetYear ? String(d.targetYear) : "",
        prelimsDate: toInput(d.prelimsDate), mainsDate: toInput(d.mainsDate), interviewDate: toInput(d.interviewDate),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/exams/dates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetYear: form.targetYear ? Number(form.targetYear) : null,
          prelimsDate: form.prelimsDate || null,
          mainsDate: form.mainsDate || null,
          interviewDate: form.interviewDate || null,
        }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { /* */ }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-5 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <SettingsIcon size={18} className="text-accent" /> Settings
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{data?.shortName} · set your exact exam dates for a precise countdown</p>
      </div>

      <Card className="animate-fade-up p-6">
        <p className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <CalendarClock size={14} className="text-accent" /> Exam cycle
        </p>

        <div className="space-y-4">
          <Field label="Target year" hint="The CSE/PCS cycle you're preparing for">
            <input type="number" min={2024} max={2035} value={form.targetYear}
              onChange={(e) => setForm((f) => ({ ...f, targetYear: e.target.value }))}
              placeholder="e.g. 2027"
              className="w-40 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/50" />
          </Field>

          <Field label="Prelims date" hint="Leave blank to use an estimate from your target year">
            <DateInput value={form.prelimsDate} onChange={(v) => setForm((f) => ({ ...f, prelimsDate: v }))} />
          </Field>
          <Field label="Mains date" hint="Optional">
            <DateInput value={form.mainsDate} onChange={(v) => setForm((f) => ({ ...f, mainsDate: v }))} />
          </Field>
          <Field label="Interview date" hint="Optional">
            <DateInput value={form.interviewDate} onChange={(v) => setForm((f) => ({ ...f, interviewDate: v }))} />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-line-subtle pt-4">
          <button onClick={() => { void save(); }} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
          {saved && <span className="text-[12px] text-success">Saved — your dashboard countdown is now exact.</span>}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-subtle pb-4 last:border-0">
      <div>
        <p className="text-[13px] text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/50" />
  );
}
