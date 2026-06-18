import { prisma, DEMO_USER_ID } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { computeStreak, computeRetention, computeThisWeek, computeStudyToday } from "@/lib/activity";

/**
 * GET /api/overview — the honest dashboard.
 * Every field is derived from real activity (the ledger) and real
 * content tables. Anything that cannot be computed returns null/0,
 * and the UI renders an explicit empty state — never a fake value.
 */
export async function GET() {
  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";
  const targetYear = profile?.targetYear ?? null;

  const [
    streak, retention, thisWeek, studyToday,
    notesCount, mentorThreads, caTotal, caReadCount,
    ncertTotalChapters, ncertDoneCount,
    pyqExtractedCount, pyqAttemptCount,
    totalCards, dueToday,
  ] = await Promise.all([
    computeStreak(), computeRetention(), computeThisWeek(), computeStudyToday(),
    prisma.note.count({ where: { userId: DEMO_USER_ID } }),
    prisma.conversation.count({ where: { userId: DEMO_USER_ID } }),
    prisma.currentAffair.count({ where: { examScope: { has: examCode } } }),
    prisma.caRead.count({ where: { userId: DEMO_USER_ID } }),
    prisma.ncertChapter.count({ where: { kind: "chapter" } }),
    prisma.chapterProgress.count({ where: { userId: DEMO_USER_ID } }),
    prisma.pyqQuestion.count({ where: { paper: { examCode } } }),
    prisma.pyqAttempt.count({ where: { userId: DEMO_USER_ID } }),
    prisma.revision.count({ where: { userId: DEMO_USER_ID } }),
    prisma.revision.count({ where: { userId: DEMO_USER_ID, dueAt: { lte: new Date() } } }),
  ]);

  // ── Coverage per subject (real: completed NCERT chapters ÷ total) ─
  const books = await prisma.ncertBook.findMany({ select: { subject: true, chapterCount: true } });
  const totalBySubject = new Map<string, number>();
  for (const b of books) totalBySubject.set(b.subject, (totalBySubject.get(b.subject) ?? 0) + b.chapterCount);

  const doneRows = await prisma.chapterProgress.findMany({
    where: { userId: DEMO_USER_ID },
    select: { chapterId: true },
  });
  const doneBySubject = new Map<string, number>();
  if (doneRows.length > 0) {
    const chapters = await prisma.ncertChapter.findMany({
      where: { id: { in: doneRows.map((r) => r.chapterId) } },
      select: { book: { select: { subject: true } } },
    });
    for (const c of chapters) doneBySubject.set(c.book.subject, (doneBySubject.get(c.book.subject) ?? 0) + 1);
  }
  const coverageBySubject = [...totalBySubject.entries()]
    .map(([subject, total]) => {
      const done = doneBySubject.get(subject) ?? 0;
      return { subject, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  // ── PYQ accuracy per subject (real: self-rated attempts) ─────────
  const ACC_MIN = 5; // honest threshold before showing an accuracy %
  const attempts = await prisma.pyqAttempt.findMany({
    where: { userId: DEMO_USER_ID, selfRating: { in: ["correct", "partial", "wrong"] } },
    select: { subject: true, selfRating: true },
  });
  const accMap = new Map<string, { rated: number; correct: number }>();
  for (const a of attempts) {
    const s = a.subject ?? "General";
    const m = accMap.get(s) ?? { rated: 0, correct: 0 };
    m.rated++; if (a.selfRating === "correct") m.correct++;
    accMap.set(s, m);
  }
  const accuracyBySubject = [...accMap.entries()]
    .filter(([, m]) => m.rated >= ACC_MIN)
    .map(([subject, m]) => ({ subject, attempted: m.rated, correct: m.correct, pct: Math.round((m.correct / m.rated) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  // ── Real insight 1: overdue revision (SM-2) ──────────────────────
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const overdueRows = await prisma.revision.findMany({
    where: { userId: DEMO_USER_ID, dueAt: { lt: startToday } },
    orderBy: { dueAt: "asc" },
    take: 5,
    select: { id: true, front: true, subject: true, dueAt: true },
  });
  const overdueRevision = overdueRows.map((r) => ({
    id: r.id, front: r.front, subject: r.subject,
    daysOverdue: Math.max(1, Math.floor((startToday.getTime() - r.dueAt.getTime()) / 86400000)),
  }));

  // ── Real insight 2: PYQ frequency (no fake confidence) ───────────
  const freq = await prisma.pyqQuestion.groupBy({
    by: ["topic"],
    where: { paper: { examCode }, topic: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { topic: "desc" } },
    take: 6,
  });
  const pyqFrequency = freq
    .filter((f) => f.topic && f._count._all >= 2)
    .map((f) => ({ topic: f.topic as string, count: f._count._all }));

  // ── Exam countdown (estimate, clearly labelled) ──────────────────
  let daysToPrelims: number | null = null;
  let prelimsEstimate: string | null = null;
  if (targetYear) {
    // UPSC Prelims typically the last Sunday of May; MPSC varies — estimate.
    const est = new Date(targetYear, 4, 25); // 25 May of target year
    prelimsEstimate = est.toISOString().slice(0, 10);
    daysToPrelims = Math.ceil((est.getTime() - Date.now()) / 86400000);
    if (daysToPrelims < 0) daysToPrelims = null; // past — don't show a stale countdown
  }

  return Response.json({
    exam: { code: examCode, shortName: profile?.exam.shortName ?? "UPSC CSE", targetYear, prelimsEstimate, daysToPrelims },
    streak,
    studyToday,
    thisWeek,
    retention,
    coverage: {
      ncert: { done: ncertDoneCount, total: ncertTotalChapters, pct: ncertTotalChapters ? Math.round((ncertDoneCount / ncertTotalChapters) * 100) : 0 },
      bySubject: coverageBySubject,
    },
    accuracy: { min: ACC_MIN, bySubject: accuracyBySubject, totalAttempts: pyqAttemptCount },
    revision: { totalCards, dueToday },
    insights: { overdueRevision, pyqFrequency },
    totals: {
      notes: notesCount, mentorThreads, caTotal, caReadCount, caUnread: Math.max(0, caTotal - caReadCount),
      pyqExtracted: pyqExtractedCount, pyqAttempted: pyqAttemptCount,
      ncertDone: ncertDoneCount, ncertTotal: ncertTotalChapters,
    },
  });
}
