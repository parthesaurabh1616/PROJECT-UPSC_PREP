"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ClipboardCheck, Loader2, Sparkles, Check, X, ChevronLeft, BarChart3 } from "lucide-react";
import { Card, Bar, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

const SUBJECTS = ["Mixed", "History", "Geography", "Polity", "Economy", "Environment", "Science & Tech", "Current Affairs"];
const COUNTS = [5, 10, 15, 25];

interface Q { id: string; subject: string; question: string; options: string[] }
interface ReviewItem { mcqId: string; subject: string; question: string; options: string[]; chosen: number | null; correctIndex: number; correct: boolean; explanation: string }
interface Result { id: string; total: number; correct: number; wrong: number; skipped: number; score: number; maxScore: number; percent: number; bySubject: { subject: string; correct: number; total: number }[]; review: ReviewItem[] }
interface Attempt { id: string; subject: string | null; mode: string; totalQ: number; correct: number; wrong: number; score: number; maxScore: number; percent: number; createdAt: string }

export default function TestsPage() {
  const [phase, setPhase] = useState<"config" | "run" | "result">("config");
  const [subject, setSubject] = useState("Mixed");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qs, setQs] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [hist, setHist] = useState<{ attempts: Attempt[]; avgPercent: number | null; bySubject: { subject: string; pct: number; total: number }[] } | null>(null);
  const started = useRef<number>(0);

  const loadHist = useCallback(() => { fetch("/api/tests").then((r) => r.json()).then(setHist).catch(() => {}); }, []);
  useEffect(() => { loadHist(); }, [loadHist]);

  const start = async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/tests/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, count }) });
      const d = await r.json() as { questions?: Q[]; error?: string };
      if (d.error) { setErr(d.error); }
      else { setQs(d.questions ?? []); setAnswers({}); setPhase("run"); started.current = Date.now(); }
    } catch { setErr("Couldn't start the test."); }
    setLoading(false);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const items = qs.map((q) => ({ mcqId: q.id, chosen: answers[q.id] ?? null }));
      const durationSec = Math.round((Date.now() - started.current) / 1000);
      const r = await fetch("/api/tests/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: subject === "Mixed" ? "mixed" : "subject", subject, durationSec, items }) });
      setResult(await r.json() as Result); setPhase("result"); loadHist();
    } catch { setErr("Submit failed."); }
    setLoading(false);
  };

  const reset = () => { setPhase("config"); setResult(null); setQs([]); setAnswers({}); };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <ClipboardCheck size={18} className="text-accent" /> Prelims Test Arena
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">Auto-graded MCQ tests · UPSC negative marking (+2 / −0.66) · builds your real Prelims record</p>
      </div>

      {phase === "config" && <Config subject={subject} setSubject={setSubject} count={count} setCount={setCount} loading={loading} err={err} onStart={() => { void start(); }} hist={hist} />}
      {phase === "run" && <Runner qs={qs} answers={answers} setAnswers={setAnswers} loading={loading} onSubmit={() => { void submit(); }} onBack={reset} />}
      {phase === "result" && result && <ResultView result={result} onAgain={reset} />}
    </div>
  );
}

