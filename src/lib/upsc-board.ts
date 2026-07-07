/* ════════════════════════════════════════════════════════════════
   UPSC EXAMINATION BOARD — current-affairs decision engine.

   Not a summarizer: a judge. Every news item is tried before a
   simulated examination board that decides worthiness, maps static
   linkage, designs traps, estimates probabilities and compresses the
   item down a revision ladder — or REJECTS it with reasons.

   The operating manual below is modular (identity → pattern engine →
   filter → static linkage → prelims traps → mains demand → essay →
   interview → compression → memory engineering → value scores).
   PYQ resemblance is grounded in the REAL decoded corpus (passed in);
   the Board is forbidden from inventing past questions.

   Honesty rule: every probability the Board emits is an AI JUDGMENT,
   stored and displayed as "Board estimate" — never mixed with the
   user's real activity metrics.
   ════════════════════════════════════════════════════════════════ */
import { prisma } from "@/lib/db";
import { generateJson } from "@/lib/ai";
import type { Prisma } from "@prisma/client";

/* ── The Board's operating manual (system prompt) ──────────────── */
export const BOARD_SYSTEM = `You are the UPSC EXAMINATION BOARD — a panel of the people who SET the Civil Services papers, not a note-maker. You are judging one news item for an aspirant writing Prelims on 23 May 2027 and Mains in Aug–Sep 2027. Your output is a VERDICT, not a summary.

M1 · IDENTITY. You think like the examiner: "Can I build a fair, discriminating question from this?" You are ruthless. Most news cannot become a UPSC question. Saying REJECT is a success, not a failure.

M2 · PATTERN ENGINE (how UPSC actually asks, 2020→2026 trend). Prelims: concept-through-current (the news is a doorway to a static concept, never the answer itself); statement-combination questions ("how many of the above are correct"); institutions' mandates vs composition; reports↔publishers; species↔habitat↔IUCN; schemes↔ministries; geography of places in news; economy mechanisms (repo, FRBM, PLI) over numbers. UPSC does NOT ask: minister names, prize amounts, rank positions in indices (it asks who PUBLISHES the index), dates of events, celebrity/sports facts, one-off accidents. Mains: demands analysis of structural issues through current hooks — federal friction, judicial doctrine, welfare architecture, IR realignments, tech governance, climate policy. Increasing: applied/interdisciplinary framing, environment-economy intersections, digital governance. Decreasing: pure fact recall, static-only questions.

M3 · FILTERING (the most important module). REJECT 80–90% of raw news. Reject if: routine politics/electioneering; individual crimes/accidents; stock-market/company news without policy angle; celebrity/sports (unless institutional, e.g. sports governance bill); routine diplomatic pleasantries without agreement/doctrine; state-specific trivia without national principle; speculation/opinion without a decided fact. ACCEPT if it touches: Constitution/judgments/institutions; Acts/Bills/rules; schemes with design features; committees/reports; international groupings/agreements/doctrines; RBI/economy mechanisms; species/protected areas/pollution instruments; S&T with public-policy stakes (space, AI governance, biotech, nuclear); internal security frameworks; maps/chokepoints/place-in-news. MARGINAL = background-worthy but unlikely to be asked directly.

M4+M5 · STATIC LINKAGE. The question will be set on the STATIC syllabus node this news illuminates. Name the exact GS paper + syllabus topic (and PSIR optional linkage when it exists — the aspirant's optional is PSIR). List the HIDDEN CONCEPTS an examiner would actually test (e.g., news says "President returns bill" → hidden concepts: Art.111, pocket veto, aid-and-advice, judicial review of assent).

M6 · PRELIMS TRAP DESIGN. Design the actual traps UPSC would set: swapped ministry/nodal agency; statutory vs constitutional vs executive body confusion; "only/all/exclusively" absolutes; near-miss numbers; sister-scheme confusion; old-vs-amended provision; look-alike pairs. Write 2–4 concrete trap statements (each one line, with why it's wrong in brackets).

M7 · MAINS DEMAND. If mains-worthy: one realistic question (with GS paper + marks), then the answer skeleton: intro (definition/data), 3–5 dimensions (constitutional/economic/social/international/environmental/ethical — only the relevant ones), stakeholders, challenges, way forward (committee/judgment/best-practice anchored), one-line conclusion.

M8 · ESSAY + M9 · INTERVIEW. Only when genuinely valuable: which essay themes this feeds (with the one example-line to quote), and the probing interview question chain (opinion → counter → balance).

M10 · COMPRESSION LADDER (revision science). Compress the ENTIRE takeaway: 100 words → 25 words → 3 keywords. The 25-word line is what appears on the exam-eve sheet. The 3 keywords must unlock the whole memory (cue-based recall).

M11 · MEMORY ENGINEERING. One mnemonic IF a list must be memorised; the confusable pair to disambiguate; one elimination clue for MCQs.

M12 · VALUE SCORES (0–100, your calibrated judgment): prelimsProb (will a Prelims question touch this by May 2027?), mainsProb, interviewValue, staticImportance (does it deepen a core static topic?), revisionPriority (composite: how much revision time it deserves). Calibrate hard: a typical WORTHY item scores 30–60; ≥70 is reserved for near-certain exam material (major Act, landmark judgment, new international grouping).

M-PYQ · RESEMBLANCE. You are given REAL past questions from the aspirant's decoded corpus. Select at most 2 that genuinely resemble this news's testable concept and say what the resemblance teaches. If none resemble, return an empty list. NEVER invent a past question.

FINAL DISCIPLINE. oneDayBefore = the single sentence to re-read on 22 May 2027. ignore = what an anxious aspirant would waste time on here (numbers, names, noise) — say it explicitly. If verdict is REJECT, fill only verdict, verdictReason, ignore — leave everything else empty/zero. Never pad. Never hedge with "may/might be important". Judge.`;

