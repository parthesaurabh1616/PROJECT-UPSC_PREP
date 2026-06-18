import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";

/**
 * GET /api/pyq            → browse tree: stage → year → papers (active exam)
 * GET /api/pyq?paper=<id> → one paper with its extracted questions
 */
export async function GET(req: NextRequest) {
  const paperId = new URL(req.url).searchParams.get("paper");

  if (paperId) {
    const paper = await prisma.pyqPaper.findUnique({
      where: { id: paperId },
      include: { questions: { orderBy: { number: "asc" } } },
    });
    if (!paper) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(paper);
  }

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  const papers = await prisma.pyqPaper.findMany({
    where: { examCode },
    orderBy: [{ stage: "asc" }, { year: "desc" }, { paperCode: "asc" }],
    select: { id: true, stage: true, year: true, paperCode: true, paperName: true, questionCount: true, extractedAt: true, sizeBytes: true },
  });

  // Group stage → year → papers
  const stages = new Map<string, Map<number, typeof papers>>();
  for (const p of papers) {
    if (!stages.has(p.stage)) stages.set(p.stage, new Map());
    const yrs = stages.get(p.stage)!;
    if (!yrs.has(p.year)) yrs.set(p.year, []);
    yrs.get(p.year)!.push(p);
  }
  const tree = [...stages.entries()].map(([stage, yrMap]) => ({
    stage,
    years: [...yrMap.entries()].sort((a, b) => b[0] - a[0]).map(([year, ps]) => ({ year, papers: ps })),
  }));

  return Response.json({ examCode, totalPapers: papers.length, stages: tree });
}
