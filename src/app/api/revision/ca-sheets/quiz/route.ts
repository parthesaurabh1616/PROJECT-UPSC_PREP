import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { generateDailyQuiz, submitDailyQuiz, type CaQuiz } from "@/lib/ca-quiz";

/**
 * Daily CA MCQ drill.
 *   GET  ?day=YYYY-MM-DD          → the day's quiz WITHOUT answers (honest
 *                                   practice: answers stay server-side) + attempts
 *   POST {day}                    → generate the quiz (Board-grounded, cached)
 *   POST {day, choices[]}         → grade with UPSC marking; records a REAL
 *                                   TestAttempt; returns full review
 */
const strip = (q: CaQuiz) => ({
  mcqs: q.mcqs.map((m) => ({ question: m.question, options: m.options, concept: m.concept })),
  generatedAt: q.generatedAt,
  attempts: q.attempts ?? [],
});

export async function GET(req: NextRequest) {
  const day = new URL(req.url).searchParams.get("day");
  if (!day) return Response.json({ error: "day required" }, { status: 400 });
  const d = new Date(`${day}T00:00:00`);
  const sheet = await prisma.caDailySheet.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day: d } } });
  const quiz = sheet?.quiz as unknown as CaQuiz | null;
  return Response.json({ quiz: quiz?.mcqs?.length ? strip(quiz) : null });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as { day?: string; choices?: (number | null)[] } | null;
  if (!b?.day) return Response.json({ error: "day required" }, { status: 400 });
  const d = new Date(`${b.day}T00:00:00`);
  try {
    if (Array.isArray(b.choices)) {
      const result = await submitDailyQuiz(d, b.choices);
      return Response.json({ ok: true, ...result });
    }
    const r = await generateDailyQuiz(d);
    if (!r) return Response.json({ error: "No sheet (or no worthy items) for this day yet." }, { status: 404 });
    return Response.json({ ok: true, quiz: strip(r.quiz) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const friendly = /quota|429|exhaust/i.test(msg) ? "AI quota exhausted — try after the daily reset (the nightly run also generates quizzes)." : msg;
    return Response.json({ error: friendly }, { status: 502 });
  }
}
