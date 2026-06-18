import { prisma, DEMO_USER_ID } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { computeStreak } from "@/lib/activity";
import {
  UPSC_OVERVIEW, PRELIMS_PAPERS, MAINS_PAPERS, MAINS_WRITTEN_TOTAL, INTERVIEW_MARKS, GRAND_TOTAL,
  TOPPERS, benchmarkBands, targetBlueprint, SUBJECTS, ROADMAP, marksInsights,
} from "@/lib/exam-knowledge";

/**
 * GET /api/exam-center — the UPSC Command Center data.
 * Static halves (overview, structure, real topper benchmarks) are
 * factual reference. The `metrics` half is the user's REAL activity,
 * and every metric ships a provenance object (source / method /
 * updatedAt / activities) so it is fully auditable. Anything the
 * platform cannot measure yet is returned with measured:false and an
 * honest note — never a fabricated number.
 */

interface Provenance { source: string; method: string; updatedAt: string | null; activities: string }

export async function GET() {
  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";
  const target = profile?.targetMarks ?? 1100;
  const targetSource = profile?.targetMarks ? "your setting" : "default — set your goal in Settings";

  const [
    chapterDone, ncertTotal, attempts, dueCards, totalCards,
    caRead, caTotal, notesCount, eventAgg, streak, mainsAns,
  ] = await Promise.all([
    prisma.chapterProgress.count({ where: { userId: DEMO_USER_ID } }),
    prisma.ncertChapter.count({ where: { kind: "chapter" } }),
    prisma.pyqAttempt.findMany({ where: { userId: DEMO_USER_ID, selfRating: { in: ["correct", "partial", "wrong"] } }, select: { subject: true, selfRating: true } }),
    prisma.revision.count({ where: { userId: DEMO_USER_ID, dueAt: { lte: new Date() } } }),
    prisma.revision.count({ where: { userId: DEMO_USER_ID } }),
    prisma.caRead.count({ where: { userId: DEMO_USER_ID } }),
    prisma.currentAffair.count({ where: { examScope: { has: examCode } } }),
    prisma.note.count({ where: { userId: DEMO_USER_ID } }),
    prisma.activityEvent.groupBy({ by: ["type"], where: { userId: DEMO_USER_ID }, _count: { _all: true }, _sum: { value: true }, _max: { createdAt: true } }),
    computeStreak(),
    prisma.mainsAnswer.findMany({ where: { userId: DEMO_USER_ID, evaluatedAt: { not: null }, score: { not: null } }, select: { paperCode: true, score: true, maxMarks: true, evaluatedAt: true } }),
  ]);

  // ── Real written-paper performance from evaluated answers ──────
  // Per counted paper: average % on your answers → projected /250.
  const COUNTED = ["ESSAY", "GS-I", "GS-II", "GS-III", "GS-IV", "OPTIONAL"];
  const ansBy = new Map<string, { n: number; pct: number }>();
  for (const a of mainsAns) { const m = ansBy.get(a.paperCode) ?? { n: 0, pct: 0 }; m.n++; m.pct += (a.score! / a.maxMarks); ansBy.set(a.paperCode, m); }
  const writtenProjection = COUNTED.map((code) => {
    const m = ansBy.get(code);
    const max = code === "OPTIONAL" ? 500 : 250;
    return m ? { paper: code, answers: m.n, avgPct: Math.round((m.pct / m.n) * 100), projected: Math.round((m.pct / m.n) * max), max, measured: true }
             : { paper: code, answers: 0, avgPct: null, projected: null, max, measured: false };
  });
  const lastEval = mainsAns.reduce<Date | null>((acc, a) => (a.evaluatedAt && (!acc || a.evaluatedAt > acc) ? a.evaluatedAt : acc), null);

  // Per-type activity rollup (count, sum, last timestamp)
  const ev = new Map(eventAgg.map((e) => [e.type, { count: e._count._all, sum: e._sum.value ?? 0, last: e._max.createdAt }]));
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

  // PYQ accuracy by GS paper (real, self-rated)
  const acc = new Map<string, { r: number; c: number }>();
  for (const a of attempts) { const s = a.subject ?? "General"; const m = acc.get(s) ?? { r: 0, c: 0 }; m.r++; if (a.selfRating === "correct") m.c++; acc.set(s, m); }
  const accuracyBySubject = [...acc.entries()].map(([subject, m]) => ({ subject, attempted: m.r, correct: m.c, pct: Math.round((m.c / m.r) * 100) })).sort((a, b) => a.pct - b.pct);

  const metric = (value: unknown, p: Provenance) => ({ value, ...p });

  return Response.json({
    exam: { code: examCode, shortName: profile?.exam.shortName ?? "UPSC CSE" },
    target: { final: target, source: targetSource },

    // ── Factual reference (verifiable) ──────────────────────────
    overview: UPSC_OVERVIEW,
    structure: {
      prelims: PRELIMS_PAPERS, mains: MAINS_PAPERS,
      mainsWrittenTotal: MAINS_WRITTEN_TOTAL, interview: INTERVIEW_MARKS, grandTotal: GRAND_TOTAL,
    },
    toppers: TOPPERS,
    bands: benchmarkBands(),
    blueprint: targetBlueprint(target),
    insights: marksInsights(),
    subjects: SUBJECTS,
    roadmap: ROADMAP,

    // ── Real user metrics with provenance (auditable) ───────────
    metrics: {
      ncertCoverage: metric(
        { done: chapterDone, total: ncertTotal, pct: ncertTotal ? Math.round((chapterDone / ncertTotal) * 100) : 0 },
        { source: "ChapterProgress table", method: "chapters you marked complete ÷ total NCERT chapters", updatedAt: iso(ev.get("CHAPTER_READ")?.last), activities: `${ev.get("CHAPTER_READ")?.count ?? 0} chapters marked complete` },
      ),
      pyqPractice: metric(
        { attempted: attempts.length, accuracyBySubject },
        { source: "PyqAttempt + ActivityEvent", method: "self-rated attempts; accuracy = correct ÷ rated, per GS paper", updatedAt: iso(ev.get("PYQ_ATTEMPTED")?.last), activities: `${ev.get("PYQ_ATTEMPTED")?.count ?? 0} PYQs attempted` },
      ),
      revision: metric(
        { totalCards, due: dueCards, reviewed: ev.get("REVISION_REVIEWED")?.count ?? 0 },
        { source: "Revision (SM-2) + ActivityEvent", method: "cards in the system; due = dueAt ≤ now; reviewed = logged reviews", updatedAt: iso(ev.get("REVISION_REVIEWED")?.last), activities: `${ev.get("REVISION_REVIEWED")?.count ?? 0} reviews logged` },
      ),
      currentAffairs: metric(
        { read: caRead, total: caTotal },
        { source: "CaRead receipts", method: "articles you opened ÷ articles in the feed", updatedAt: iso(ev.get("CA_READ")?.last), activities: `${ev.get("CA_READ")?.count ?? 0} articles read` },
      ),
      notes: metric(
        { count: notesCount },
        { source: "Note table", method: "notes you created", updatedAt: iso(ev.get("NOTE_CREATED")?.last), activities: `${notesCount} notes` },
      ),
      study: metric(
        { minutes: ev.get("STUDY_SESSION")?.sum ?? 0, sessions: ev.get("STUDY_SESSION")?.count ?? 0 },
        { source: "StudySession + ActivityEvent", method: "sum of logged deep-work session minutes", updatedAt: iso(ev.get("STUDY_SESSION")?.last), activities: `${ev.get("STUDY_SESSION")?.count ?? 0} sessions` },
      ),
      streak: metric(
        { streak: streak.streak, active30: streak.active30 },
        { source: "ActivityEvent", method: "consecutive days with ≥1 logged action", updatedAt: iso(streak.lastActive ? new Date(streak.lastActive) : null), activities: "all logged activity" },
      ),
      // Honestly NOT measured — no test-series engine exists yet.
      tests: { value: { attempted: 0 }, measured: false, note: "No test-series engine yet. Your test scores will appear here once tests are added." },
      // Real now: evaluated Mains answers → per-paper projection vs the blueprint.
      mainsAnswers: mainsAns.length > 0
        ? { measured: true, ...metric(
            { written: mainsAns.length, projection: writtenProjection },
            { source: "MainsAnswer (AI-evaluated)", method: "average % across your evaluated answers per paper, projected onto the counted maximum (250, or 500 for Optional)", updatedAt: iso(lastEval), activities: `${mainsAns.length} answers evaluated` },
          ) }
        : { value: { written: 0, projection: writtenProjection }, measured: false, note: "No evaluated answers yet. Write answers in the Mains Answer Lab to turn the benchmark into a real, measured gap." },
    },
  });
}
