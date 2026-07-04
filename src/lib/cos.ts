/* ════════════════════════════════════════════════════════════════
   Cognitive Operating System — Phase 3.1: Memory & Forgetting Engine.

   Macro layer only (topics). The SM-2 card engine (micro) is untouched.
   Laws: L1 the ledger is truth (every grade → TOPIC_REVISED event, state
   replayable) · L2 silence over noise · L3 process framing only.
   ════════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";

/** Revision ladder (approved D-1): days until next revision per stage. */
export const LADDER_DAYS = [1, 7, 21, 60, 120] as const; // R1..R5
const DAY = 86400000;

/** Ebbinghaus retention estimate: R = exp(−Δt/S), S = 48h · 2^stage. */
export function retention(lastRevisedAt: Date | null, ladderStage: number, now = new Date()): number {
  if (!lastRevisedAt) return 0;
  const hours = (now.getTime() - lastRevisedAt.getTime()) / 36e5;
  const stability = 48 * Math.pow(2, Math.max(0, ladderStage));
  return Math.exp(-hours / stability);
}

/** Interval (days) scheduled AFTER reaching `stage` successful revisions. */
const intervalFor = (stage: number) => LADDER_DAYS[Math.min(Math.max(stage, 0), LADDER_DAYS.length - 1)];

/** A topic is DECAYED when overdue by more than 2× its pending interval. */
function isDecayed(nextRevisionAt: Date | null, ladderStage: number, now = new Date()): boolean {
  if (!nextRevisionAt) return false;
  return now.getTime() - nextRevisionAt.getTime() > 2 * intervalFor(ladderStage) * DAY;
}

export function statusFor(stage: number, lastGrade: number | null, next: Date | null, last: Date | null, now = new Date()): string {
  if (isDecayed(next, stage, now)) return "DECAYED";
  if (stage >= 5 && retention(last, stage, now) >= 0.8) return "MASTERED";
  if (stage >= 1) return "REVISING";
  return "TOUCHED";
}

/** Start tracking a syllabus node (idempotent). First revision: tomorrow. */
export async function touchTopic(nodeId: string, title: string) {
  const now = new Date();
  return prisma.topicState.upsert({
    where: { userId_nodeId: { userId: DEMO_USER_ID, nodeId } },
    create: {
      userId: DEMO_USER_ID, nodeId, title: title.slice(0, 200),
      status: "TOUCHED", ladderStage: 0,
      lastRevisedAt: now,                      // learned now
      nextRevisionAt: new Date(now.getTime() + LADDER_DAYS[0] * DAY),
    },
    update: {}, // already tracked — leave the ladder alone
  });
}

/**
 * Record a topic revision with a recall self-grade (0–5).
 * Stage counts SUCCESSFUL revisions: after stage s the next gap is
 * LADDER_DAYS[s] (0→1d, 1→7d, 2→21d, 3→60d, 4+→120d).
 * Grade ≥4 advance · 3 repeat the same gap · ≤2 drop a stage — and a
 * failed recall always comes back tomorrow (deliberate deviation from a
 * strict ladder: failure needs immediate re-exposure, not a 7-day wait).
 * Writes the TOPIC_REVISED ledger event in the same transaction (L1).
 */
export async function gradeTopic(ref: { topicId?: string; nodeId?: string }, grade: number) {
  const g = Math.max(0, Math.min(5, Math.round(grade)));
  const t = ref.topicId
    ? await prisma.topicState.findUnique({ where: { id: ref.topicId } })
    : ref.nodeId
      ? await prisma.topicState.findUnique({ where: { userId_nodeId: { userId: DEMO_USER_ID, nodeId: ref.nodeId } } })
      : null;
  if (!t) throw new Error("Topic not tracked");
  const now = new Date();
  const stage = g >= 4 ? Math.min(5, t.ladderStage + 1) : g === 3 ? t.ladderStage : Math.max(0, t.ladderStage - 1);
  const nextDays = g <= 2 ? 1 : intervalFor(stage); // failure → tomorrow, always
  const next = new Date(now.getTime() + nextDays * DAY);
  const [updated] = await prisma.$transaction([
    prisma.topicState.update({
      where: { id: t.id },
      data: {
        ladderStage: stage, lastGrade: g, lastRevisedAt: now, nextRevisionAt: next,
        status: statusFor(stage, g, next, now, now),
      },
    }),
    prisma.activityEvent.create({
      data: { userId: DEMO_USER_ID, type: "TOPIC_REVISED", refId: t.nodeId, subject: t.title.slice(0, 60), value: g },
    }),
  ]);
  return updated;
}

/**
 * Materialize due topic-revisions as REVISE tickets in the active sprint.
 * Lazy + idempotent (safe to call on every read): caps at 6/day, prioritised
 * by (1 − retention) · staleness. Skips topics that already have an open
 * REVISE ticket in the sprint. E9: without an active sprint, /revision
 * still lists due topics directly.
 */
export async function materializeDueRevisions(): Promise<number> {
  const now = new Date();
  const sprint = await prisma.sprint.findFirst({
    where: { userId: DEMO_USER_ID, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { tasks: { select: { nodeId: true, done: true, type: true } } },
  });
  if (!sprint) return 0;

  const due = await prisma.topicState.findMany({
    where: { userId: DEMO_USER_ID, nextRevisionAt: { lte: now } },
  });
  if (due.length === 0) return 0;

  const openNodeIds = new Set(sprint.tasks.filter((t) => t.type === "REVISE" && t.nodeId && !t.done).map((t) => t.nodeId as string));
  // daily cap counts today's already-materialized revision tickets (04:00 boundary)
  const dayStart = new Date(now); dayStart.setHours(4, 0, 0, 0); if (now < dayStart) dayStart.setTime(dayStart.getTime() - DAY);
  const createdToday = await prisma.sprintTask.count({
    where: { sprintId: sprint.id, type: "REVISE", nodeId: { not: null }, createdAt: { gte: dayStart } },
  });
  const budget = Math.max(0, 6 - createdToday);
  if (budget === 0) return 0;

  const candidates = due
    .filter((t) => !openNodeIds.has(t.nodeId))
    .map((t) => ({
      t,
      priority: (1 - retention(t.lastRevisedAt, t.ladderStage, now)) *
        (1 + Math.min(3, (now.getTime() - (t.nextRevisionAt?.getTime() ?? now.getTime())) / (7 * DAY))),
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, budget);

  for (const { t } of candidates) {
    await prisma.sprintTask.create({
      data: {
        sprintId: sprint.id,
        title: `Revise · ${t.title}`,
        type: "REVISE", metric: "manual", target: 1, nodeId: t.nodeId,
      },
    });
  }
  return candidates.length;
}

/** All tracked topics with live retention, for the Memory panel. */
export async function topicOverview() {
  const now = new Date();
  const rows = await prisma.topicState.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { nextRevisionAt: "asc" },
  });
  return rows.map((t) => ({
    id: t.id, nodeId: t.nodeId, title: t.title,
    status: statusFor(t.ladderStage, t.lastGrade, t.nextRevisionAt, t.lastRevisedAt, now),
    ladderStage: t.ladderStage,
    retention: Math.round(retention(t.lastRevisedAt, t.ladderStage, now) * 100),
    lastGrade: t.lastGrade,
    nextRevisionAt: t.nextRevisionAt,
    due: !!t.nextRevisionAt && t.nextRevisionAt <= now,
  }));
}
