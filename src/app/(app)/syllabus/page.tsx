"use client";

import { useState, useEffect } from "react";
import { Network, Loader2, ChevronDown, ChevronRight, BookMarked, Brain, CheckCircle2 } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { RelatedPanel } from "@/components/RelatedPanel";
import { cn } from "@/lib/utils";

interface SylNode { id: string; title: string; items?: string[] }
interface SylSection { heading?: string; nodes: SylNode[] }
interface SylPaper { code: string; name: string; stage: string; marks: number; counted: boolean; kind: string; note?: string; sections: SylSection[] }
interface SylGroup { key: string; label: string; stage: string; papers: SylPaper[] }
interface Data { groups: SylGroup[]; stats: { groups: number; papers: number; topics: number } }

type ChipTone = "accent" | "accent-2" | "success" | "warning" | "danger" | "muted";
const KIND_TONE: Record<string, ChipTone> = {
  GS: "accent", CSAT: "warning", ESSAY: "success", OPTIONAL: "accent-2",
};

export default function SyllabusPage() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>("prelims");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/syllabus/official").then((r) => r.json()).then((j: Data) => setD(j)).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/cos/topics").then((r) => r.json())
      .then((j: { topics?: { nodeId: string }[] }) => setTracked(new Set((j.topics ?? []).map((t) => t.nodeId))))
      .catch(() => {});
  }, []);

  const track = (node: SylNode) => {
    setTracked((s) => new Set(s).add(node.id)); // optimistic
    fetch("/api/cos/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodeId: node.id, title: node.title }) }).catch(() => {});
  };

  if (loading) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading the official syllabus…</div>;
  if (!d) return <div className="py-20 text-ink-3">Couldn’t load the syllabus.</div>;

  const group = d.groups.find((g) => g.key === active) ?? d.groups[0];
  const toggle = (id: string) => setOpen((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <Network size={18} className="text-accent" /> Syllabus Intelligence
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          The complete official UPSC CSE syllabus · {d.stats.papers} papers · {d.stats.topics} topics · tap any topic to see what your library has on it
        </p>
      </div>

      {/* Group tabs */}
      <div className="mb-5 flex animate-fade-up flex-wrap gap-1.5">
        {d.groups.map((g) => (
          <button key={g.key} onClick={() => setActive(g.key)}
            className={cn("rounded-lg px-3.5 py-2 text-[12.5px] transition-colors",
              active === g.key ? "bg-accent text-white" : "border border-line text-ink-2 hover:border-accent/40 hover:text-ink")}>
            {g.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up space-y-5">
        {group.papers.map((p) => (
          <Card key={p.code} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold text-ink">{p.name}</p>
                {p.note && <p className="mt-0.5 text-[11.5px] text-ink-3">{p.note}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Chip tone={KIND_TONE[p.kind] ?? "accent"}>{p.marks} marks</Chip>
                <Chip tone={p.counted ? "success" : "muted"}>{p.counted ? "counted" : "qualifying"}</Chip>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {p.sections.map((sec, si) => (
                <div key={si}>
                  {sec.heading && <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-2">{sec.heading}</p>}
                  <div className="space-y-1.5">
                    {sec.nodes.map((node) => {
                      const isOpen = open.has(node.id);
                      return (
                        <div key={node.id} className="rounded-xl border border-line-subtle">
                          <button onClick={() => toggle(node.id)}
                            className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-surface-2/40">
                            {isOpen ? <ChevronDown size={14} className="mt-0.5 shrink-0 text-accent" /> : <ChevronRight size={14} className="mt-0.5 shrink-0 text-ink-3" />}
                            <span className="min-w-0 flex-1 text-[12.5px] text-ink">{node.title}</span>
                          </button>
                          {isOpen && (
                            <div className="border-t border-line-subtle px-3 py-3">
                              <div className="mb-3">
                                {tracked.has(node.id) ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
                                    <CheckCircle2 size={11} /> In memory engine — revisions auto-scheduled
                                  </span>
                                ) : (
                                  <button onClick={() => track(node)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20">
                                    <Brain size={11} /> I studied this — start the revision ladder
                                  </button>
                                )}
                              </div>
                              {node.items && node.items.length > 0 && (
                                <ul className="mb-3 space-y-1">
                                  {node.items.map((it, i) => (
                                    <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-ink-2">
                                      <span className="mt-0.5 shrink-0 text-accent-2">·</span>{it}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <RelatedPanel query={`${node.title} ${(node.items ?? []).join(" ")}`} title="In your library" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 animate-fade-up p-4">
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <BookMarked size={13} className="text-accent" /> This is the Commission’s own wording. The “In your library” links under each topic are real matches from your NCERTs, decoded PYQs, current affairs and notes — found by meaning, not keywords.
        </p>
      </Card>
    </div>
  );
}
