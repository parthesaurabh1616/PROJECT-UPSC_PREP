import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";

/** GET /api/syllabus → active exam's syllabus nodes grouped by paper. */
export async function GET() {
  const profile = await getActiveProfile().catch(() => null);
  if (!profile) return Response.json({ examCode: null, papers: [] });

  const nodes = await prisma.syllabusNode.findMany({
    where: { examId: profile.examId },
    orderBy: { sortOrder: "asc" },
  });

  // Group by paperCode (GS-I…IV) preserving order.
  const order: string[] = [];
  const byPaper = new Map<string, typeof nodes>();
  for (const n of nodes) {
    const p = n.paperCode ?? "General";
    if (!byPaper.has(p)) { byPaper.set(p, []); order.push(p); }
    byPaper.get(p)!.push(n);
  }

  return Response.json({
    examCode: profile.exam.code,
    examName: profile.exam.shortName,
    papers: order.map((p) => ({
      paperCode: p,
      nodes: byPaper.get(p)!.map((n) => ({
        id: n.id, code: n.code, title: n.title, titleMr: n.titleMr, weight: n.weight,
      })),
    })),
  });
}
