import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { scoreAffair } from "@/lib/scoring";

const STOP = new Set(["and", "the", "of", "for", "in", "to", "a", "an", "with", "on", "&", "amp", "indian", "india"]);

/** Significant lowercase keywords from a node title (drops stopwords/short words). */
function keywords(title: string): string[] {
  return title.toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

function hits(text: string, kws: string[]): number {
  const t = text.toLowerCase();
  return kws.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
}

/**
 * GET /api/intel/graph?node=<code>
 * Returns the syllabus node + everything connected to it:
 * news events, revision flashcards, notes. On-read matching, so it
 * works on existing data without any re-processing.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("node");
  if (!code) return Response.json({ error: "node code required" }, { status: 400 });

  const profile = await getActiveProfile().catch(() => null);
  if (!profile) return Response.json({ error: "no active exam" }, { status: 503 });

  const node = await prisma.syllabusNode.findUnique({
    where: { examId_code: { examId: profile.examId, code } },
  });
  if (!node) return Response.json({ error: "node not found" }, { status: 404 });

  const kws = keywords(node.title);
  const paper = node.paperCode ?? "";

  // ── Connected NEWS ──────────────────────────────────────────
  const newsRows = await prisma.currentAffair.findMany({
    where: { examScope: { has: profile.exam.code } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });
  const news = newsRows
    .map((r) => {
      const blob = `${r.headline} ${r.tags.join(" ")} ${r.whyInNews ?? ""}`;
      const kwHits = hits(blob, kws);
      const paperHit = paper && r.gsMapping.includes(paper) ? 1 : 0;
      const relevance = kwHits * 2 + paperHit;
      const score = r.importanceScore || scoreAffair({
        gsMapping: r.gsMapping, tags: r.tags, category: r.category,
        source: r.source, priority: r.priority, publishedAt: r.publishedAt,
      }).score;
      return { r, relevance, score };
    })
    .filter((x) => x.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.score - a.score)
    .slice(0, 20)
    .map(({ r, score }) => ({
      id: r.id, headline: r.headline, whyInNews: r.whyInNews,
      gsMapping: r.gsMapping, source: r.source, sourceUrl: r.sourceUrl,
      importanceScore: score, publishedAt: r.publishedAt,
    }));

  // ── Connected FLASHCARDS (revision) ─────────────────────────
  const cardRows = await prisma.revision.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { dueAt: "asc" },
    take: 300,
  });
  const cards = cardRows
    .filter((c) => {
      const subj = (c.subject ?? "").toLowerCase();
      const subjHit = paper && subj.includes(paper.toLowerCase());
      const kwHit = hits(`${c.subject ?? ""} ${c.front} ${c.back}`, kws) > 0;
      return subjHit || kwHit;
    })
    .slice(0, 20)
    .map((c) => ({ id: c.id, front: c.front, back: c.back, subject: c.subject, dueAt: c.dueAt }));

  // ── Connected NOTES ─────────────────────────────────────────
  const noteRows = await prisma.note.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const notes = noteRows
    .filter((n) => {
      const subjHit = paper && (n.subject ?? "").toLowerCase().includes(paper.toLowerCase());
      const kwHit = hits(`${n.title} ${n.subject ?? ""} ${n.tags.join(" ")} ${n.content}`, kws) > 0;
      return subjHit || kwHit;
    })
    .slice(0, 15)
    .map((n) => ({ id: n.id, title: n.title, subject: n.subject, updatedAt: n.updatedAt }));

  // ── Connected NCERT CHAPTERS (analysed ones match by title/concepts/facts) ─
  const chapterRows = await prisma.ncertChapter.findMany({
    where: { kind: "chapter" },
    include: { book: true },
    take: 600,
  });
  const ncert = chapterRows
    .map((c) => {
      const blob = `${c.title} ${c.aiConcepts.join(" ")} ${c.aiFacts.join(" ")} ${c.book.subject}`;
      const kwHit = hits(blob, kws);
      // light subject affinity (e.g. Polity node ↔ Political Science book)
      const subjAffinity = node.title.toLowerCase().split(" ").some((w) =>
        w.length >= 4 && c.book.subject.toLowerCase().includes(w)) ? 1 : 0;
      return { c, relevance: kwHit * 2 + subjAffinity };
    })
    .filter((x) => x.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 12)
    .map(({ c }) => ({
      id: c.id, title: c.title, book: c.book.title, klass: c.book.klass,
      subject: c.book.subject, analysed: !!c.aiProcessedAt,
    }));

  return Response.json({
    node: { code: node.code, title: node.title, titleMr: node.titleMr, paperCode: node.paperCode },
    counts: { news: news.length, cards: cards.length, notes: notes.length, ncert: ncert.length },
    news, cards, notes, ncert,
  });
}
