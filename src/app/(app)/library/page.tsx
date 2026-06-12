"use client";

import { useState } from "react";
import { UploadCloud, BookOpen, RotateCcw, Sparkles, FileText } from "lucide-react";
import { Card, Chip, Bar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { library, libraryStats, type Book } from "@/lib/data";

const FILTERS = ["All", "NCERT", "Standard", "Optional", "Govt Report"] as const;

export default function LibraryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const books =
    filter === "All"
      ? library
      : library.filter((b) => b.kind === filter);

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* stats */}
      <div className="grid animate-fade-up grid-cols-4 gap-4">
        {libraryStats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="font-display text-[24px] font-semibold leading-none tracking-tight text-ink">
              {s.value}
            </p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      {/* upload zone */}
      <Card
        className="flex animate-fade-up cursor-pointer items-center gap-4 border-dashed bg-bg-subtle py-6 transition-colors hover:border-accent/50"
        style={{ animationDelay: "60ms" }}
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/12 text-accent">
          <UploadCloud size={22} />
        </span>
        <div>
          <p className="font-display text-[15px] font-semibold text-ink">
            Upload NCERTs, reference books, newspapers, question papers or scanned notes
          </p>
          <p className="mt-0.5 text-[12px] text-ink-3">
            PDF, EPUB or images · stored in your MinIO library · parsed and
            embedded so the AI mentor can search inside them.
          </p>
        </div>
        <span className="ml-auto rounded-lg bg-accent px-4 py-2 text-[12.5px] font-medium text-white">
          Choose files
        </span>
      </Card>

      {/* filters */}
      <div
        className="flex animate-fade-up items-center gap-1.5"
        style={{ animationDelay: "120ms" }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              filter === f
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink-2 hover:text-ink",
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-ink-3">
          {books.length} resources
        </span>
      </div>

      {/* book grid */}
      <div
        className="grid animate-fade-up grid-cols-5 gap-4"
        style={{ animationDelay: "180ms" }}
      >
        {books.map((b) => (
          <BookCard key={b.title} book={b} />
        ))}
      </div>
    </div>
  );
}

const accentVar: Record<string, string> = {
  accent: "var(--accent)",
  "accent-2": "var(--accent-2)",
  success: "var(--success)",
  warning: "var(--warning)",
};

function BookCard({ book: b }: { book: Book }) {
  return (
    <Card hover className="group flex flex-col p-3">
      {/* cover */}
      <div
        className="relative mb-3 flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg p-3 text-white"
        style={{
          background: `linear-gradient(150deg, rgb(${accentVar[b.accent]}) 0%, rgb(var(--ink) / 0.9) 140%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <BookOpen size={15} className="opacity-80" />
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide">
            {b.kind}
          </span>
        </div>
        <div>
          <p className="font-display text-[14px] font-semibold leading-tight">
            {b.title}
          </p>
          <p className="mt-1 text-[10px] opacity-80">{b.author}</p>
        </div>
        {b.completion === 100 && (
          <span className="absolute right-2 top-9 rounded-full bg-white/90 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-ink">
            Done
          </span>
        )}
      </div>

      {/* meta */}
      <div className="flex items-center justify-between text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1">
          <FileText size={11} /> {b.pages} pp
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw size={11} /> {b.revisions}× revised
        </span>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[10.5px]">
          <span className="text-ink-3">Completion</span>
          <span className="font-display font-semibold text-ink">
            {b.completion}%
          </span>
        </div>
        <Bar value={b.completion} />
      </div>

      <button className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-bg py-1.5 text-[11px] font-medium text-ink-2 opacity-0 transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100">
        <Sparkles size={11} /> Ask AI about this book
      </button>
    </Card>
  );
}
