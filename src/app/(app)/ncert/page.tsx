"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, ChevronLeft, FileText, BookMarked, X, GraduationCap } from "lucide-react";
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

  // ── Reader overlay ──────────────────────────────────────────
  if (reader) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <button onClick={() => setReader(null)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-accent/40 hover:text-ink">
            <ChevronLeft size={14} /> Back
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-semibold text-ink">{reader.chapter.title}</p>
            <p className="truncate text-[11px] text-ink-3">{reader.bookTitle}</p>
          </div>
        </div>
        <iframe src={`/api/ncert/pdf?id=${reader.chapter.id}`} className="flex-1 w-full" title={reader.chapter.title} />
      </div>
    );
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
