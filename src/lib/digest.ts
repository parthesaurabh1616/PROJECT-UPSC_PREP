/* ════════════════════════════════════════════════════════════
   WEEKLY DIGEST — the honest weekly review. Every figure is a
   real measurement from the activity ledger and the platform's
   evaluated data (tests, answers, revision, coverage). Week-over-
   week deltas are real; the "next week" focus list is derived
   deterministically from the real weak signals (auditable).
   ════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { computeStreak } from "@/lib/activity";

const DAY = 86400000;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export interface WeeklyDigest {
  period: { from: string; to: string };
  activity: { type: string; label: string; thisWeek: number; lastWeek: number; delta: number }[];
  activeDays: number;
  streak: number;
  study: { minutes: number; lastWeekMinutes: number };
  performance: {
    tests: { thisWeek: number; avgPct: number | null; lastAvgPct: number | null };
    answers: { thisWeek: number; avgPct: number | null };
    revision: { reviewedThisWeek: number; dueNow: number; overdue: number };
    pyqAccuracy: { subject: string; pct: number; attempted: number }[];
  };
  weakAreas: { kind: string; label: string; detail: string }[];
  focus: { priority: "high" | "medium" | "low"; action: string; why: string }[];
  facts: string; // compact text for the AI narrative
}

const TYPE_LABEL: Record<string, string> = {
  CHAPTER_READ: "Chapters read", PYQ_ATTEMPTED: "PYQs attempted", CA_READ: "Affairs read",
  NOTE_CREATED: "Notes created", REVISION_REVIEWED: "Cards reviewed", STUDY_SESSION: "Study sessions",
  TEST_ATTEMPTED: "Tests taken", ANSWER_WRITTEN: "Answers written",
};

export async function computeWeeklyDigest(userId = DEMO_USER_ID): Promise<WeeklyDigest> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

  const [thisAgg, lastAgg, streak, testsThis, testsLast, answersThis, dueNow, overdue, pyqAttempts, eventsThisRaw] = await Promise.all([
    prisma.activityEvent.groupBy({ by: ["type"], where: { userId, createdAt: { gte: weekAgo } }, _count: { _all: true }, _sum: { value: true } }),
    prisma.activityEvent.groupBy({ by: ["type"], where: { userId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } }, _count: { _all: true }, _sum: { value: true } }),
    computeStreak(userId),
    prisma.testAttempt.findMany({ where: { userId, createdAt: { gte: weekAgo } }, select: { percent: true } }),
    prisma.testAttempt.findMany({ where: { userId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } }, select: { percent: true } }),
    prisma.mainsAnswer.findMany({ where: { userId, evaluatedAt: { gte: weekAgo }, score: { not: null } }, select: { score: true, maxMarks: true, paperCode: true } }),
    prisma.revision.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.revision.count({ where: { userId, dueAt: { lt: startToday } } }),
    prisma.pyqAttempt.findMany({ where: { userId, selfRating: { in: ["correct", "partial", "wrong"] } }, select: { subject: true, selfRating: true } }),
    prisma.activityEvent.findMany({ where: { userId, createdAt: { gte: weekAgo } }, select: { createdAt: true } }),
  ]);

  const cnt = (agg: typeof thisAgg, t: string) => agg.find((a) => a.type === t)?._count._all ?? 0;
  const sum = (agg: typeof thisAgg, t: string) => agg.find((a) => a.type === t)?._sum.value ?? 0;

  const activity = Object.keys(TYPE_LABEL).map((t) => {
    const thisWeek = cnt(thisAgg, t), lastWeek = cnt(lastAgg, t);
    return { type: t, label: TYPE_LABEL[t], thisWeek, lastWeek, delta: thisWeek - lastWeek };
  });

  const activeDays = new Set(eventsThisRaw.map((e) => dayKey(e.createdAt))).size;
  const studyMin = sum(thisAgg, "STUDY_SESSION");
  const lastStudyMin = sum(lastAgg, "STUDY_SESSION");

  const avg = (arr: { percent: number }[]) => arr.length ? Math.round(arr.reduce((s, x) => s + x.percent, 0) / arr.length) : null;
  const answersAvg = answersThis.length ? Math.round(answersThis.reduce((s, a) => s + (a.score! / a.maxMarks), 0) / answersThis.length * 100) : null;

  // PYQ accuracy by subject (weakest first)
  const accMap = new Map<string, { r: number; c: number }>();
  for (const a of pyqAttempts) { const s = a.subject ?? "General"; const m = accMap.get(s) ?? { r: 0, c: 0 }; m.r++; if (a.selfRating === "correct") m.c++; accMap.set(s, m); }
  const pyqAccuracy = [...accMap.entries()].filter(([, m]) => m.r >= 3).map(([subject, m]) => ({ subject, pct: Math.round((m.c / m.r) * 100), attempted: m.r })).sort((a, b) => a.pct - b.pct);

  // ── Weak areas (real signals) ─────────────────────────────────
  const weakAreas: WeeklyDigest["weakAreas"] = [];
  if (overdue > 0) weakAreas.push({ kind: "revision", label: "Overdue revision", detail: `${overdue} cards past due` });
  for (const a of pyqAccuracy.filter((x) => x.pct < 55).slice(0, 2)) weakAreas.push({ kind: "accuracy", label: `${a.subject} accuracy`, detail: `${a.pct}% over ${a.attempted} PYQs` });
  const testAvg = avg(testsThis);
  if (testAvg != null && testAvg < 45) weakAreas.push({ kind: "test", label: "Prelims test scores", detail: `avg ${testAvg}% this week` });

  // ── Focus for next week (deterministic from real signals) ─────
  const focus: WeeklyDigest["focus"] = [];
  if (overdue > 0) focus.push({ priority: "high", action: `Clear ${overdue} overdue revision cards`, why: "Spaced repetition only works if you review on schedule." });
  for (const a of pyqAccuracy.filter((x) => x.pct < 55).slice(0, 2)) focus.push({ priority: "high", action: `Drill ${a.subject}`, why: `Your PYQ accuracy there is ${a.pct}% — the weakest measured area.` });
  if (cnt(thisAgg, "TEST_ATTEMPTED") === 0) focus.push({ priority: "medium", action: "Take at least 2 Prelims tests", why: "No objective test this week — you have no fresh Prelims signal." });
  if (cnt(thisAgg, "ANSWER_WRITTEN") === 0) focus.push({ priority: "medium", action: "Write 2 Mains answers", why: "Answer writing is the highest-leverage Mains skill and you wrote none this week." });
  if (cnt(thisAgg, "CHAPTER_READ") === 0) focus.push({ priority: "medium", action: "Read at least 3 NCERT chapters", why: "Foundation coverage didn't move this week." });
  if (activeDays < 4) focus.push({ priority: "high", action: "Show up at least 5 days next week", why: `You were active ${activeDays}/7 days — consistency is the real differentiator.` });
  if (focus.length === 0) focus.push({ priority: "low", action: "Keep the rhythm and push answer-writing volume", why: "No weak signals this week — consolidate and stretch." });

  const facts = [
    `Active ${activeDays}/7 days, streak ${streak.streak}.`,
    `Study ${studyMin}m (prev ${lastStudyMin}m).`,
    `Chapters ${cnt(thisAgg, "CHAPTER_READ")}, PYQs ${cnt(thisAgg, "PYQ_ATTEMPTED")}, CA ${cnt(thisAgg, "CA_READ")}, reviews ${cnt(thisAgg, "REVISION_REVIEWED")}, tests ${cnt(thisAgg, "TEST_ATTEMPTED")}, answers ${cnt(thisAgg, "ANSWER_WRITTEN")}.`,
    testAvg != null ? `Test avg ${testAvg}%.` : "No tests.",
    answersAvg != null ? `Answer avg ${answersAvg}%.` : "No evaluated answers.",
    `Overdue revision ${overdue}, due now ${dueNow}.`,
    pyqAccuracy.length ? `Weakest PYQ areas: ${pyqAccuracy.slice(0, 3).map((a) => `${a.subject} ${a.pct}%`).join(", ")}.` : "No PYQ accuracy yet.",
  ].join(" ");

  return {
    period: { from: weekAgo.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
    activity, activeDays, streak: streak.streak,
    study: { minutes: studyMin, lastWeekMinutes: lastStudyMin },
    performance: {
      tests: { thisWeek: testsThis.length, avgPct: testAvg, lastAvgPct: avg(testsLast) },
      answers: { thisWeek: answersThis.length, avgPct: answersAvg },
      revision: { reviewedThisWeek: cnt(thisAgg, "REVISION_REVIEWED"), dueNow, overdue },
      pyqAccuracy,
    },
    weakAreas, focus, facts,
  };
}
