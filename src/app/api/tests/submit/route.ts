import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { logEvent } from "@/lib/activity";

// UPSC Prelims marking: +2 per correct, −1/3 of 2 = −0.66 per wrong, 0 for skipped.
const CORRECT = 2;
const PENALTY = 2 / 3;

/**
 * POST /api/tests/submit { mode, subject, durationSec, items: [{ mcqId, chosen }] }
 * Server-side grading (answers never leave the server until now),
 * UPSC negative marking, persisted as a real TestAttempt.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const body = await req.json().catch(() => ({})) as {
    mode?: string; subject?: string; durationSec?: number; items?: { mcqId: string; chosen: number | null }[];
  };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return Response.json({ error: "No answers submitted." }, { status: 400 });

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  const mcqs = await prisma.mcq.findMany({ where: { id: { in: items.map((i) => i.mcqId) } } });
  const byId = new Map(mcqs.map((m) => [m.id, m]));

  let correct = 0, wrong = 0, skipped = 0;
  const subjTally = new Map<string, { correct: number; total: number }>();
  interface ReviewItem { mcqId: string; subject: string; question: string; options: string[]; chosen: number | null; correctIndex: number; correct: boolean; explanation: string }
  const review: ReviewItem[] = [];
  for (const it of items) {
    const m = byId.get(it.mcqId);
    if (!m) continue;
    const chosen = typeof it.chosen === "number" ? it.chosen : null;
    const isCorrect = chosen === m.answerIndex;
    if (chosen === null) skipped++; else if (isCorrect) correct++; else wrong++;
    const t = subjTally.get(m.subject) ?? { correct: 0, total: 0 };
    t.total++; if (isCorrect) t.correct++; subjTally.set(m.subject, t);
    review.push({ mcqId: m.id, subject: m.subject, question: m.question, options: m.options, chosen, correctIndex: m.answerIndex, correct: isCorrect, explanation: m.explanation });
  }

  const total = review.length;
  const score = Math.round((correct * CORRECT - wrong * PENALTY) * 100) / 100;
  const maxScore = total * CORRECT;
  const percent = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 100) : 0;
  const bySubject = [...subjTally.entries()].map(([subject, t]) => ({ subject, correct: t.correct, total: t.total }));

  const attempt = await prisma.testAttempt.create({
    data: {
      userId: DEMO_USER_ID, examCode, mode: body.mode === "mixed" ? "mixed" : "subject",
      subject: body.subject && body.subject !== "Mixed" ? body.subject : null,
      totalQ: total, correct, wrong, skipped, score, maxScore, percent,
      durationSec: Math.max(0, Math.round(Number(body.durationSec) || 0)),
      answers: review.map((r) => ({ mcqId: r.mcqId, chosen: r.chosen, correctIndex: r.correctIndex })),
      bySubject,
    },
  });

  await logEvent({ type: "TEST_ATTEMPTED", refId: attempt.id, subject: body.subject ?? "Mixed", value: percent });

  return Response.json({
    id: attempt.id, total, correct, wrong, skipped, score, maxScore, percent, bySubject, review,
  });
}
