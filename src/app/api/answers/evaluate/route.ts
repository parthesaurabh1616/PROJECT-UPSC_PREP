import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { evaluateMainsAnswer, ChapterAnalysisError } from "@/lib/ai";
import { getActiveProfile } from "@/lib/exam";
import { logEvent } from "@/lib/activity";

export const maxDuration = 60;

const PAPERS = new Set(["GS-I", "GS-II", "GS-III", "GS-IV", "ESSAY", "OPTIONAL"]);

/**
 * POST /api/answers/evaluate
 * { questionId?, paperCode, questionText, maxMarks, answerText }
 * Gemini (Groq fallback) evaluates the answer as a strict UPSC
 * examiner → real, persisted score + breakdown. Logs ANSWER_WRITTEN.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const body = await req.json().catch(() => ({})) as {
    questionId?: string; paperCode?: string; questionText?: string; maxMarks?: number; answerText?: string;
  };

  const paperCode = body.paperCode && PAPERS.has(body.paperCode) ? body.paperCode : "GS-I";
  const questionText = (body.questionText ?? "").trim();
  const answerText = (body.answerText ?? "").trim();
  const maxMarks = [10, 15, 20, 125, 250].includes(Number(body.maxMarks)) ? Number(body.maxMarks) : 10;

  if (questionText.length < 8) return Response.json({ error: "Add the question you're answering." }, { status: 400 });
  if (answerText.split(/\s+/).filter(Boolean).length < 30) return Response.json({ error: "Write a fuller answer (at least ~30 words) for a meaningful evaluation." }, { status: 400 });

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";
  const wordCount = answerText.split(/\s+/).filter(Boolean).length;

  let evalResult;
  try {
    evalResult = await evaluateMainsAnswer({ questionText, paperCode, maxMarks, answerText, examCode });
  } catch (e) {
    const msg = e instanceof ChapterAnalysisError ? e.message : "Evaluation failed. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }

  const saved = await prisma.mainsAnswer.create({
    data: {
      userId: DEMO_USER_ID, examCode, questionId: body.questionId ?? null, paperCode, questionText, maxMarks, answerText, wordCount,
      score: evalResult.score, breakdown: evalResult.breakdown as object,
      strengths: evalResult.strengths, improvements: evalResult.improvements, verdict: evalResult.verdict,
      evaluatedAt: new Date(),
    },
  });

  await logEvent({ type: "ANSWER_WRITTEN", refId: saved.id, subject: paperCode, value: Math.round(evalResult.score) });

  return Response.json(saved);
}