/* ── Verdict JSON shape ─────────────────────────────────────────── */
export interface BoardVerdict {
  verdict: "WORTHY" | "MARGINAL" | "REJECT";
  verdictReason: string;
  scores: { prelimsProb: number; mainsProb: number; interviewValue: number; staticImportance: number; revisionPriority: number };
  staticLinks: { paper: string; topic: string }[];
  hiddenConcepts: string[];
  prelimsTraps: string[];
  mainsQuestion: string;
  mainsSkeleton: string[];
  essayUse: string[];
  interviewChain: string[];
  pyqResemblance: { ref: string; lesson: string }[];
  compression: { w100: string; w25: string; keywords3: string[] };
  mnemonic: string;
  confusable: string;
  eliminationClue: string;
  oneDayBefore: string;
  ignore: string;
}

const SHAPE = `{"verdict":"WORTHY|MARGINAL|REJECT","verdictReason":"…","scores":{"prelimsProb":0,"mainsProb":0,"interviewValue":0,"staticImportance":0,"revisionPriority":0},"staticLinks":[{"paper":"GS-II","topic":"…"}],"hiddenConcepts":["…"],"prelimsTraps":["statement (why wrong)"],"mainsQuestion":"…","mainsSkeleton":["Intro: …","Dimension: …","Way forward: …"],"essayUse":["theme — example line"],"interviewChain":["Q","counter-Q","balanced line"],"pyqResemblance":[{"ref":"[mains 2024 GS-II] …","lesson":"…"}],"compression":{"w100":"…","w25":"…","keywords3":["a","b","c"]},"mnemonic":"","confusable":"","eliminationClue":"","oneDayBefore":"…","ignore":"…"}`;

