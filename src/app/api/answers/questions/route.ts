import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";

/**
 * GET /api/answers/questions?paper=GS-III
 * Real Mains PYQs to practise on, drawn from the decoded PYQ database.
 */
export async function GET(req: NextRequest) {
  const paper = new URL(req.url).searchParams.get("paper") ?? "GS-III";
  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  const where = paper === "ESSAY" || paper === "OPTIONAL"
    ? { paper: { examCode, stage: "mains", paperCode: { startsWith: paper === "OPTIONAL" ? "OPTIONAL" : "ESSAY" } } }
    : { paper: { examCode, stage: "mains", paperCode: paper } };

  const rows = await prisma.pyqQuestion.findMany({
    where, orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, text: true, marks: true, topic: true, paper: { select: { year: true, paperCode: true } } },
  });

  return Response.json({
    questions: rows.map((q) => ({ id: q.id, text: q.text, marks: q.marks ?? 10, topic: q.topic, year: q.paper.year, paperCode: q.paper.paperCode })),
  });
}
