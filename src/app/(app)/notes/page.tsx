"use client";

import { useState } from "react";
import {
  BookMarked, Scale, Coins, Compass, GraduationCap, Newspaper,
  PenLine, ChevronRight, Hash, Link2, Sparkles, Network,
} from "lucide-react";
import { Card, Chip, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  notesTree, noteBacklinks, graphNodes, graphLinks, type TreeNode,
} from "@/lib/data";

const folderIcons = {
  BookMarked, Scale, Coins, Compass, GraduationCap, Newspaper, PenLine,
} as const;

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="grid h-[calc(100vh-64px-3.5rem)] grid-cols-[230px_1fr_240px] gap-4">
        {/* ── Tree ── */}
        <aside className="overflow-y-auto rounded-2xl border border-line bg-surface p-3">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">
            Workspace
          </p>
          {notesTree.map((node) => (
            <TreeBranch key={node.label} node={node} />
          ))}

          <p className="px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {["high-yield", "prelims", "mains", "revise-7d", "PYQ-linked"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </aside>

        {/* ── Editor ── */}
        <article className="overflow-y-auto rounded-2xl border border-line bg-surface px-10 py-8">
          <input
            defaultValue="Basic Structure Doctrine"
            className="w-full bg-transparent font-display text-[30px] font-semibold tracking-tight text-ink outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-4 border-b border-line-subtle pb-3.5 text-[11.5px] text-ink-3">
            <span>GS-II → Polity → Constitutional Framework</span>
            <span>Edited 2 hrs ago</span>
            <span>1,247 words · 8 min read</span>
            <span className="flex gap-1.5">
              <Chip tone="accent">high-yield</Chip>
              <Chip tone="muted">mains</Chip>
            </span>
          </div>

          <div className="prose-os mt-5 text-[14px]">
            <p>
              The <strong>doctrine of basic structure</strong> is a judicially
              evolved principle restraining Parliament&apos;s amending power
              under Article 368. Though not codified, it has become the keystone
              of Indian constitutionalism — protecting the Constitution&apos;s
              identity from being altered by transient parliamentary majorities.
            </p>

            <h2>Constitutional Foundation</h2>
            <p>The doctrine sits at the intersection of three provisions:</p>
            <ul>
              <li>
                <strong>Article 368</strong> — power and procedure of amendment
              </li>
              <li>
                <strong>Article 13</strong> — laws inconsistent with FRs are void
              </li>
              <li>
                <strong>Articles 32 &amp; 226</strong> — judicial review as the
                enforcement mechanism
              </li>
            </ul>

            <h2>Evolution — Four Landmark Cases</h2>
            {[
              { t: "Shankari Prasad (1951)", d: "First Amendment challenged. The SC held that \"law\" in Art. 13 means ordinary legislation, not constitutional amendments. Parliament may amend Fundamental Rights." },
              { t: "Golak Nath (1967)", d: "11-judge bench, 6:5. Reversed the earlier view — amendments are \"law\", FRs cannot be abridged. Prospective overruling applied." },
              { t: "Kesavananda Bharati (1973)", d: "13-judge bench, 7:6. Overruled Golak Nath but held Parliament cannot alter the basic structure. The longest verdict in Indian judicial history." },
              { t: "Minerva Mills (1980)", d: "Struck down clauses (4) & (5) of Art. 368 inserted by the 42nd Amendment. The limitation on amending power is itself part of the basic structure." },
            ].map((c) => (
              <Toggle key={c.t} title={c.t} body={c.d} />
            ))}

            <div className="callout-green">
              <strong>Contemporary application — NJAC verdict (2015):</strong> the
              99th Constitutional Amendment was struck down for compromising
              judicial independence — a basic feature. The doctrine&apos;s
              continuing vitality is reaffirmed.
            </div>

            <h2>UPSC Relevance</h2>
            <p>
              This concept spans Prelims, Mains GS-II, the Essay paper and the
              Interview. See the connected notes in the knowledge graph below.
            </p>
          </div>
        </article>

        {/* ── Backlinks ── */}
        <aside className="overflow-y-auto rounded-2xl border border-line bg-surface p-3.5">
          <p className="flex items-center gap-1.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">
            <Link2 size={12} /> Backlinks ({noteBacklinks.length})
          </p>
          <div className="space-y-1.5">
            {noteBacklinks.map((b) => (
              <button
                key={b.title}
                className="block w-full rounded-lg border border-line-subtle px-2.5 py-2 text-left transition-colors hover:border-accent/50 hover:bg-bg-subtle"
              >
                <p className="text-[12px] font-medium text-ink">{b.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
                  {b.excerpt}
                </p>
              </button>
            ))}
          </div>

          <p className="flex items-center gap-1.5 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">
            <Sparkles size={12} /> AI Actions
          </p>
          <div className="space-y-1.5">
            {[
              "Compress to a 1-page sheet",
              "Generate 8 flashcards",
              "Build a mind map",
              "Find related current affairs",
            ].map((a) => (
              <button
                key={a}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-2 text-left text-[11.5px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
              >
                <Sparkles size={12} /> {a}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Knowledge graph ── */}
      <Card className="animate-fade-up">
        <SectionHeading
          title="Knowledge Graph — neighbourhood of this note"
          sub="16 connected notes · 3 PYQs · click a node to navigate"
          icon={<Network size={15} className="text-accent" />}
          action={
            <div className="flex items-center gap-3 text-[10.5px] text-ink-3">
              <Dot c="bg-accent" l="Current" />
              <Dot c="bg-accent-2" l="Concept" />
              <Dot c="bg-warning" l="Case" />
              <Dot c="bg-danger" l="PYQ" />
            </div>
          }
        />
        <KnowledgeGraph />
      </Card>
    </div>
  );
}

/* ── Tree branch ──────────────────────────────────────── */
function TreeBranch({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const Icon = node.icon
    ? folderIcons[node.icon as keyof typeof folderIcons]
    : null;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium text-ink hover:bg-surface-2"
      >
        {hasChildren && (
          <ChevronRight
            size={12}
            className={cn("text-ink-3 transition-transform", open && "rotate-90")}
          />
        )}
        {Icon && <Icon size={13} className="text-ink-3" />}
        <span className="truncate">{node.label}</span>
      </button>
      {hasChildren && open && (
        <div className="ml-3 border-l border-line-subtle pl-2">
          {node.children!.map((child) => (
            <button
              key={child.label}
              className={cn(
                "block w-full truncate rounded-lg px-2.5 py-1 text-left text-[12px] transition-colors",
                child.active
                  ? "bg-accent/12 font-medium text-accent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-lg border border-line bg-bg-subtle px-3.5 py-2.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left text-[13.5px] font-medium text-ink"
      >
        <ChevronRight
          size={13}
          className={cn("text-ink-3 transition-transform", open && "rotate-90")}
        />
        {title}
      </button>
      {open && (
        <p className="mt-2 pl-5 text-[12.5px] leading-relaxed text-ink-2">
          {body}
        </p>
      )}
    </div>
  );
}

function Dot({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", c)} />
      {l}
    </span>
  );
}

/* ── Knowledge graph (SVG) ────────────────────────────── */
function KnowledgeGraph() {
  const colour: Record<string, string> = {
    center: "rgb(var(--accent))",
    concept: "rgb(var(--accent-2))",
    case: "rgb(var(--warning))",
    pyq: "rgb(var(--danger))",
  };
  const byId = Object.fromEntries(graphNodes.map((n) => [n.id, n]));

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-bg-subtle">
      <svg viewBox="0 0 900 380" className="h-[380px] w-full">
        {graphLinks.map(([a, b], i) => {
          const A = byId[a];
          const B = byId[b];
          return (
            <line
              key={i}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="rgb(var(--line))"
              strokeWidth={1.4}
            />
          );
        })}
        {graphNodes.map((n) => (
          <g key={n.id} className="cursor-pointer">
            {n.type === "center" && (
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 7}
                fill="none"
                stroke={colour.center}
                strokeWidth={1}
                opacity={0.35}
                className="animate-pulse-ring"
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={colour[n.type]}
              opacity={n.type === "center" ? 1 : 0.88}
              stroke="rgb(var(--surface))"
              strokeWidth={n.type === "center" ? 3 : 1.5}
            />
            <text
              x={n.x}
              y={n.y + n.r + 13}
              textAnchor="middle"
              fontSize={n.type === "center" ? 12 : 10.5}
              fontWeight={n.type === "center" ? 600 : 400}
              fill="rgb(var(--ink-2))"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
