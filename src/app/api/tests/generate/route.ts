import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { generateMcqs } from "@/lib/ai";

export const maxDuration = 60;

const SUBJECTS = ["History", "Geography", "Polity", "Economy", "Environment", "Science & Tech", "Current Affairs"];

function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

/**
 * POST /api/tests/generate { subject, count }
 * Returns a quiz: reuses MCQs from the bank, AI-generates the
 * remainder (stored for reuse). Answers/explanations are NOT sent
 * to the client — grading happens server-side on submit.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { subject?: string; count?: number };
  const count = Math.max(5, Math.min(25, Number(body.count) || 10));
  const subject = body.subject && SUBJECTS.includes(body.subject) ? body.subject : "Mixed";
  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  // Reuse from the bank
  const pool = await prisma.mcq.findMany({ where: { examCode, ...(subject !== "Mixed" ? { subject } : {}) }, take: 120 });
  const chosen = shuffle(pool).slice(0, count);

  // Generate the remainder if the bank is short
  let need = count - chosen.length;
  if (need > 0) {
    const targetSubjects = subject !== "Mixed" ? [subject] : shuffle(SUBJECTS).slice(0, 3);
    for (const subj of targetSubjects) {
      if (need <= 0) break;
      const batch = Math.min(15, subject === "Mixed" ? Math.ceil(need / Math.max(1, targetSubjects.length)) + 1 : need);
      const gen = await generateMcqs(subj, batch, examCode);
      if (gen.length === 0) continue;
      const created = await prisma.$transaction(gen.map((m) => prisma.mcq.create({
        data: { examCode, subject: subj, question: m.question, options: m.options, answerIndex: m.answerIndex, explanation: m.explanation, source: "ai", difficulty: m.difficulty },
      })));
      chosen.push(...created.slice(0, need));
      need = count - chosen.length;
    }
  }

  if (chosen.length === 0) return Response.json({ error: "Couldn't build a test right now (AI unavailable). Try again shortly." }, { status: 502 });

  return Response.json({
    mode: subject === "Mixed" ? "mixed" : "subject",
    subject,
    questions: shuffle(chosen).map((m) => ({ id: m.id, subject: m.subject, question: m.question, options: m.options })),
  });
}
