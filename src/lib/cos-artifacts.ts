/* ════════════════════════════════════════════════════════════════
   COS M6 + M7 — Collector Lens & Exam-Eve artifact pipeline.

   Artifacts unlock as a topic matures on the revision ladder and are
   content-addressed by a hash of their grounding (syllabus node + the
   user's matching notes + the node's real PYQs) — regenerated only when
   the grounding changes. FLASHCARDS seed the SM-2 deck (deduped).
   Gates (ladder stage): COLLECTOR ≥1 · REVISION_NOTE ≥1 · ONE_PAGER ≥2 ·
   MINDMAP ≥3 · FLASHCARDS ≥3 · RECALL_30 ≥4.
   ════════════════════════════════════════════════════════════════ */
import { createHash } from "crypto";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { generateJson } from "@/lib/ai";
import { SYLLABUS, type SylNode } from "@/lib/syllabus-data";

export const ARTIFACT_KINDS = ["COLLECTOR", "REVISION_NOTE", "ONE_PAGER", "MINDMAP", "FLASHCARDS", "RECALL_30"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const KIND_GATE: Record<ArtifactKind, number> = {
  COLLECTOR: 1, REVISION_NOTE: 1, ONE_PAGER: 2, MINDMAP: 3, FLASHCARDS: 3, RECALL_30: 4,
};
export const KIND_LABEL: Record<ArtifactKind, string> = {
  COLLECTOR: "Collector lens", REVISION_NOTE: "Revision note", ONE_PAGER: "One-pager",
  MINDMAP: "Mind map", FLASHCARDS: "Flashcards", RECALL_30: "30-sec recall",
};

/** Find a syllabus node (with its paper context) by id. */
export function findNode(nodeId: string): { node: SylNode; paper: string } | null {
  for (const g of SYLLABUS) for (const p of g.papers) for (const s of p.sections) {
    const node = s.nodes.find((n) => n.id === nodeId);
    if (node) return { node, paper: `${p.code} · ${p.name}` };
  }
  return null;
}

/** Real grounding for a node: syllabus text + user's matching notes + PYQs. */
async function grounding(nodeId: string) {
  const found = findNode(nodeId);
  if (!found) throw new Error("Unknown syllabus node");
  const { node, paper } = found;

  const kw = node.title.split(/[^A-Za-z]+/).filter((w) => w.length > 4).slice(0, 3);
  const [notes, pyqs] = await Promise.all([
    prisma.note.findMany({
      where: { userId: DEMO_USER_ID, OR: kw.map((k) => ({ title: { contains: k, mode: "insensitive" as const } })) },
      select: { title: true, content: true }, take: 2,
    }),
    kw.length
      ? prisma.pyqQuestion.findMany({
          where: { OR: kw.map((k) => ({ text: { contains: k, mode: "insensitive" as const } })) },
          select: { text: true, marks: true, paper: { select: { year: true, stage: true } } }, take: 5,
        })
      : Promise.resolve([]),
  ]);

  const text = [
    `SYLLABUS NODE (${paper}): ${node.title}`,
    node.items?.length ? `Sub-points: ${node.items.join("; ")}` : "",
    notes.length ? `USER'S NOTES:\n${notes.map((n) => `— ${n.title}: ${n.content.slice(0, 1200)}`).join("\n")}` : "(user has no notes on this yet)",
    pyqs.length ? `REAL PAST QUESTIONS on this theme:\n${pyqs.map((q) => `— [${q.paper?.stage} ${q.paper?.year}] ${q.text.slice(0, 220)}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  return { text, hash: createHash("sha1").update(text).digest("hex"), title: node.title, paper };
}

const PROMPTS: Record<ArtifactKind, { system: string; shape: string }> = {
  COLLECTOR: {
    system: "You are a serving District Collector mentoring a UPSC aspirant. Ground everything in the provided syllabus node, notes and past questions. Be concrete, India-specific, no fluff.",
    shape: `{"sections":[{"heading":"Administrative relevance","body":"…"},{"heading":"Governance application","body":"…"},{"heading":"District Collector's perspective","body":"…"},{"heading":"An ethical dilemma","body":"…"},{"heading":"Policy connections","body":"…"},{"heading":"Interview discussion points","body":"…"},{"heading":"Real examples","body":"2 concrete real-life examples"}]}`,
  },
  REVISION_NOTE: {
    system: "You write crisp UPSC revision notes: dense, structured, exam-oriented, ~40% the length of full notes. Thinkers/articles/cases named precisely.",
    shape: `{"sections":[{"heading":"…","body":"…"}]} (4-7 sections covering the whole node)`,
  },
  ONE_PAGER: {
    system: "Compress this topic to ONE page a UPSC aspirant reads in 3 minutes the week before Mains. Only what earns marks.",
    shape: `{"sections":[{"heading":"Core","body":"…"},{"heading":"Key names & terms","body":"…"},{"heading":"PYQ angles","body":"…"},{"heading":"One quote / one example","body":"…"}]}`,
  },
  MINDMAP: {
    system: "Build a hierarchical mind map of this topic for visual revision. Max depth 3, max 6 children per node, labels ≤6 words.",
    shape: `{"tree":{"label":"topic","children":[{"label":"…","children":[{"label":"…"}]}]}}`,
  },
  FLASHCARDS: {
    system: "Write UPSC-grade active-recall flashcards for this topic. Front = precise question; back = complete but compact answer. 6-10 cards, no trivia.",
    shape: `{"cards":[{"q":"…","a":"…"}]}`,
  },
  RECALL_30: {
    system: "Write the 30-second exam-eve recall sheet: the 5-8 memory triggers that unlock this whole topic. Each ≤12 words.",
    shape: `{"bullets":["…"]}`,
  },
};

/** Generate (or return cached) artifact. Honest caching: same grounding hash → same artifact. */
export async function generateArtifact(nodeId: string, kind: ArtifactKind) {
  const g = await grounding(nodeId);
  const existing = await prisma.topicArtifact.findUnique({
    where: { userId_nodeId_kind: { userId: DEMO_USER_ID, nodeId, kind } },
  });
  if (existing && existing.sourceHash === g.hash && !existing.stale) return { artifact: existing, cached: true };

  const p = PROMPTS[kind];
  const content = await generateJson<Record<string, unknown>>(
    `${p.system}\nRespond ONLY with valid JSON exactly in this shape: ${p.shape}`,
    g.text,
  ) as import("@prisma/client").Prisma.InputJsonObject;

  const artifact = await prisma.topicArtifact.upsert({
    where: { userId_nodeId_kind: { userId: DEMO_USER_ID, nodeId, kind } },
    create: { userId: DEMO_USER_ID, nodeId, kind, content, sourceHash: g.hash, model: "gemini-2.5-flash" },
    update: { content, sourceHash: g.hash, stale: false, model: "gemini-2.5-flash" },
  });

  // FLASHCARDS seed the SM-2 deck (exact-front dedupe — E8 light version)
  if (kind === "FLASHCARDS") {
    const cards = (content as { cards?: { q?: string; a?: string }[] }).cards ?? [];
    for (const c of cards) {
      if (!c.q?.trim() || !c.a?.trim()) continue;
      const dup = await prisma.revision.findFirst({ where: { userId: DEMO_USER_ID, front: c.q.trim() } });
      if (!dup) await prisma.revision.create({ data: { userId: DEMO_USER_ID, front: c.q.trim().slice(0, 500), back: c.a.trim().slice(0, 2000), subject: g.title.slice(0, 60) } });
    }
  }
  return { artifact, cached: false };
}

/** Kit overview: every tracked topic × kind → present | eligible | locked. */
export async function kitOverview() {
  const [topics, artifacts] = await Promise.all([
    prisma.topicState.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { title: "asc" } }),
    prisma.topicArtifact.findMany({ where: { userId: DEMO_USER_ID }, select: { nodeId: true, kind: true, stale: true } }),
  ]);
  const have = new Map(artifacts.map((a) => [`${a.nodeId}:${a.kind}`, a.stale]));
  return topics.map((t) => ({
    id: t.id, nodeId: t.nodeId, title: t.title, stage: t.ladderStage,
    kinds: ARTIFACT_KINDS.map((k) => ({
      kind: k, label: KIND_LABEL[k], gate: KIND_GATE[k],
      state: have.has(`${t.nodeId}:${k}`) ? (have.get(`${t.nodeId}:${k}`) ? "stale" : "present") : t.ladderStage >= KIND_GATE[k] ? "eligible" : "locked",
    })),
  }));
}

/** Nightly drain: generate up to `budget` missing-but-eligible artifacts (D-4). */
export async function drainArtifactQueue(budget = 10): Promise<{ generated: number; failed: number }> {
  const overview = await kitOverview();
  let generated = 0, failed = 0;
  for (const t of overview) {
    for (const k of t.kinds) {
      if (generated >= budget) return { generated, failed };
      if (k.state !== "eligible" && k.state !== "stale") continue;
      try { await generateArtifact(t.nodeId, k.kind); generated++; }
      catch { failed++; if (failed >= 2) return { generated, failed }; } // quota likely gone — stop
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return { generated, failed };
}
