import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { analyzeChapterPdf, ChapterAnalysisError } from "@/lib/ai";
import { indexContent } from "@/lib/embeddings";
import fs from "fs";

export const maxDuration = 60;

/**
 * GET  /api/ncert/analyze?id=<chapterId>  → cached analysis (or null)
 * POST /api/ncert/analyze { chapterId, force? } → run Gemini PDF analysis, persist, return
 */
function shape(ch: { title: string; aiSummary: string | null; aiConcepts: string[]; aiFacts: string[]; aiMcqs: unknown; aiProcessedAt: Date | null }) {
  return {
    title: ch.title,
    summary: ch.aiSummary,
    concepts: ch.aiConcepts,
    facts: ch.aiFacts,
    mcqs: ch.aiMcqs ?? [],
    processed: !!ch.aiProcessedAt,
  };
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const ch = await prisma.ncertChapter.findUnique({ where: { id } });
  if (!ch) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(shape(ch));
}

export async function POST(req: NextRequest) {
  const { chapterId, force } = await req.json() as { chapterId: string; force?: boolean };
  if (!chapterId) return Response.json({ error: "chapterId required" }, { status: 400 });

  const ch = await prisma.ncertChapter.findUnique({ where: { id: chapterId } });
  if (!ch) return Response.json({ error: "not found" }, { status: 404 });
  if (!fs.existsSync(ch.pdfPath)) return Response.json({ error: "PDF missing on disk" }, { status: 404 });

  // Cached
  if (ch.aiProcessedAt && !force) return Response.json(shape(ch));

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  let analysis;
  try {
    analysis = await analyzeChapterPdf(ch.pdfPath, examCode);
  } catch (e) {
    const msg = e instanceof ChapterAnalysisError ? e.message
      : `Unexpected error: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`;
    return Response.json({ error: msg }, { status: 503 });
  }

  // Persist; upgrade the title if Gemini found a real one and ours was generic.
  const betterTitle = analysis.title && /^chapter\s*\d+$/i.test(ch.title) ? analysis.title : ch.title;
  const updated = await prisma.ncertChapter.update({
    where: { id: chapterId },
    data: {
      title: betterTitle,
      aiSummary: analysis.summary,
      aiConcepts: analysis.concepts,
      aiFacts: analysis.facts,
      aiMcqs: analysis.mcqs as object,
      aiProcessedAt: new Date(),
    },
  });
  // Best-effort: refresh the chapter's vector with the richer analysed content.
  void prisma.ncertChapter.findUnique({ where: { id: chapterId }, include: { book: true } }).then((c) => {
    if (c) return indexContent("NCERT", c.id, "ALL", `Class ${c.book.klass} ${c.book.subject}: ${c.title}. ${c.book.title}. ${c.aiConcepts.join(" ")} ${c.aiFacts.join(" ")}`);
  }).catch(() => {});
  return Response.json(shape(updated));
}
