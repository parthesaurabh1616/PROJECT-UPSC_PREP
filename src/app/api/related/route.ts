import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { relatedByRef, semanticSearch, type SemanticHit } from "@/lib/embeddings";

/**
 * GET /api/related?kind=NCERT&refId=…   → items related to that item
 * GET /api/related?q=free+text          → items related to the text
 * Returns semantically-related content grouped by type, across the
 * whole platform. Powered by the pgvector index.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const refId = searchParams.get("refId");
  const q = searchParams.get("q");

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  let hits: SemanticHit[] = [];
  if (kind && refId) hits = await relatedByRef(kind, refId, { examCode, limit: 18 });
  else if (q && q.trim()) hits = await semanticSearch(q, { examCode, limit: 18 });
  else return Response.json({ error: "provide kind+refId or q" }, { status: 400 });

  const group: Record<string, string[]> = { CA: [], PYQ: [], NCERT: [], NOTE: [] };
  for (const h of hits) group[h.kind]?.push(h.refId);
  const order = <T extends { id: string }>(arr: T[], ids: string[]): T[] => {
    const m = new Map(arr.map((r) => [r.id, r]));
    return ids.map((id) => m.get(id)).filter((r): r is T => !!r);
  };

  const [caR, pyqR, ncertR, noteR] = await Promise.all([
    group.CA.length ? prisma.currentAffair.findMany({ where: { id: { in: group.CA } }, select: { id: true, headline: true, gsMapping: true, importanceScore: true, publishedAt: true } }) : [],
    group.PYQ.length ? prisma.pyqQuestion.findMany({ where: { id: { in: group.PYQ } }, select: { id: true, text: true, marks: true, paperId: true, paper: { select: { year: true, stage: true, paperCode: true } } } }) : [],
    group.NCERT.length ? prisma.ncertChapter.findMany({ where: { id: { in: group.NCERT } }, include: { book: true } }) : [],
    group.NOTE.length ? prisma.note.findMany({ where: { id: { in: group.NOTE } }, select: { id: true, title: true, subject: true } }) : [],
  ]);

  return Response.json({
    ca: order(caR, group.CA).map((r) => ({ id: r.id, headline: r.headline, gsMapping: r.gsMapping, importanceScore: r.importanceScore, publishedAt: r.publishedAt })),
    pyq: order(pyqR, group.PYQ).map((r) => ({ id: r.id, paperId: r.paperId, text: r.text, marks: r.marks, year: r.paper.year, stage: r.paper.stage, paperCode: r.paper.paperCode })),
    ncert: order(ncertR, group.NCERT).map((c) => ({ id: c.id, title: c.title, klass: c.book.klass, subject: c.book.subject, book: c.book.title })),
    notes: order(noteR, group.NOTE).map((n) => ({ id: n.id, title: n.title, subject: n.subject })),
    counts: { ca: group.CA.length, pyq: group.PYQ.length, ncert: group.NCERT.length, notes: group.NOTE.length },
  });
}
