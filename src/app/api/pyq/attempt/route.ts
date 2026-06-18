import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { logEvent } from "@/lib/activity";

const RATING_VALUE: Record<string, number> = { correct: 1, partial: 0, wrong: 0, attempted: 0 };

/**
 * POST /api/pyq/attempt  { questionId, selfRating }
 * Records a self-rated PYQ attempt. Real activity → ledger
 * PYQ_ATTEMPTED (value: correct=1 else 0) drives subject accuracy.
 * Upserts so re-attempting updates the latest rating.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const { questionId, selfRating } = await req.json().catch(() => ({})) as
    { questionId?: string; selfRating?: string };
  if (!questionId) return Response.json({ error: "questionId required" }, { status: 400 });
  const rating = ["correct", "partial", "wrong"].includes(selfRating ?? "") ? selfRating! : "attempted";

  const q = await prisma.pyqQuestion.findUnique({ where: { id: questionId }, include: { paper: true } });
  if (!q) return Response.json({ error: "question not found" }, { status: 404 });
  // Coarse GS-paper bucket so accuracy rolls up to a reachable threshold.
  const subject = q.gsMapping[0] || q.paper.paperCode;

  await prisma.pyqAttempt.upsert({
    where: { userId_questionId: { userId: DEMO_USER_ID, questionId } },
    update: { selfRating: rating, attemptedAt: new Date(), subject },
    create: { userId: DEMO_USER_ID, questionId, paperId: q.paperId, subject, selfRating: rating },
  });
  await logEvent({ type: "PYQ_ATTEMPTED", refId: questionId, subject, value: RATING_VALUE[rating] ?? 0, examCode: q.paper.examCode });

  return Response.json({ ok: true, selfRating: rating });
}

export async function GET(req: NextRequest) {
  await ensureDemoUser();
  const paperId = new URL(req.url).searchParams.get("paperId");
  if (!paperId) return Response.json({ attempts: {} });
  const rows = await prisma.pyqAttempt.findMany({ where: { userId: DEMO_USER_ID, paperId } });
  const attempts: Record<string, string> = {};
  for (const r of rows) attempts[r.questionId] = r.selfRating;
  return Response.json({ attempts });
}
