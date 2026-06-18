import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { extractPyqQuestions, ChapterAnalysisError } from "@/lib/ai";
import fs from "fs";

/**
 * POST /api/pyq/extract  { id, force? }
 * Gemini reads the paper PDF → structured questions. Cached on the
 * paper (extractedAt); pass force:true to re-extract.
 */
export async function POST(req: NextRequest) {
  let body: { id?: string; force?: boolean };
  try { body = await req.json(); } catch { return Response.json({ error: "bad body" }, { status: 400 }); }
  const { id, force } = body;
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const paper = await prisma.pyqPaper.findUnique({ where: { id }, include: { questions: { orderBy: { number: "asc" } } } });
  if (!paper) return Response.json({ error: "not found" }, { status: 404 });

  // Cached
  if (paper.extractedAt && paper.questions.length > 0 && !force) {
    return Response.json({ cached: true, paper: { id: paper.id, questionCount: paper.questionCount, extractedAt: paper.extractedAt }, questions: paper.questions });
  }

  if (!fs.existsSync(paper.pdfPath)) return Response.json({ error: "Paper PDF is missing on disk." }, { status: 404 });

  try {
    const extracted = await extractPyqQuestions(paper.pdfPath, paper.examCode, paper.stage, paper.paperName);
    if (extracted.length === 0) return Response.json({ error: "No questions could be extracted from this paper." }, { status: 422 });

    const saved = await prisma.$transaction(async (tx) => {
      await tx.pyqQuestion.deleteMany({ where: { paperId: paper.id } });
      await tx.pyqQuestion.createMany({
        data: extracted.map((q) => ({
          paperId: paper.id, number: q.number, text: q.text, marks: q.marks,
          topic: q.topic || null, subtopic: q.subtopic || null, gsMapping: q.gsMapping, keywords: q.keywords,
        })),
      });
      await tx.pyqPaper.update({ where: { id: paper.id }, data: { questionCount: extracted.length, extractedAt: new Date() } });
      return tx.pyqQuestion.findMany({ where: { paperId: paper.id }, orderBy: { number: "asc" } });
    });

    return Response.json({ cached: false, paper: { id: paper.id, questionCount: saved.length, extractedAt: new Date() }, questions: saved });
  } catch (e) {
    if (e instanceof ChapterAnalysisError) return Response.json({ error: e.message }, { status: 502 });
    const msg = e instanceof Error ? e.message : "Extraction failed.";
    return Response.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