function Config({ subject, setSubject, count, setCount, loading, err, onStart, hist }: {
  subject: string; setSubject: (s: string) => void; count: number; setCount: (n: number) => void;
  loading: boolean; err: string; onStart: () => void;
  hist: { attempts: Attempt[]; avgPercent: number | null; bySubject: { subject: string; pct: number; total: number }[] } | null;
}) {
  return (
    <div className="animate-fade-up space-y-5">
      <Card className="p-5">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Subject</p>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={cn("rounded-lg px-3 py-1.5 text-[12px] transition-colors", subject === s ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>{s}</button>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2">Questions</p>
        <div className="flex flex-wrap gap-1.5">
          {COUNTS.map((c) => (
            <button key={c} onClick={() => setCount(c)} className={cn("rounded-lg px-3.5 py-1.5 text-[12px] transition-colors", count === c ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>{c}</button>
          ))}
        </div>
        <button onClick={onStart} disabled={loading} className="mt-5 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {loading ? "Building your test…" : "Start test"}
        </button>
        {err && <p className="mt-2 text-[11.5px] text-danger">{err}</p>}
      </Card>

      {hist && hist.attempts.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-2"><BarChart3 size={13} className="text-accent" /> Your record</p>
            <Chip tone="accent">{hist.attempts.length} tests · avg {hist.avgPercent}%</Chip>
          </div>
          {hist.bySubject.length > 0 && (
            <div className="mt-3 space-y-2">
              {hist.bySubject.map((b) => (
                <div key={b.subject} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[12px] text-ink">{b.subject}</span>
                  <Bar value={b.pct} className="flex-1" />
                  <span className="w-24 shrink-0 text-right font-mono text-[10.5px] text-ink-2">{b.pct}% · {b.total} Q</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Runner({ qs, answers, setAnswers, loading, onSubmit, onBack }: {
  qs: Q[]; answers: Record<string, number>; setAnswers: (f: (a: Record<string, number>) => Record<string, number>) => void;
  loading: boolean; onSubmit: () => void; onBack: () => void;
}) {
  const answered = Object.keys(answers).length;
  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink"><ChevronLeft size={14} /> Cancel</button>
        <Chip tone="accent">{answered}/{qs.length} answered</Chip>
      </div>
      <div className="space-y-3">
        {qs.map((q, i) => (
          <Card key={q.id} className="p-4">
            <div className="flex items-start gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/12 font-mono text-[11px] font-semibold text-accent">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-relaxed text-ink">{q.question}</p>
                <div className="mt-2.5 space-y-1.5">
                  {q.options.map((o, j) => (
                    <button key={j} onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
                      className={cn("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                        answers[q.id] === j ? "border-accent bg-accent/10 text-ink" : "border-line-subtle text-ink-2 hover:border-accent/40")}>
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]", answers[q.id] === j ? "border-accent bg-accent text-white" : "border-ink-3 text-ink-3")}>{String.fromCharCode(97 + j)}</span>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-4 mt-4 flex justify-end">
        <button onClick={onSubmit} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-6 py-2.5 text-[13px] font-medium text-white shadow-soft disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Submit & grade
        </button>
      </div>
    </div>
  );
}

function ResultView({ result, onAgain }: { result: Result; onAgain: () => void }) {
  return (
    <div className="animate-fade-up space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="font-display text-[34px] font-semibold leading-none text-ink">{result.score}<span className="text-[15px] text-ink-3">/{result.maxScore}</span></p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">{result.percent}% score</p>
            </div>
            <div className="flex gap-3 text-[12px]">
              <span className="text-success">✓ {result.correct} correct</span>
              <span className="text-danger">✗ {result.wrong} wrong</span>
              <span className="text-ink-3">– {result.skipped} skipped</span>
            </div>
          </div>
          <button onClick={onAgain} className="rounded-lg bg-accent px-4 py-2 text-[12.5px] font-medium text-white">New test</button>
        </div>
        {result.bySubject.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {result.bySubject.map((b) => <Chip key={b.subject} tone="accent">{b.subject}: {b.correct}/{b.total}</Chip>)}
          </div>
        )}
        <p className="mt-3 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">Graded with UPSC marking · +2 correct, −0.66 wrong · saved to your record</p>
      </Card>

      <div className="space-y-2.5">
        {result.review.map((r, i) => (
          <Card key={r.mcqId} className={cn("p-4", r.correct ? "border-success/30" : r.chosen !== null ? "border-danger/30" : "")}>
            <div className="flex items-start gap-2">
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold", r.correct ? "bg-success/15 text-success" : r.chosen !== null ? "bg-danger/15 text-danger" : "bg-surface-2 text-ink-3")}>{r.correct ? <Check size={13} /> : r.chosen !== null ? <X size={13} /> : i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-ink">{r.question}</p>
                <div className="mt-2 space-y-1">
                  {r.options.map((o, j) => (
                    <p key={j} className={cn("rounded px-2 py-1 text-[11.5px]",
                      j === r.correctIndex ? "bg-success/12 text-success" : j === r.chosen ? "bg-danger/12 text-danger" : "text-ink-3")}>
                      {String.fromCharCode(97 + j)}. {o}
                      {j === r.correctIndex && <span className="ml-1 font-mono text-[9px]">✓ answer</span>}
                      {j === r.chosen && j !== r.correctIndex && <span className="ml-1 font-mono text-[9px]">your pick</span>}
                    </p>
                  ))}
                </div>
                {r.explanation && <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3"><b className="text-ink-2">Why:</b> {r.explanation}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
