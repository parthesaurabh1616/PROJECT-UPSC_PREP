"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, Check, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamOpt {
  id: string; code: string; shortName: string; authority: string;
  languages: string[]; accentColor: string;
}

/** Sidebar exam switcher — UPSC / MPSC / future PCS. Drives the active
 *  exam profile that every module resolves syllabus + AI + language from. */
export function ExamSwitcher() {
  const [exams, setExams]   = useState<ExamOpt[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen]     = useState(false);
  const [busy, setBusy]     = useState(false);

  const load = useCallback(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((d: { exams: ExamOpt[]; activeCode: string | null }) => {
        setExams(Array.isArray(d.exams) ? d.exams : []);
        setActive(d.activeCode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchExam = async (code: string) => {
    if (code === active || busy) { setOpen(false); return; }
    setBusy(true);
    try {
      await fetch("/api/exams/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setActive(code);
      setOpen(false);
      // Reload so every page re-resolves against the new exam.
      window.location.reload();
    } finally { setBusy(false); }
  };

  const current = exams.find((e) => e.code === active);
  const isMaha = current?.code === "MPSC";

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-2.5 py-2 text-left transition-colors hover:border-accent/40"
      >
        <span className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
          isMaha ? "bg-gold/15 text-gold" : "bg-accent/15 text-accent",
        )}>
          <GraduationCap size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[12.5px] font-semibold leading-none text-ink">
            {current?.shortName ?? "Select exam"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-[0.18em] text-ink-3">
            {current?.languages.includes("mr") ? "EN · मराठी" : "Exam mode"}
          </p>
        </div>
        <ChevronDown size={13} className={cn("shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          {exams.map((e) => {
            const sel = e.code === active;
            const maha = e.code === "MPSC";
            return (
              <button key={e.id} onClick={() => { void switchExam(e.code); }} disabled={busy}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60",
                  sel && "bg-accent/8",
                )}>
                <span className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-md",
                  maha ? "bg-gold/15 text-gold" : "bg-accent/15 text-accent",
                )}>
                  <GraduationCap size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">{e.shortName}</p>
                  <p className="truncate font-mono text-[8.5px] uppercase tracking-[0.15em] text-ink-3">{e.authority}</p>
                </div>
                {sel && <Check size={13} className="shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