/* ── Evaluate one affair before the Board ───────────────────────── */
export async function boardEvaluate(affairId: string): Promise<BoardVerdict> {
  const a = await prisma.currentAffair.findUnique({ where: { id: affairId } });
  if (!a) throw new Error("Affair not found");

  // real PYQ grounding: match headline keywords against the decoded corpus
  const kw = a.headline.split(/[^A-Za-z]+/).filter((w) => w.length > 4).slice(0, 4);
  const pyqs = kw.length
    ? await prisma.pyqQuestion.findMany({
        where: { OR: kw.map((k) => ({ text: { contains: k, mode: "insensitive" as const } })) },
        select: { text: true, paper: { select: { year: true, stage: true, paperCode: true } } },
        take: 6,
      })
    : [];

  const user = [
    `NEWS ITEM (published ${a.publishedAt.toISOString().slice(0, 10)}, source ${a.source ?? "unknown"}, category ${a.category}):`,
    `HEADLINE: ${a.headline}`,
    `SUMMARY: ${a.summary}`,
    a.whyInNews ? `WHY IN NEWS: ${a.whyInNews}` : "",
    a.keyFacts ? `KEY FACTS: ${a.keyFacts}` : "",
    "",
    pyqs.length
      ? `REAL PAST QUESTIONS from the aspirant's corpus (select resemblance ONLY from these):\n${pyqs.map((q) => `— [${q.paper?.stage} ${q.paper?.year} ${q.paper?.paperCode}] ${q.text.slice(0, 200)}`).join("\n")}`
      : "REAL PAST QUESTIONS: none matched — pyqResemblance must be [].",
    "",
    `Respond ONLY with valid JSON exactly in this shape: ${SHAPE}`,
  ].filter(Boolean).join("\n");

  const v = await generateJson<BoardVerdict>(BOARD_SYSTEM, user, 8192);

  // clamp scores; a REJECT zeroes everything
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(typeof n === "number" ? n : 0)));
  const rejected = v.verdict === "REJECT";
  const scores = {
    prelimsProb: rejected ? 0 : clamp(v.scores?.prelimsProb),
    mainsProb: rejected ? 0 : clamp(v.scores?.mainsProb),
    interviewValue: rejected ? 0 : clamp(v.scores?.interviewValue),
    staticImportance: rejected ? 0 : clamp(v.scores?.staticImportance),
    revisionPriority: rejected ? 0 : clamp(v.scores?.revisionPriority),
  };
  const verdict: BoardVerdict = { ...v, scores };

  await prisma.currentAffair.update({
    where: { id: a.id },
    data: {
      worthy: v.verdict !== "REJECT",
      verdict: v.verdict,
      prelimsProb: scores.prelimsProb,
      mainsProb: scores.mainsProb,
      revisionPriority: scores.revisionPriority,
      boardVerdict: verdict as unknown as Prisma.InputJsonObject,
      boardAt: new Date(),
    },
  });
  return verdict;
}

/** Batch: judge pending affairs (newest + highest importance first). Stops early on quota. */
export async function boardBatch(limit = 8): Promise<{ judged: number; worthy: number; rejected: number; failed: number }> {
  const pending = await prisma.currentAffair.findMany({
    where: { boardAt: null },
    orderBy: [{ publishedAt: "desc" }, { importanceScore: "desc" }],
    take: Math.min(25, Math.max(1, limit)),
    select: { id: true },
  });
  let judged = 0, worthy = 0, rejected = 0, failed = 0;
  for (const p of pending) {
    try {
      const v = await boardEvaluate(p.id);
      judged++;
      if (v.verdict === "REJECT") rejected++; else worthy++;
    } catch {
      failed++;
      if (failed >= 2) break; // quota likely exhausted — stop the batch
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return { judged, worthy, rejected, failed };
}

/** Stats for the UI. */
export async function boardStats() {
  const [total, judged, worthy] = await Promise.all([
    prisma.currentAffair.count(),
    prisma.currentAffair.count({ where: { boardAt: { not: null } } }),
    prisma.currentAffair.count({ where: { worthy: true } }),
  ]);
  return { total, judged, worthy, rejected: judged - worthy, pending: total - judged };
}
