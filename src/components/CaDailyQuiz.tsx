"use client";

import { useCallback, useEffect, useState } from "react";
import { Target, Loader2, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Daily CA MCQ drill — UPSC-style questions generated from the day's
   Board-judged items (traps become distractors). Answers stay on the
   server until submission; every submission is a REAL TestAttempt that
   feeds the same accuracy analytics as the Test Arena. */

interface QuizQ { question: string; options: string[]; concept: string }
interface QuizT { mcqs: QuizQ[]; generatedAt: string; attempts: { at: string; percent: number; correct: number }[] }
interface ReviewT { question: string; options: string[]; chosen: number | null; correctIndex: number; correct: boolean; explanation: string; concept: string }

export function CaDailyQuiz({ day }: { day: string }) {
  const [quiz, setQuiz] = useState<QuizT | null | undefined>(undefined); // undefined = loading
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ percent: number; correct: number; wrong: number; skipped: number; score: number; maxScore: number; review: ReviewT[] } | null>(null);

  const load = useCallback(() => {
    setQuiz(undefined); setResult(null); setErr("");
    fetch(`/api/revision/ca-sheets/quiz?day=${day}`, { cache: "no-store" }).then((r) => r.json())
      .then((j: { quiz: QuizT | null }) => { setQuiz(j.quiz); setChoices(new Array(j.quiz?.mcqs.length ?? 0).fill(null)); })
      .catch(() => setQuiz(null));
  }, [day]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/revision/ca-sheets/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day }) }).then((x) => x.json()).catch(() => ({ error: "network" }));
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setQuiz(r.quiz); setChoices(new Array(r.quiz.mcqs.length).fill(null)); setResult(null);
  };

  const submit = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/revision/ca-sheets/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day, choices }) }).then((x) => x.json()).catch(() => ({ error: "network" }));
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setResult(r);
  };

  if (quiz === undefined) return null;

  return (
    <div className="mt-4 rounded-xl border border-accent-2/25 bg-accent-2/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-2">
          <Target size={12} /> Daily MCQ drill <span className="normal-case tracking-normal text-ink-3">· UPSC-style, from this day&apos;s worthy news · counts in your real accuracy</span>
        </p>
        {quiz?.attempts && quiz.attempts.length > 0 && (
          <span className="font-mono text-[9.5px] text-ink-3">
            {quiz.attempts.length} attempt{quiz.attempts.length === 1 ? "" : "s"} · best {Math.max(...quiz.attempts.map((a) => a.percent))}%
          </span>
        )}
      </div>
      {err && <p className="mt-2 text-[11.5px] text-warning">{err}</p>}

      {!quiz && (
        <button onClick={generate} disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-2 hover:bg-accent-2/20 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Generate today&apos;s 10 MCQs
        </button>
      )}

      {quiz && !result && (
        <div className="mt-3 space-y-4">
          {quiz.mcqs.map((m, i) => (
            <div key={i}>
              <p className="whitespace-pre-wrap text-[12.5px] font-medium leading-relaxed text-ink">
                <span className="mr-1 font-mono text-[10px] text-ink-3">Q{i + 1}.</span>{m.question}
              </p>
              <div className="mt-1.5 grid grid-cols-1 gap-1 md:grid-cols-2">
                {m.options.map((o, oi) => (
                  <button key={oi} onClick={() => setChoices((c) => c.map((x, j) => (j === i ? (x === oi ? null : oi) : x)))}
                    className={cn("rounded-lg border px-2.5 py-1.5 text-left text-[12px] leading-snug transition-colors",
                      choices[i] === oi ? "border-accent bg-accent/15 text-ink" : "border-line text-ink-2 hover:border-accent/40")}>
                    <span className="mr-1.5 font-mono text-[10px] text-ink-3">{"ABCD"[oi]}.</span>{o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Submit ({choices.filter((c) => c !== null).length}/{quiz.mcqs.length} answered)
            </button>
            <span className="font-mono text-[9.5px] text-ink-3">UPSC marking: +2 correct · −0.66 wrong · skip = 0</span>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3">
          <div className="rounded-lg border border-line bg-surface-2/40 px-3 py-2.5">
            <p className="font-display text-[16px] font-semibold text-ink">
              {result.score} / {result.maxScore} <span className="text-[12px] text-ink-3">({result.percent}%)</span>
            </p>
            <p className="font-mono text-[10px] text-ink-3">{result.correct} correct · {result.wrong} wrong · {result.skipped} skipped — recorded in your Test analytics</p>
          </div>
          <div className="mt-3 space-y-3">
            {result.review.map((r, i) => (
              <div key={i} className={cn("rounded-lg border p-2.5", r.correct ? "border-success/30" : r.chosen === null ? "border-line" : "border-danger/30")}>
                <p className="whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-ink">
                  {r.correct ? <Check size={12} className="mr-1 inline text-success" /> : r.chosen === null ? null : <X size={12} className="mr-1 inline text-danger" />}
                  Q{i + 1}. {r.question}
                </p>
                <p className="mt-1 text-[11.5px] text-ink-2">
                  ✓ <span className="font-medium">{"ABCD"[r.correctIndex]}. {r.options[r.correctIndex]}</span>
                  {r.chosen !== null && !r.correct && <span className="text-danger"> · you chose {"ABCD"[r.chosen]}</span>}
                </p>
                {r.explanation && <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{r.explanation}</p>}
                {r.concept && <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-accent-2">concept: {r.concept}</p>}
              </div>
            ))}
          </div>
          <button onClick={() => { setResult(null); setChoices(new Array(quiz?.mcqs.length ?? 0).fill(null)); }}
            className="mt-3 rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:border-accent/40 hover:text-ink">
            Retry drill
          </button>
        </div>
      )}
    </div>
  );
}
