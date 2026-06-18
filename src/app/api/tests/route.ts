import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

/** GET /api/tests — attempt history + averages (overall & by subject). */
export async function GET() {
  await ensureDemoUser();
  const attempts = await prisma.testAttempt.findMany({
    where: { userId: DEMO_USER_ID }, orderBy: { createdAt: "desc" }, take: 30,
    select: { id: true, mode: true, subject: true, totalQ: true, correct: true, wrong: true, skipped: true, score: true, maxScore: true, percent: true, durationSec: true, bySubject: true, createdAt: true },
  });

  const avgPercent = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percent, 0) / attempts.length) : null;

  // Accuracy by subject across all attempts
  const subj = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    for (const b of (a.bySubject as { subject: string; correct: number; total: number }[] | null) ?? []) {
      const m = subj.get(b.subject) ?? { correct: 0, total: 0 };
      m.correct += b.correct; m.total += b.total; subj.set(b.subject, m);
    }
  }
  const bySubject = [...subj.entries()].map(([subject, m]) => ({ subject, correct: m.correct, total: m.total, pct: Math.round((m.correct / m.total) * 100) })).sort((a, b) => a.pct - b.pct);

  return Response.json({ attempts, total: attempts.length, avgPercent, bySubject });
}
