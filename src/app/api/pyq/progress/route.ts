import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

/**
 * GET /api/pyq/progress
 * → { byPaper: Record<paperId, { attempted, correct }> }
 * Powers "N attempted" badges on the paper cards. Real, per-user.
 */
export async function GET() {
  await ensureDemoUser();
  const rows = await prisma.pyqAttempt.findMany({
    where: { userId: DEMO_USER_ID, paperId: { not: null } },
    select: { paperId: true, selfRating: true },
  });
  const byPaper: Record<string, { attempted: number; correct: number }> = {};
  for (const r of rows) {
    const id = r.paperId!;
    const m = byPaper[id] ?? { attempted: 0, correct: 0 };
    m.attempted++; if (r.selfRating === "correct") m.correct++;
    byPaper[id] = m;
  }
  return Response.json({ byPaper });
}
