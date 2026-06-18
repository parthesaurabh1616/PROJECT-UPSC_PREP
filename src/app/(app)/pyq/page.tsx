"use client";

import { useState, useEffect } from "react";
import { Library, Loader2, ChevronLeft, Sparkles, FileText, Tag, Hash, Layers, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PaperLite {
  id: string; stage: string; year: number; paperCode: string; paperName: string;
  questionCount: number; extractedAt: string | null; sizeBytes: number;
}
interface YearGroup { year: number; papers: PaperLite[]; }
interface StageGroup { stage: string; years: YearGroup[]; }
interface Question {
  id: string; number: string; text: string; marks: number | null;
  topic: string | null; subtopic: string | null; gsMapping: string[]; keywords: string[];
}

const PAPER_TONE: Record<string, string> = {
  "GS-I": "from-blue-600/35 to-slate-900", "GS-II": "from-violet-600/35 to-slate-900",
  "GS-III": "from-emerald-600/35 to-slate-900", "GS-IV": "from-amber-600/35 to-slate-900",
  "ESSAY": "from-rose-600/35 to-slate-900", "CSAT": "from-cyan-600/35 to-slate-900",
};
const toneFor = (code: string) => PAPER_TONE[code] ?? (code.startsWith("OPTIONAL") ? "from-fuchsia-600/35 to-slate-900" : "from-slate-600/35 to-slate-900");

export default function PyqPage() {
  const [stages, setStages]   = useState<StageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage]     = useState<string>("prelims");
  const [reader, setReader]   = useState<PaperLite | null>(null);

  useEffect(() => {
    fetch("/api/pyq").then((r) => r.json()).then((d: { stages: StageGroup[] }) => {
      const s = Array.isArray(d.stages) ? d.stages : [];
      setStages(s);
      if (s.length && !s.some((x) => x.stage === "prelims")) setStage(s[0].stage);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (reader) return <Reader paper={reader} onClose={() => setReader(null)} />;

  const active = stages.find((s) => s.stage === stage);
  const totalPapers = stages.reduce((n, s) => n + s.years.reduce((m, y) => m + y.papers.length, 0), 0);
  const totalExtracted = stages.reduce((n, s) => n + s.years.reduce((m, y) => m + y.papers.filter((p) => p.extractedAt).length, 0), 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Library size={18} className="text-accent" /> PYQ Intelligence
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {totalPapers} past papers · {totalExtracted} decoded by AI · every question mapped to syllabus, topic & marks
        </p>
      </div>

      {loading && <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading papers…</div>}

      {/* Stage tabs */}
      {!loading && (
        <div className="mb-5 flex animate-fade-up gap-1.5">
          {stages.map((s) => (
            <button key={s.stage} onClick={() => setStage(s.stage)}
              className={cn("flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] capitalize transition-colors",
                stage === s.stage ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
              <Layers size={13} /> {s.stage}
              <span className={cn("rounded-full px-1.5 text-[10px]", stage === s.stage ? "bg-white/20" : "bg-surface-2 text-ink-3")}>
                {s.years.reduce((m, y) => m + y.papers.length, 0)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && !active && (
        <Card className="py-12 text-center animate-fade-up"><p className="text-[13px] text-ink-3">No papers ingested yet. Run <code className="text-accent">npm run pyq:scan</code>.</p></Card>
      )}

      {/* Year rows */}
      {active && (
        <div className="space-y-6 animate-fade-up">
          {active.years.map((y) => (
            <div key={y.year}>
              <p className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <span className="font-mono text-accent">{y.year}</span>
                <span className="font-mono text-[10px] font-normal text-ink-3">{y.papers.length} papers</span>
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {y.papers.map((p) => (
                  <button key={p.id} onClick={() => setReader(p)} className="group text-left">
                    <div className={cn("relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-xl border border-line bg-gradient-to-br p-3.5 transition-transform group-hover:-translate-y-1 group-hover:shadow-soft", toneFor(p.paperCode))}>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/85">{p.paperCode}</span>
                        {p.extractedAt
                          ? <span className="flex items-center gap-0.5 rounded-md bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[8.5px] text-emerald-200"><Sparkles size={8} /> {p.questionCount}Q</span>
                          : <FileText size={13} className="text-white/45" />}
                      </div>
                      <div>
                        <p className="font-display text-[13px] font-semibold leading-tight text-white drop-shadow">{p.paperName}</p>
                        <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-widest text-white/55">{p.year} · {Math.round(p.sizeBytes / 1024)}KB</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reader: PDF + extracted-questions intelligence panel ───── */
function Reader({ paper, onClose }: { paper: PaperLite; onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [err, setErr]             = useState("");
  const [extractedAt, setExtractedAt] = useState<string | null>(paper.extractedAt);
  const [attempts, setAttempts]   = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/pyq?paper=${paper.id}`).then((r) => r.json())
      .then((d: { questions?: Question[]; extractedAt?: string | null }) => {
        if (Array.isArray(d.questions)) setQuestions(d.questions);
        if (d.extractedAt) setExtractedAt(d.extractedAt);
      }).catch(() => {}).finally(() => setLoading(false));
    fetch(`/api/pyq/attempt?paperId=${paper.id}`).then((r) => r.json())
      .then((d: { attempts?: Record<string, string> }) => setAttempts(d.attempts ?? {})).catch(() => {});
  }, [paper.id]);

  const rate = async (questionId: string, selfRating: string) => {
    setAttempts((a) => ({ ...a, [questionId]: selfRating }));
    try {
      await fetch("/api/pyq/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId, selfRating }) });
    } catch { /* */ }
  };

  const extract = async (force = false) => {
    setRunning(true); setErr("");
    try {
      const r = await fetch("/api/pyq/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: paper.id, force }) });
      const d = await r.json() as { questions?: Question[]; error?: string; paper?: { extractedAt: string } };
      if (d.error) setErr(d.error);
      else { setQuestions(d.questions ?? []); setExtractedAt(d.paper?.extractedAt ?? new Date().toISOString()); }
    } catch { setErr("Extraction failed"); }
    setRunning(false);
  };

  const done = !!extractedAt && (questions?.length ?? 0) > 0;
  // Topic frequency rollup for the intelligence header
  const topicCount = new Map<string, number>();
  (questions ?? []).forEach((q) => { if (q.topic) topicCount.set(q.topic, (topicCount.get(q.topic) ?? 0) + 1); });
  const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40 hover:text-ink">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="min-w-0">
          <p className="truncate font-display text-[14px] font-semibold text-ink">{paper.paperName}</p>
          <p className="truncate text-[11px] text-ink-3 capitalize">{paper.stage} · {paper.year} · {paper.paperCode}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px]">
        {/* PDF */}
        <iframe src={`/api/pyq/pdf?id=${paper.id}`} className="h-full w-full border-r border-line" title={paper.paperName} />

        {/* Intelligence panel */}
        <div className="flex min-h-0 flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-2">
              <Sparkles size={13} /> Question Intelligence
            </p>
            {done && (
              <button onClick={() => { void extract(true); }} disabled={running} className="text-[10.5px] text-ink-3 hover:text-accent disabled:opacity-50">
                {running ? "…" : "re-extract"}
              </button>
            )}
          </div>

          {loading && <div className="flex flex-1 items-center justify-center text-ink-3"><Loader2 size={16} className="animate-spin" /></div>}

          {/* Not yet extracted */}
          {!loading && !done && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <Sparkles size={28} className="text-accent-2" />
              <p className="text-[13px] font-semibold text-ink">Decode this paper</p>
              <p className="max-w-[280px] text-[12px] leading-relaxed text-ink-3">Gemini reads the PDF and extracts every question with its marks, topic, syllabus mapping and keywords.</p>
              <button onClick={() => { void extract(false); }} disabled={running}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {running ? "Reading the paper…" : "Extract questions"}
              </button>
              {running && <p className="max-w-[280px] text-[11px] leading-relaxed text-ink-3">Large scanned papers can take 1–2 minutes to read. This runs once — results are cached afterward.</p>}
              {err && <p className="text-[11px] text-danger">{err}</p>}
            </div>
          )}

          {/* Extracted */}
          {done && questions && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Topic frequency strip */}
              {topTopics.length > 0 && (
                <div className="border-b border-line bg-surface-2/40 px-4 py-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3"><TrendingUp size={11} /> Topics in this paper</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topTopics.map(([t, n]) => (
                      <span key={t} className="flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] text-accent">
                        {t} <span className="font-mono text-[9px] text-accent-2">×{n}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5 p-4">
                <p className="text-[11px] text-ink-3">{questions.length} questions extracted</p>
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-line-subtle p-3 transition-colors hover:border-accent/30">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">{q.number || "—"}</span>
                      <p className="text-[12.5px] leading-relaxed text-ink-2">{q.text}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {q.marks != null && <span className="flex items-center gap-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-300"><Hash size={8} />{q.marks}m</span>}
                      {q.topic && <span className="rounded bg-violet-400/12 px-1.5 py-0.5 text-[10px] text-violet-300">{q.topic}</span>}
                      {q.gsMapping.map((g) => <span key={g} className="rounded bg-emerald-400/12 px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-300">{g}</span>)}
                      {q.keywords.slice(0, 4).map((k) => <span key={k} className="flex items-center gap-0.5 text-[10px] text-ink-3"><Tag size={8} />{k}</span>)}
                    </div>
                    {/* Self-rate this attempt → real accuracy data */}
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-line-subtle pt-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Self-rate:</span>
                      {([["correct", "Correct", "emerald"], ["partial", "Partial", "amber"], ["wrong", "Wrong", "rose"]] as const).map(([val, label, tone]) => (
                        <button key={val} onClick={() => { void rate(q.id, val); }}
                          className={cn("rounded px-2 py-0.5 text-[10px] transition-colors",
                            attempts[q.id] === val
                              ? tone === "emerald" ? "bg-emerald-400/25 text-emerald-200" : tone === "amber" ? "bg-amber-400/25 text-amber-200" : "bg-rose-400/25 text-rose-200"
                              : "border border-line text-ink-3 hover:text-ink")}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
