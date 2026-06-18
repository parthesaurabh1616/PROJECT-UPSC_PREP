"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, ChevronLeft, FileText, BookMarked, X, GraduationCap, Sparkles, Lightbulb, ListChecks, Check } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BookLite { id: string; klass: number; subject: string; title: string; coverStyle: number; chapterCount: number; }
interface SubjectGroup { subject: string; books: BookLite[]; }
interface ClassGroup { klass: number; subjects: SubjectGroup[]; }
interface Chapter { id: string; order: number; title: string; kind: string; chapterNo: number | null; sizeBytes: number; }
interface BookFull extends BookLite { chapters: Chapter[] }

// Deterministic premium gradient covers.
const COVERS = [
  "from-blue-600/40 via-indigo-700/30 to-slate-900",
  "from-amber-600/40 via-orange-700/30 to-slate-900",
  "from-emerald-600/40 via-teal-700/30 to-slate-900",
  "from-rose-600/40 via-pink-700/30 to-slate-900",
  "from-violet-600/40 via-purple-700/30 to-slate-900",
  "from-cyan-600/40 via-sky-700/30 to-slate-900",
];

const SUBJECT_ICON: Record<string, string> = {
  History: "🏛", Geography: "🗺", "Political Science": "⚖", Economics: "📈",
  Science: "🔬", "Social Science": "🌏",
};

