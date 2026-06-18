"use client";

import { useState, useEffect, useCallback } from "react";
import { PenLine, Loader2, Sparkles, Check, ChevronDown, BarChart3, Library, X } from "lucide-react";
import { Card, Bar, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Breakdown { dimension: string; score: number; max: number; comment: string }
interface Answer {
  id: string; paperCode: string; questionText: string; maxMarks: number; answerText: string; wordCount: number;
  score: number | null; breakdown: Breakdown[] | null; strengths: string[]; improvements: string[]; verdict: string | null;
  createdAt: string;
}
interface ByPaper { paperCode: string; count: number; avgPct: number; avgScore: number }
interface PYQ { id: string; text: string; marks: number; year: number; paperCode: string }

const PAPERS = ["GS-I", "GS-II", "GS-III", "GS-IV", "ESSAY", "OPTIONAL"];
const MARKS = [10, 15, 20, 125, 250];

export default function AnswerLabPage() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [byPaper, setByPaper] = useState<ByPaper[]>([]);
  const [paper, setPaper] = useState("GS-III");
  const [marks, setMarks] = useState(10);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [pyqs, setPyqs] = useState<PYQ[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/answers").then((r) => r.json()).then((d: { answers: Answer[]; byPaper: ByPaper[] }) => {
      setAnswers(d.answers ?? []); setByPaper(d.byPaper ?? []);
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadPyqs = async () => {
    setPickerOpen(true); setPyqs([]);
    try { const d = await (await fetch(`/api/answers/questions?paper=${paper}`)).json() as { questions: PYQ[] }; setPyqs(d.questions ?? []); }
    catch { /* */ }
  };
  const pickPyq = (q: PYQ) => { setQuestion(q.text); setQuestionId(q.id); setMarks(MARKS.includes(q.marks) ? q.marks : 10); setPickerOpen(false); };

  const words = answer.split(/\s+/).filter(Boolean).length;

  const evaluate = async () => {
    setRunning(true); setErr(""); setResult(null);
    try {
      const r = await fetch("/api/answers/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, paperCode: paper, questionText: question, maxMarks: marks, answerText: answer }),
      });
      const d = await r.json() as Answer & { error?: string };
      if (d.error) setErr(d.error);
      else { setResult(d); load(); }
    } catch { setErr("Evaluation failed. Try again."); }
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <PenLine size={18} className="text-accent" /> Mains Answer Lab
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">Write descriptive answers · get a strict, realistic UPSC-style evaluation · build your real written-paper record</p>
      </div>

      {/* Per-paper averages — real */}
      {byPaper.length > 0 && (
        <Card className="mb-5 animate-fade-up p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2"><BarChart3 size={13} className="text-accent" /> Your evaluated averages</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {byPaper.map((b) => (
              <div key={b.paperCode} className="rounded-xl border border-line-subtle p-3 text-center">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3">{b.paperCode}</p>
                <p className="mt-1 font-display text-[20px] font-semibold text-ink">{b.avgPct}%</p>
                <p className="text-[10px] text-ink-3">{b.count} answer{b.count > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid animate-fade-up grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Writing column */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] text-ink outline-none">
                {PAPERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] text-ink outline-none">
                {MARKS.map((m) => <option key={m} value={m}>{m} marks</option>)}
              </select>
              <button onClick={() => { void loadPyqs(); }} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-ink-2 hover:border-accent/40 hover:text-ink">
                <Library size={13} /> Load a real PYQ <ChevronDown size={12} />
              </button>
            </div>

            <textarea value={question} onChange={(e) => { setQuestion(e.target.value); setQuestionId(null); }} rows={3} placeholder="Paste or type the question…"
              className="mt-3 w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent/50" />

            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={12} placeholder="Write your answer here…"
              className="mt-2 w-full resize-y rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent/50" />

            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[10.5px] text-ink-3">{words} words {marks <= 10 ? "· aim ~150" : marks <= 15 ? "· aim ~250" : ""}</span>
              <button onClick={() => { void evaluate(); }} disabled={running || words < 30}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-50">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {running ? "Evaluating…" : "Evaluate answer"}
              </button>
            </div>
            {err && <p className="mt-2 text-[11.5px] text-danger">{err}</p>}
          </Card>

          {/* History */}
          {answers.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Recent evaluations</p>
              <div className="space-y-1.5">
                {answers.slice(0, 8).map((a) => (
                  <button key={a.id} onClick={() => setResult(a)} className="flex w-full items-center gap-3 rounded-lg border border-line-subtle px-3 py-2 text-left hover:border-accent/40">
                    <span className="grid h-8 w-12 shrink-0 place-items-center rounded-md bg-accent/12 font-mono text-[11px] font-semibold text-accent">{a.score}/{a.maxMarks}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-ink">{a.questionText}</span>
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3">{a.paperCode} · {new Date(a.createdAt).toLocaleDateString("en-IN")}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Result column */}
        <div>
          {!result && <Card className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
            <PenLine size={26} className="text-ink-3" />
            <p className="mt-3 text-[13px] font-semibold text-ink">Your evaluation appears here</p>
            <p className="mt-1 max-w-[260px] text-[12px] text-ink-3">A strict examiner scores your answer realistically and shows exactly where the marks went — and where to improve.</p>
          </Card>}

          {result && <ResultCard a={result} />}
        </div>
      </div>

      {/* PYQ picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[10vh] backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="w-[640px] max-w-[92vw] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold text-ink">Real {paper} Mains questions</p>
              <button onClick={() => setPickerOpen(false)} className="text-ink-3 hover:text-ink"><X size={16} /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {pyqs.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-ink-3">No decoded {paper} questions yet — decode papers in PYQ Intelligence, or type your own question.</p>}
              {pyqs.map((q) => (
                <button key={q.id} onClick={() => pickPyq(q)} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-surface-2">
                  <span className="font-mono text-[9.5px] text-accent">{q.year} {q.paperCode} · {q.marks}m</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-2">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ a }: { a: Answer }) {
  const pct = a.score != null ? Math.round((a.score / a.maxMarks) * 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="font-display text-[34px] font-semibold leading-none text-ink">{a.score}<span className="text-[16px] text-ink-3">/{a.maxMarks}</span></p>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">{pct}% · {a.paperCode}</p>
        </div>
        {a.verdict && <p className="flex-1 text-[12.5px] italic leading-relaxed text-ink-2">“{a.verdict}”</p>}
      </div>

      {a.breakdown && a.breakdown.length > 0 && (
        <div className="mt-4 space-y-2">
          {a.breakdown.map((b, i) => (
            <div key={i}>
              <div className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-[11.5px] text-ink">{b.dimension}</span>
                <Bar value={b.max ? Math.round((b.score / b.max) * 100) : 0} className="flex-1" />
                <span className="w-12 shrink-0 text-right font-mono text-[10.5px] text-ink-2">{b.score}/{b.max}</span>
              </div>
              {b.comment && <p className="ml-44 pl-3 text-[10.5px] leading-snug text-ink-3">{b.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {a.strengths.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-success">Strengths</p>
          <ul className="space-y-1">{a.strengths.map((s, i) => <li key={i} className="flex gap-1.5 text-[12px] text-ink-2"><Check size={12} className="mt-0.5 shrink-0 text-success" />{s}</li>)}</ul>
        </div>
      )}
      {a.improvements.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-300">To improve</p>
          <ul className="space-y-1">{a.improvements.map((s, i) => <li key={i} className="flex gap-1.5 text-[12px] text-ink-2"><span className="mt-0.5 shrink-0 text-amber-300">→</span>{s}</li>)}</ul>
        </div>
      )}
      <p className="mt-4 border-t border-line-subtle pt-2 font-mono text-[9px] uppercase tracking-wider text-ink-3">AI examiner · {a.wordCount} words · realistic UPSC marking</p>
    </Card>
  );
}
