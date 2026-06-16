"use client";

import { useState, useEffect, useCallback } from "react";
import { Network, Loader2, Newspaper, RotateCcw, FileText, ExternalLink, ChevronRight } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Node { id: string; code: string; title: string; titleMr?: string | null; weight: number; }
interface Paper { paperCode: string; nodes: Node[]; }
interface Graph {
  node: { code: string; title: string; titleMr?: string | null; paperCode?: string | null };
  counts: { news: number; cards: number; notes: number };
  news: { id: string; headline: string; whyInNews: string | null; gsMapping: string[]; source: string | null; sourceUrl: string | null; importanceScore: number; publishedAt: string }[];
  cards: { id: string; front: string; back: string; subject: string | null }[];
  notes: { id: string; title: string; subject: string | null }[];
}

export default function KnowledgePage() {
  const [papers, setPapers]   = useState<Paper[]>([]);
  const [examName, setExamName] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [graph, setGraph]     = useState<Graph | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    fetch("/api/syllabus").then((r) => r.json()).then((d: { papers: Paper[]; examName?: string }) => {
      setPapers(Array.isArray(d.papers) ? d.papers : []);
      setExamName(d.examName ?? "");
      // auto-select the first node
      const first = d.papers?.[0]?.nodes?.[0];
      if (first) void select(first.code);
      setLoadingTree(false);
    }).catch(() => setLoadingTree(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback(async (code: string) => {
    setActiveCode(code);
    setLoadingGraph(true);
    try {
      const r = await fetch(`/api/intel/graph?node=${encodeURIComponent(code)}`, { cache: "no-store" });
      setGraph(await r.json() as Graph);
    } catch { /* */ }
    setLoadingGraph(false);
  }, []);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Network size={18} className="text-accent" /> Knowledge Hub
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          The syllabus spine — pick a topic to see every connected news event, flashcard and note · {examName}
        </p>
      </div>

      <div className="grid animate-fade-up grid-cols-[280px_1fr] gap-5" style={{ animationDelay: "60ms" }}>

        {/* Syllabus tree */}
        <Card className="max-h-[calc(100vh-180px)] overflow-y-auto p-3">
          {loadingTree && <div className="flex items-center gap-2 px-2 py-4 text-ink-3"><Loader2 size={14} className="animate-spin" /> Loading syllabus…</div>}
          {papers.map((p) => (
            <div key={p.paperCode} className="mb-3">
              <p className="px-2 pb-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">{p.paperCode}</p>
              <div className="space-y-0.5">
                {p.nodes.map((n) => (
                  <button key={n.id} onClick={() => { void select(n.code); }}
                    className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                      activeCode === n.code ? "bg-accent/12 font-medium text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                    <span className="truncate">{n.title}</span>
                    <ChevronRight size={12} className="shrink-0 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        {/* Node detail — connected intelligence */}
        <div className="space-y-4">
          {!graph && !loadingGraph && (
            <Card className="py-12 text-center"><p className="text-[13px] text-ink-3">Select a syllabus topic.</p></Card>
          )}
          {graph && (
            <>
              <Card className="p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{graph.node.paperCode}</p>
                    <h3 className="mt-1 font-display text-[20px] font-semibold tracking-tight text-ink">{graph.node.title}</h3>
                    {graph.node.titleMr && <p className="mt-0.5 text-[13px] text-ink-2">{graph.node.titleMr}</p>}
                  </div>
                  <div className="flex gap-3 text-center">
                    <Stat n={graph.counts.news} label="News" />
                    <Stat n={graph.counts.cards} label="Cards" />
                    <Stat n={graph.counts.notes} label="Notes" />
                  </div>
                </div>
              </Card>

              {loadingGraph && <div className="flex items-center gap-2 py-6 text-ink-3"><Loader2 size={15} className="animate-spin" /> Connecting intelligence…</div>}

              {/* Connected news */}
              <Section icon={<Newspaper size={14} className="text-accent" />} title="Linked Current Affairs" count={graph.news.length}>
                {graph.news.map((e) => (
                  <div key={e.id} className="flex items-start gap-2.5 border-b border-line-subtle py-2.5 last:border-0">
                    <span className="mt-0.5 w-8 shrink-0 rounded bg-surface-2 text-center font-mono text-[10px] font-semibold text-ink-2">{e.importanceScore}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium leading-snug text-ink">{e.headline}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {e.gsMapping.map((g) => <Chip key={g} tone="accent">{g}</Chip>)}
                        {e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10.5px] text-accent hover:underline">{e.source}<ExternalLink size={9} /></a>}
                      </div>
                    </div>
                  </div>
                ))}
              </Section>

              {/* Connected flashcards */}
              <Section icon={<RotateCcw size={14} className="text-accent-2" />} title="Linked Flashcards" count={graph.cards.length}>
                {graph.cards.map((c) => (
                  <div key={c.id} className="border-b border-line-subtle py-2.5 last:border-0">
                    <p className="text-[12.5px] font-medium text-ink">{c.front}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{c.back}</p>
                  </div>
                ))}
              </Section>

              {/* Connected notes */}
              <Section icon={<FileText size={14} className="text-gold" />} title="Linked Notes" count={graph.notes.length}>
                {graph.notes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between border-b border-line-subtle py-2 last:border-0">
                    <p className="text-[12.5px] text-ink">{n.title}</p>
                    <span className="text-[10.5px] text-ink-3">{n.subject}</span>
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="font-display text-[20px] font-semibold leading-none text-ink">{n}</p>
      <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.15em] text-ink-3">{label}</p>
    </div>
  );
}

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-2">{title}</p>
        <span className="rounded-full bg-surface-2 px-1.5 text-[10px] text-ink-3">{count}</span>
      </div>
      {count === 0 ? <p className="py-3 text-[12px] text-ink-3">Nothing linked yet.</p> : <div>{children}</div>}
    </Card>
  );
}
