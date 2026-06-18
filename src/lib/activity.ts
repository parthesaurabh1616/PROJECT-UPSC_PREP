/* ════════════════════════════════════════════════════════════
   ACTIVITY — the truth layer.
   Every honest metric is derived here from the ActivityEvent
   ledger and the real content tables. No fabrication: if there
   are no events, a metric returns null/0 and the UI shows an
   honest empty state rather than an invented number.
   ════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";

export type ActivityType =
  | "CHAPTER_READ" | "PYQ_ATTEMPTED" | "CA_READ" | "NOTE_CREATED"
  | "REVISION_REVIEWED" | "STUDY_SESSION" | "TEST_ATTEMPTED" | "ANSWER_WRITTEN";

/** Append one event to the ledger. Best-effort — never throws into the caller. */
export async function logEvent(input: {
  type: ActivityType; examCode?: string; refId?: string | null;
  subject?: string | null; value?: number; userId?: string;
}): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        userId: input.userId ?? DEMO_USER_ID,
        examCode: input.examCode ?? "UPSC",
        type: input.type,
        refId: input.refId ?? null,
        subject: input.subject ?? null,
        value: input.value ?? 0,
      },
    });
  } catch (e) {
    console.error("[activity] logEvent failed:", e instanceof Error ? e.message : e);
  }
}

// ── Local-day key (so streaks reflect the user's calendar day) ─
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Streak + active-days from REAL events.
 * streak  = consecutive days up to today with >=1 logged action.
 * active30 = distinct active days in the trailing 30 days.
 */
export async function computeStreak(userId = DEMO_USER_ID): Promise<{
  streak: number; longest: number; active30: number; lastActive: Date | null;
}> {
  const since = new Date(); since.setDate(since.getDate() - 400);
  const rows = await prisma.activityEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return { streak: 0, longest: 0, active30: 0, lastActive: null };

  const days = new Set(rows.map((r) => dayKey(r.createdAt)));

  // current streak: walk back from today (allow today OR yesterday to start)
  let streak = 0;
  const cur = new Date();
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1); // grace: yesterday still counts
  while (days.has(dayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }

  // longest streak across the window
  const sorted = [...days].map((k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m, d).getTime(); }).sort((a, b) => a - b);
  let longest = sorted.length ? 1 : 0; let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i] - sorted[i - 1]) / 86400000;
    if (gap === 1) { run++; longest = Math.max(longest, run); } else run = 1;
  }

  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const active30 = new Set(rows.filter((r) => r.createdAt >= d30).map((r) => dayKey(r.createdAt))).size;

  return { streak, longest, active30, lastActive: rows[0].createdAt };
}

/**
 * Retention from REAL revision grades (SM-2 quality 0–5 logged as events).
 * good = grade >= 3. Honest threshold: needs >= MIN reviews or returns null.
 */
export async function computeRetention(userId = DEMO_USER_ID, windowDays = 30): Promise<{
  pct: number | null; reviews: number; need: number;
}> {
  const MIN = 20;
  const since = new Date(); since.setDate(since.getDate() - windowDays);
  const rows = await prisma.activityEvent.findMany({
    where: { userId, type: "REVISION_REVIEWED", createdAt: { gte: since } },
    select: { value: true },
  });
  if (rows.length < MIN) return { pct: null, reviews: rows.length, need: MIN };
  const good = rows.filter((r) => r.value >= 3).length;
  return { pct: Math.round((good / rows.length) * 100), reviews: rows.length, need: MIN };
}

/** Counts of real actions in the trailing N days, by type. */
export async function computeThisWeek(userId = DEMO_USER_ID, days = 7): Promise<Record<ActivityType, number>> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const grouped = await prisma.activityEvent.groupBy({
    by: ["type"],
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const out = {
    CHAPTER_READ: 0, PYQ_ATTEMPTED: 0, CA_READ: 0, NOTE_CREATED: 0,
    REVISION_REVIEWED: 0, STUDY_SESSION: 0, TEST_ATTEMPTED: 0, ANSWER_WRITTEN: 0,
  } as Record<ActivityType, number>;
  for (const g of grouped) if (g.type in out) out[g.type as ActivityType] = g._count._all;
  return out;
}

/** Minutes studied today, from logged STUDY_SESSION events (value = minutes). */
export async function computeStudyToday(userId = DEMO_USER_ID): Promise<{ minutes: number; sessions: number }> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const rows = await prisma.activityEvent.findMany({
    where: { userId, type: "STUDY_SESSION", createdAt: { gte: start } },
    select: { value: true },
  });
  return { minutes: rows.reduce((n, r) => n + r.value, 0), sessions: rows.length };
}

/** Last `days` of daily study minutes (real), for an honest heatmap/sparkline. */
export async function computeStudyDaily(userId = DEMO_USER_ID, days = 30): Promise<{ date: string; minutes: number }[]> {
  const since = new Date(); since.setDate(since.getDate() - days); since.setHours(0, 0, 0, 0);
  const rows = await prisma.activityEvent.findMany({
    where: { userId, type: "STUDY_SESSION", createdAt: { gte: since } },
    select: { createdAt: true, value: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(dayKey(r.createdAt), (map.get(dayKey(r.createdAt)) ?? 0) + r.value);
  const out: { date: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), minutes: map.get(dayKey(d)) ?? 0 });
  }
  return out;
}