export default function NcertPage() {
  const [tree, setTree]       = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [klass, setKlass]     = useState<number | null>(null);
  const [book, setBook]       = useState<BookFull | null>(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [reader, setReader]   = useState<{ chapter: Chapter; bookTitle: string } | null>(null);

  useEffect(() => {
    fetch("/api/ncert").then((r) => r.json()).then((d: { classes: ClassGroup[] }) => {
      setTree(Array.isArray(d.classes) ? d.classes : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openBook = useCallback(async (id: string) => {
    setBookLoading(true);
    try { setBook(await (await fetch(`/api/ncert?book=${id}`)).json() as BookFull); }
    catch { /* */ }
    setBookLoading(false);
  }, []);

  const activeClass = tree.find((c) => c.klass === klass);

  // ── Reader overlay (PDF + AI study panel) ──────────────────
  if (reader) {
    return <Reader chapter={reader.chapter} bookTitle={reader.bookTitle} onClose={() => setReader(null)} />;
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <BookOpen size={18} className="text-accent" /> NCERT Library
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {tree.reduce((n, c) => n + c.subjects.reduce((m, s) => m + s.books.length, 0), 0)} books · Class 6–12 · the foundation of UPSC & MPSC prep
        </p>
      </div>

      {loading && <div className="flex items-center gap-2 py-10 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading library…</div>}

      {/* Class selector */}
      {!loading && (
        <div className="mb-5 flex animate-fade-up flex-wrap gap-1.5">
          {tree.map((c) => (
            <button key={c.klass} onClick={() => { setKlass(c.klass); setBook(null); }}
              className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] transition-colors",
                klass === c.klass ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
              <GraduationCap size={13} /> Class {c.klass}
              <span className={cn("rounded-full px-1.5 text-[10px]", klass === c.klass ? "bg-white/20" : "bg-surface-2 text-ink-3")}>
                {c.subjects.reduce((m, s) => m + s.books.length, 0)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && !klass && (
        <Card className="py-12 text-center animate-fade-up"><p className="text-[13px] text-ink-3">Select a class to browse its books.</p></Card>
      )}

      {/* Subject → book shelves */}
      {activeClass && (
        <div className="space-y-7 animate-fade-up">
          {activeClass.subjects.map((s) => (
            <div key={s.subject}>
              <p className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <span className="text-[16px]">{SUBJECT_ICON[s.subject] ?? "📘"}</span> {s.subject}
                <span className="font-mono text-[10px] font-normal text-ink-3">{s.books.length} books</span>
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {s.books.map((b) => (
                  <button key={b.id} onClick={() => { void openBook(b.id); }}
                    className="group text-left">
                    {/* Cover */}
                    <div className={cn("relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl border border-line bg-gradient-to-br p-4 transition-transform group-hover:-translate-y-1 group-hover:shadow-soft", COVERS[b.coverStyle % 6])}>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-widest text-white/80">Class {b.klass}</span>
                        <BookMarked size={14} className="text-white/50" />
                      </div>
                      <div>
                        <p className="font-display text-[14px] font-semibold leading-tight text-white drop-shadow">{b.title}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/60">{b.chapterCount} chapters · NCERT</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* (Reader is rendered above as a full-screen overlay) */}
      {/* Book detail drawer */}
      {(book || bookLoading) && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setBook(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            {bookLoading && <div className="flex items-center gap-2 text-ink-3"><Loader2 size={15} className="animate-spin" /> Loading…</div>}
            {book && (
              <>
                <div className="flex items-start justify-between">
                  <div className={cn("flex aspect-[3/4] w-28 flex-col justify-end overflow-hidden rounded-lg bg-gradient-to-br p-3", COVERS[book.coverStyle % 6])}>
                    <p className="font-display text-[12px] font-semibold leading-tight text-white">{book.title}</p>
                  </div>
                  <button onClick={() => setBook(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
                </div>
                <h3 className="mt-4 font-display text-[19px] font-semibold tracking-tight text-ink">{book.title}</h3>
                <p className="mt-0.5 text-[12px] text-ink-3">Class {book.klass} · {book.subject} · {book.chapterCount} chapters</p>

                <div className="mt-5 space-y-1">
                  {book.chapters.map((c) => (
                    <button key={c.id} onClick={() => setReader({ chapter: c, bookTitle: book.title })}
                      className="flex w-full items-center gap-3 rounded-lg border border-line-subtle px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-surface-2">
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-semibold",
                        c.kind === "chapter" ? "bg-accent/15 text-accent" : "bg-surface-2 text-ink-3")}>
                        {c.kind === "chapter" ? (c.chapterNo ?? c.order) : <FileText size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink">{c.title}</p>
                        {c.kind !== "chapter" && <p className="text-[10px] uppercase tracking-wider text-ink-3">{c.kind}</p>}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-ink-3">{Math.round(c.sizeBytes / 1024)}KB</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reader: PDF + AI study panel ───────────────────────────── */
interface Mcq { q: string; options: string[]; answer: string; explanation: string; }
interface Analysis { title: string; summary: string | null; concepts: string[]; facts: string[]; mcqs: Mcq[]; processed: boolean; }

function Reader({ chapter, bookTitle, onClose }: { chapter: Chapter; bookTitle: string; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);
  const [tab, setTab]           = useState<"summary" | "concepts" | "facts" | "mcqs">("summary");
  const [err, setErr]           = useState("");
  const [reveal, setReveal]     = useState<Set<number>>(new Set());
  const [revMsg, setRevMsg]     = useState("");
  const [revBusy, setRevBusy]   = useState(false);
  const [done, setDone]         = useState(false);
  const [doneBusy, setDoneBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/ncert/complete?chapterId=${chapter.id}`).then((r) => r.json())
      .then((d: { completed?: boolean }) => setDone(!!d.completed)).catch(() => {});
  }, [chapter.id]);

  const toggleDone = async () => {
    setDoneBusy(true);
    const next = !done;
    try {
      await fetch("/api/ncert/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapterId: chapter.id, undo: !next }) });
      setDone(next);
    } catch { /* */ }
    setDoneBusy(false);
  };

  const toRevision = async () => {
    setRevBusy(true); setRevMsg("");
    try {
      const r = await fetch("/api/ncert/to-revision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapterId: chapter.id }) });
      const d = await r.json() as { created?: number; error?: string };
      setRevMsg(d.error ? d.error : `Added ${d.created} cards to Revision`);
    } catch { setRevMsg("Failed"); }
    setRevBusy(false);
    setTimeout(() => setRevMsg(""), 4000);
  };

  useEffect(() => {
    fetch(`/api/ncert/analyze?id=${chapter.id}`).then((r) => r.json())
      .then((d: Analysis) => setAnalysis(d)).catch(() => {}).finally(() => setLoading(false));
  }, [chapter.id]);

  const analyze = async () => {
    setRunning(true); setErr("");
    try {
      const r = await fetch("/api/ncert/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapterId: chapter.id }) });
      const d = await r.json() as Analysis & { error?: string };
      if (d.error) setErr(d.error); else setAnalysis(d);
    } catch { setErr("Analysis failed"); }
    setRunning(false);
  };

  const TABS = [
    { k: "summary" as const, label: "Summary", icon: Sparkles },
    { k: "concepts" as const, label: "Concepts", icon: Lightbulb },
    { k: "facts" as const, label: "Facts", icon: Check },
    { k: "mcqs" as const, label: "MCQs", icon: ListChecks },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40 hover:text-ink">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="min-w-0">
          <p className="truncate font-display text-[14px] font-semibold text-ink">{analysis?.title || chapter.title}</p>
          <p className="truncate text-[11px] text-ink-3">{bookTitle}</p>
        </div>
        <button onClick={() => { void toggleDone(); }} disabled={doneBusy}
          className={cn("ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-50",
            done ? "border-success/50 bg-success/12 text-success" : "border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
          {doneBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {done ? "Completed" : "Mark complete"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px]">
        {/* PDF */}
        <iframe src={`/api/ncert/pdf?id=${chapter.id}`} className="h-full w-full border-r border-line" title={chapter.title} />

        {/* AI study panel */}
        <div className="flex min-h-0 flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-2">
              <Sparkles size={13} /> AI Study Tools
            </p>
            {(analysis?.processed) && (
              <div className="flex items-center gap-2">
                {revMsg && <span className="text-[10px] text-success">{revMsg}</span>}
                <button onClick={() => { void toRevision(); }} disabled={revBusy}
                  className="flex items-center gap-1 rounded border border-accent-2/40 bg-accent-2/10 px-2 py-0.5 text-[10px] text-accent-2 hover:bg-accent-2/20 disabled:opacity-50">
                  {revBusy ? <Loader2 size={10} className="animate-spin" /> : <ListChecks size={10} />} → Revision
                </button>
                <button onClick={() => { void analyze(); }} disabled={running} className="text-[10.5px] text-ink-3 hover:text-accent disabled:opacity-50">
                  {running ? "…" : "regenerate"}
                </button>
              </div>
            )}
          </div>

          {/* Not yet analysed */}
          {!loading && !analysis?.processed && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <Sparkles size={28} className="text-accent-2" />
              <p className="text-[13px] font-semibold text-ink">Analyse this chapter</p>
              <p className="max-w-[260px] text-[12px] leading-relaxed text-ink-3">Gemini reads the PDF and generates a summary, key concepts, high-yield facts and Prelims MCQs.</p>
              <button onClick={() => { void analyze(); }} disabled={running}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {running ? "Reading the chapter…" : "Generate study material"}
              </button>
              {err && <p className="text-[11px] text-danger">{err}</p>}
            </div>
          )}
          {loading && <div className="flex flex-1 items-center justify-center text-ink-3"><Loader2 size={16} className="animate-spin" /></div>}

          {/* Analysed */}
          {analysis?.processed && (
            <>
              <div className="flex gap-1 border-b border-line px-3 py-2">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.k} onClick={() => setTab(t.k)}
                      className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] transition-colors",
                        tab === t.k ? "bg-accent text-white" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}>
                      <Icon size={11} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {tab === "summary" && <p className="text-[12.5px] leading-relaxed text-ink-2 whitespace-pre-wrap">{analysis.summary}</p>}
                {tab === "concepts" && (
                  <div className="flex flex-wrap gap-1.5">{analysis.concepts.map((c, i) => <span key={i} className="rounded-full bg-accent/12 px-2.5 py-1 text-[11.5px] text-accent">{c}</span>)}</div>
                )}
                {tab === "facts" && (
                  <ul className="space-y-2">{analysis.facts.map((f, i) => <li key={i} className="flex gap-2 text-[12.5px] text-ink-2"><Check size={13} className="mt-0.5 shrink-0 text-success" />{f}</li>)}</ul>
                )}
                {tab === "mcqs" && (
                  <div className="space-y-3">
                    {analysis.mcqs.map((m, i) => (
                      <div key={i} className="rounded-lg border border-line-subtle p-3">
                        <p className="text-[12.5px] font-medium text-ink">Q{i + 1}. {m.q}</p>
                        <div className="mt-1.5 space-y-1">
                          {m.options.map((o, j) => (
                            <p key={j} className={cn("rounded px-2 py-1 text-[11.5px]", reveal.has(i) && o === m.answer ? "bg-success/15 text-success" : "text-ink-2")}>{o}</p>
                          ))}
                        </div>
                        <button onClick={() => setReveal((s) => new Set(s).add(i))} className="mt-1.5 text-[11px] text-accent hover:underline">
                          {reveal.has(i) ? `Answer: ${m.answer} — ${m.explanation}` : "Reveal answer"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
