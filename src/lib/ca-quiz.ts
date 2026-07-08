/* ════════════════════════════════════════════════════════════════
   Daily CA MCQ drill + concept clustering.

   Quiz: 10 UPSC-style MCQs generated FROM a day's Board-judged items —
   grounded in the verdicts (hidden concepts become the tested ideas,
   the Board's trap statements become distractors). Content-addressed
   by the sheet's sourceHash; answers stay server-side until submission;
   attempts are REAL TestAttempts (mode "ca-daily") feeding the same
   accuracy analytics as the Test Arena.

   Concepts: the "organize by concept, date is metadata" view — worthy
   items across the whole archive clustered by their Board static-link
   topics, so a recurring theme (Western Ghats…) is one knowledge node
   accumulating items over time. Deterministic, no AI call.
   ════════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { generateJson } from "@/lib/ai";
import { logEvent } from "@/lib/activity";
import type { Prisma } from "@prisma/client";
import type { SheetContent, SheetItem } from "@/lib/ca-sheets";

export interface CaMcq { question: string; options: string[]; answerIndex: number; explanation: string; concept: string }
export interface CaQuiz { mcqs: CaMcq[]; sourceHash: string; generatedAt: string; attempts: { at: string; percent: number; correct: number; wrong: number; skipped: number }[] }

const QUIZ_SYSTEM = `You are a UPSC Prelims question setter. From the day's current-affairs briefs below, write exam-standard MCQs that test the CONCEPT behind the news, never the trivia (no dates, prize amounts, names of officials). Use real UPSC framing: statement-combination ("how many of the above are correct"), match-the-pairs, institution-mandate, scheme-ministry. Build wrong options from the provided trap statements where possible. Single best answer, four plausible options each.

Respond ONLY with valid JSON:
{"mcqs":[{"question":"…(statements formatted with \\n)","options":["A","B","C","D"],"answerIndex":0,"explanation":"why correct + why the traps are wrong (1-2 lines)","concept":"the static concept tested (e.g. Western Ghats ESA)"}]}`;

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Generate (or return cached) the day's 10-MCQ drill. Null if no sheet/items. */
export async function generateDailyQuiz(day: Date): Promise<{ sheetId: string; quiz: CaQuiz } | null> {
  const sheet = await prisma.caDailySheet.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day: dayStart(day) } } });
  if (!sheet) return null;
  const content = sheet.content as unknown as SheetContent;
  if (!content.items?.length) return null;

  const existing = sheet.quiz as unknown as CaQuiz | null;
  if (existing?.mcqs?.length && existing.sourceHash === sheet.sourceHash) return { sheetId: sheet.id, quiz: existing };

  const grounding = content.items.slice(0, 12).map((it, i) => [
    `ITEM ${i + 1}: ${it.headline}`,
    `  takeaway: ${it.w25}`,
    it.staticLinks?.length ? `  static concepts: ${it.staticLinks.map((s) => `${s.paper} ${s.topic}`).join("; ")}` : "",
    it.traps?.length ? `  trap statements (use as wrong options): ${it.traps.join(" | ")}` : "",
    it.confusable ? `  confusable: ${it.confusable}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");

  const n = Math.min(10, Math.max(4, content.items.length * 2));
  const out = await generateJson<{ mcqs: CaMcq[] }>(QUIZ_SYSTEM, `${grounding}\n\nWrite ${n} MCQs covering the most exam-worthy concepts above.`);
  const mcqs = (Array.isArray(out.mcqs) ? out.mcqs : [])
    .filter((m) => m?.question && Array.isArray(m.options) && m.options.length === 4 && typeof m.answerIndex === "number" && m.answerIndex >= 0 && m.answerIndex <= 3)
    .slice(0, 10)
    .map((m) => ({
      question: String(m.question).slice(0, 800),
      options: m.options.map((o) => String(o).slice(0, 300)),
      answerIndex: m.answerIndex,
      explanation: String(m.explanation ?? "").slice(0, 500),
      concept: String(m.concept ?? "").slice(0, 80),
    }));
  if (mcqs.length === 0) throw new Error("Quiz generation returned no usable MCQs — try again.");

  const quiz: CaQuiz = { mcqs, sourceHash: sheet.sourceHash, generatedAt: new Date().toISOString(), attempts: existing?.attempts ?? [] };
  await prisma.caDailySheet.update({ where: { id: sheet.id }, data: { quiz: quiz as unknown as Prisma.InputJsonObject } });
  return { sheetId: sheet.id, quiz };
}

/** Grade a submission with UPSC marking, record a REAL TestAttempt + ledger event. */
export async function submitDailyQuiz(day: Date, choices: (number | null)[]) {
  const sheet = await prisma.caDailySheet.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day: dayStart(day) } } });
  const quiz = sheet?.quiz as unknown as CaQuiz | null;
  if (!sheet || !quiz?.mcqs?.length) throw new Error("No quiz for this day");

  const CORRECT = 2, PENALTY = 0.66;
  let correct = 0, wrong = 0, skipped = 0;
  const review = quiz.mcqs.map((m, i) => {
    const chosen = typeof choices[i] === "number" ? choices[i] : null;
    const isCorrect = chosen === m.answerIndex;
    if (chosen === null) skipped++; else if (isCorrect) correct++; else wrong++;
    return { question: m.question, options: m.options, chosen, correctIndex: m.answerIndex, correct: isCorrect, explanation: m.explanation, concept: m.concept };
  });
  const total = quiz.mcqs.length;
  const score = Math.round((correct * CORRECT - wrong * PENALTY) * 100) / 100;
  const maxScore = total * CORRECT;
  const percent = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 100) : 0;

  const attempt = await prisma.testAttempt.create({
    data: {
      userId: DEMO_USER_ID, examCode: "UPSC", mode: "ca-daily", subject: "Current Affairs",
      totalQ: total, correct, wrong, skipped, score, maxScore, percent, durationSec: 0,
      answers: review.map((r) => ({ mcqId: `ca-${sheet.id}-${r.correctIndex}`, chosen: r.chosen, correctIndex: r.correctIndex })),
      bySubject: [{ subject: "Current Affairs", correct, total }],
    },
  });
  await logEvent({ type: "TEST_ATTEMPTED", refId: attempt.id, subject: "Current Affairs", value: percent });

  const attempts = [...(quiz.attempts ?? []), { at: new Date().toISOString(), percent, correct, wrong, skipped }].slice(-10);
  await prisma.caDailySheet.update({ where: { id: sheet.id }, data: { quiz: { ...quiz, attempts } as unknown as Prisma.InputJsonObject } });

  return { total, correct, wrong, skipped, score, maxScore, percent, review };
}

/** Concept clusters across the archive — one knowledge node per static topic. */
export async function conceptClusters(limit = 40) {
  const sheets = await prisma.caDailySheet.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { day: "desc" } });
  const map = new Map<string, { concept: string; papers: Set<string>; items: { day: Date; affairId: string; headline: string; w25: string }[] }>();
  for (const s of sheets) {
    const c = s.content as unknown as SheetContent;
    for (const it of c.items ?? []) {
      const links = it.staticLinks?.length ? it.staticLinks : [{ paper: "GS", topic: "Uncategorised" }];
      for (const l of links.slice(0, 2)) {
        const key = l.topic.trim().toLowerCase();
        if (!key) continue;
        const e = map.get(key) ?? { concept: l.topic.trim(), papers: new Set<string>(), items: [] };
        e.papers.add(l.paper);
        if (!e.items.some((x) => x.affairId === it.affairId)) {
          e.items.push({ day: s.day, affairId: it.affairId, headline: it.headline, w25: it.w25 });
        }
        map.set(key, e);
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, limit)
    .map((e) => ({ concept: e.concept, papers: [...e.papers], count: e.items.length, items: e.items }));
}

export type { SheetItem };
