"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileStack, Loader2, Lock, Sparkles, RefreshCw } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";

/* COS M7 — Exam-Eve Kits. Artifacts unlock as topics climb the revision
   ladder; by R4-R5 every subject already owns its last-day revision kit.
   Nothing here is fabricated: artifacts are grounded in the syllabus,
   your notes and real PYQs, and cache by grounding hash. */

interface KindState { kind: string; label: string; gate: number; state: "present" | "stale" | "eligible" | "locked" }
interface TopicK { id: string; nodeId: string; title: string; stage: number; kinds: KindState[] }
interface Artifact { kind: string; content: Record<string, unknown> }

export default function EvePage() {
  const [topics, setTopics] = useState<TopicK[] | null>(null);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Record<string, Artifact[]>>({});
  const [viewing, setViewing] = useState<string | null>(null); // `${nodeId}:${kind}`
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/cos/artifacts", { cache: "no-store" }).then((r) => r.json())
      .then((j: { topics: TopicK[] }) => setTopics(j.topics)).catch(() => setTopics([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadNode = async (nodeId: string) => {
    const r = await fetch(`/api/cos/artifacts?nodeId=${encodeURIComponent(nodeId)}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r?.artifacts) setArtifacts((a) => ({ ...a, [nodeId]: r.artifacts }));
  };

  const act = async (t: TopicK, k: KindState) => {
    setErr(null);
    const key = `${t.nodeId}:${k.kind}`;
    if (k.state === "locked") return;
    if (k.state === "present" || k.state === "stale") {
      if (!artifacts[t.nodeId]) await loadNode(t.nodeId);
      setOpenNode(t.nodeId); setViewing(viewing === key ? null : key);
      if (k.state === "present") return;
    }
    // eligible or stale → generate
    setBusy(key);
    const r = await fetch("/api/cos/artifacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodeId: t.nodeId, kind: k.kind }) }).then((x) => x.json()).catch(() => ({ error: "network" }));
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    await loadNode(t.nodeId); load(); setOpenNode(t.nodeId); setViewing(key);
  };

  if (topics === null) return <div className="flex items-center gap-2 py-20 text-ink-3"><Loader2 size={16} className="animate-spin" /> Loading kits…</div>;

  const totals = topics.reduce((acc, t) => {
    for (const k of t.kinds) { if (k.state === "present") acc.present++; if (k.state !== "locked") acc.possible++; }
    return acc;
  }, { present: 0, possible: 0 });

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-4 animate-fade-up">
        <h2 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight text-ink">
          <FileStack size={18} className="text-accent" /> Exam-Eve Kits
        </h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          Note → revision note → one-pager → mind map → flashcards → 30-second sheet. Artifacts unlock as topics climb the ladder — {totals.present}/{totals.possible} unlocked artifacts generated.
        </p>
      </div>

      {err && <Card className="mb-3 border-warning/40 p-3 text-[12px] text-warning">{err}</Card>}

      {topics.length === 0 && (
        <Card className="p-6 text-[12.5px] text-ink-3">
          No topics tracked yet. Study a topic, then press “I studied this” on the <Link href="/syllabus" className="text-accent hover:underline">Syllabus</Link> — its kit starts building automatically as you revise it.
        </Card>
      )}

      <div className="space-y-2.5">
        {topics.map((t) => (
          <Card key={t.id} className="animate-fade-up p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{t.title}</p>
              <Chip tone="accent">{t.stage === 0 ? "R0" : `R${t.stage}`}</Chip>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {t.kinds.map((k) => {
                const key = `${t.nodeId}:${k.kind}`;
                return (
                  <button key={k.kind} onClick={() => act(t, k)} disabled={busy === key}
                    title={k.state === "locked" ? `Unlocks at R${k.gate}` : k.state === "eligible" ? "Generate now" : k.state === "stale" ? "Source changed — regenerate" : "View"}
                    className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                      k.state === "present" && "border-success/40 bg-success/10 text-success hover:bg-success/20",
                      k.state === "stale" && "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20",
                      k.state === "eligible" && "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
                      k.state === "locked" && "cursor-not-allowed border-line text-ink-3 opacity-60")}>
                    {busy === key ? <Loader2 size={10} className="animate-spin" /> : k.state === "locked" ? <Lock size={10} /> : k.state === "eligible" ? <Sparkles size={10} /> : k.state === "stale" ? <RefreshCw size={10} /> : null}
                    {k.label}
                  </button>
                );
              })}
            </div>

            {openNode === t.nodeId && viewing?.startsWith(t.nodeId) && (
              <ArtifactView artifact={(artifacts[t.nodeId] ?? []).find((a) => `${t.nodeId}:${a.kind}` === viewing) ?? null} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ArtifactView({ artifact }: { artifact: Artifact | null }) {
  if (!artifact) return null;
  const c = artifact.content as {
    sections?: { heading: string; body: string }[];
    cards?: { q: string; a: string }[];
    bullets?: string[];
    tree?: { label: string; children?: unknown[] };
  };
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line-subtle bg-surface-2/30 p-4">
      {c.sections?.map((s, i) => (
        <div key={i}>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent-2">{s.heading}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{s.body}</p>
        </div>
      ))}
      {c.cards?.map((card, i) => (
        <div key={i} className="rounded-lg border border-line-subtle p-2.5">
          <p className="text-[12.5px] font-medium text-ink">Q{i + 1}. {card.q}</p>
          <p className="mt-1 text-[12px] text-ink-2">{card.a}</p>
        </div>
      ))}
      {c.bullets && (
        <ul className="space-y-1.5">
          {c.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-ink"><span className="text-accent">▸</span>{b}</li>
          ))}
        </ul>
      )}
      {c.tree && <Tree node={c.tree as TreeNode} depth={0} />}
    </div>
  );
}

interface TreeNode { label: string; children?: TreeNode[] }
function Tree({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <p className={cn("text-ink", depth === 0 ? "text-[13.5px] font-semibold" : depth === 1 ? "text-[12.5px] font-medium" : "text-[12px] text-ink-2")}>
        {depth > 0 && <span className="mr-1.5 text-accent-2">{depth === 1 ? "◆" : "▸"}</span>}{node.label}
      </p>
      {node.children?.map((ch, i) => <Tree key={i} node={ch} depth={depth + 1} />)}
    </div>
  );
}
