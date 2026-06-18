/* ════════════════════════════════════════════════════════════
   Semantic index backfill — embeds all existing platform content
   into pgvector so the AI Mentor can retrieve by meaning.

   Idempotent: upserts on (kind, refId), so re-running only refreshes.
   Run:  npx tsx scripts/embed-index.ts   (or npm run embed:index)
   ════════════════════════════════════════════════════════════ */
import { readFileSync } from "fs";
// load .env for standalone runs (Next injects it at runtime)
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env optional */ }

import { PrismaClient } from "@prisma/client";
import { indexBatch } from "../src/lib/embeddings";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.GOOGLE_API_KEY) { console.error("GOOGLE_API_KEY missing — cannot embed."); process.exit(1); }

  type Item = { kind: string; refId: string; examCode: string; content: string };
  const items: Item[] = [];

  // ── Current affairs ──
  const ca = await prisma.currentAffair.findMany({
    select: { id: true, headline: true, whyInNews: true, background: true, tags: true, gsMapping: true, examScope: true },
  });
  for (const r of ca) {
    const both = r.examScope.includes("UPSC") && r.examScope.includes("MPSC");
    items.push({
      kind: "CA", refId: r.id, examCode: both ? "ALL" : (r.examScope[0] ?? "UPSC"),
      content: `${r.headline}. ${r.whyInNews ?? ""} ${r.background ?? ""} ${r.gsMapping.join(" ")} ${r.tags.join(" ")}`,
    });
  }

  // ── PYQ questions ──
  const pyq = await prisma.pyqQuestion.findMany({
    select: { id: true, text: true, topic: true, subtopic: true, keywords: true, paper: { select: { examCode: true, year: true, paperCode: true } } },
  });
  for (const q of pyq) items.push({
    kind: "PYQ", refId: q.id, examCode: q.paper.examCode,
    content: `${q.text} ${q.topic ?? ""} ${q.subtopic ?? ""} ${q.keywords.join(" ")}`,
  });

  // ── NCERT chapters (title + AI concepts/facts when analysed) ──
  const ncert = await prisma.ncertChapter.findMany({
    where: { kind: "chapter" },
    select: { id: true, title: true, aiConcepts: true, aiFacts: true, book: { select: { subject: true, klass: true, title: true } } },
  });
  for (const c of ncert) items.push({
    kind: "NCERT", refId: c.id, examCode: "ALL",
    content: `Class ${c.book.klass} ${c.book.subject}: ${c.title}. ${c.book.title}. ${c.aiConcepts.join(" ")} ${c.aiFacts.join(" ")}`,
  });

  // ── Notes ──
  const notes = await prisma.note.findMany({ select: { id: true, title: true, subject: true, tags: true, content: true } });
  for (const n of notes) items.push({
    kind: "NOTE", refId: n.id, examCode: "ALL",
    content: `${n.title}. ${n.subject ?? ""} ${n.tags.join(" ")} ${n.content}`,
  });

  // Skip items already embedded so re-runs only fill gaps (cheap, quota-friendly).
  // Pass --all to force a full re-embed (e.g. after changing the embedding model).
  const force = process.argv.includes("--all");
  const existing = new Set<string>();
  if (!force) {
    const rows = await prisma.$queryRawUnsafe<{ kind: string; refId: string }[]>(
      `SELECT kind, "refId" FROM embeddings WHERE embedding IS NOT NULL`,
    );
    for (const r of rows) existing.add(`${r.kind}:${r.refId}`);
  }
  const todo = items.filter((it) => !existing.has(`${it.kind}:${it.refId}`));

  console.log(`Corpus ${items.length} (CA:${ca.length} PYQ:${pyq.length} NCERT:${ncert.length} NOTE:${notes.length}) · already indexed ${existing.size} · embedding ${todo.length}${force ? " (forced)" : ""}…`);

  let done = 0;
  for (let i = 0; i < todo.length; i += 100) {
    const slice = todo.slice(i, i + 100);
    done += await indexBatch(slice);
    console.log(`  ${Math.min(i + 100, todo.length)}/${todo.length} processed (${done} embedded)`);
  }
  console.log(`Done. ${done} new embeddings written. Total indexed: ${existing.size + done}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
