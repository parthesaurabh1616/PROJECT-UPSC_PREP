import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

/**
 * GET /api/answers — the user's evaluated Mains answers + per-paper
 * averages (the real source of written-paper performance).
 */
export async function GET() {
  await ensureDemoUser();
  const answers = await prisma.mainsAnswer.findMany({
    where: { userId: DEMO_USER_ID, evaluatedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const byPaperMap = new Map<string, { count: number; sumPct: number; sumScore: number; sumMax: number }>();
  for (const a of answers) {
    if (a.score == null) continue;
    const m = byPaperMap.get(a.paperCode) ?? { count: 0, sumPct: 0, sumScore: 0, sumMax: 0 };
    m.count++; m.sumPct += a.score / a.maxMarks; m.sumScore += a.score; m.sumMax += a.maxMarks;
    byPaperMap.set(a.paperCode, m);
  }
  const byPaper = [...byPaperMap.entries()].map(([paperCode, m]) => ({
    paperCode, count: m.count, avgPct: Math.round((m.sumPct / m.count) * 100), avgScore: Math.round((m.sumScore / m.count) * 10) / 10,
  })).sort((a, b) => a.paperCode.localeCompare(b.paperCode));

  return Response.json({ answers, byPaper, total: answers.length });
}
