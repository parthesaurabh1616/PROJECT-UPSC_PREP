import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

/**
 * Sprint Board API — the Agile program OS.
 * Metric-bound tasks NEVER store progress; it is computed on read from the
 * activity ledger for the sprint window, so the board can't lie.
 *
 *   GET    → active sprint (live progress + velocity + daily focus) + history
 *   POST   → plan a sprint { goal, days?, tasks: [{ title, metric, target }] }
 *   PATCH  → { taskId, done } | { taskId, remove } | { sprintId, retro } |
 *            { sprintId, addTask: { title, metric, target } }
 */

const METRICS: Record<string, { type: string; sum?: boolean; label: string }> = {
  answers:  { type: "ANSWER_WRITTEN",    label: "answers written" },
  pyq:      { type: "PYQ_ATTEMPTED",     label: "PYQs attempted" },
  ncert:    { type: "CHAPTER_READ",      label: "chapters completed" },
  ca:       { type: "CA_READ",           label: "affairs read" },
  revision: { type: "REVISION_REVIEWED", label: "cards reviewed" },
  tests:    { type: "TEST_ATTEMPTED",    label: "tests taken" },
  notes:    { type: "NOTE_CREATED",      label: "notes created" },
  focus:    { type: "STUDY_SESSION", sum: true, label: "focus minutes" },
};
export type MetricKey = keyof typeof METRICS | "manual";

async function metricProgress(metric: string, from: Date, to: Date): Promise<number> {
  const m = METRICS[metric];
  if (!m) return 0;
  if (m.sum) {
    const r = await prisma.activityEvent.aggregate({
      where: { userId: DEMO_USER_ID, type: m.type, createdAt: { gte: from, lte: to } },
      _sum: { value: true },
    });
    return r._sum.value ?? 0;
  }
  return prisma.activityEvent.count({
    where: { userId: DEMO_USER_ID, type: m.type, createdAt: { gte: from, lte: to } },
  });
}

async function withProgress(sprint: { id: string; startsAt: Date; endsAt: Date; tasks: { id: string; title: string; metric: string; target: number; done: boolean }[] }) {
  const tasks = await Promise.all(
    sprint.tasks.map(async (t) => {
      const progress = t.metric === "manual" ? (t.done ? 1 : 0) : await metricProgress(t.metric, sprint.startsAt, sprint.endsAt);
      const target = t.metric === "manual" ? 1 : Math.max(1, t.target);
      return { ...t, progress, target, complete: progress >= target, metricLabel: METRICS[t.metric]?.label ?? null };
    })
  );
  return tasks;
}

export async function GET() {
  const now = new Date();
  const sprints = await prisma.sprint.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { startsAt: "desc" },
    include: { tasks: { orderBy: { createdAt: "asc" } } },
    take: 8,
  });

  const active = sprints.find((s) => s.startsAt <= now && s.endsAt >= now) ?? null;

  let current = null;
  if (active) {
    const tasks = await withProgress(active);
    // velocity: real ledger numbers for the sprint window
    const [focusAgg, byType] = await Promise.all([
      prisma.activityEvent.aggregate({
        where: { userId: DEMO_USER_ID, type: "STUDY_SESSION", createdAt: { gte: active.startsAt, lte: active.endsAt } },
        _sum: { value: true },
      }),
      prisma.activityEvent.groupBy({
        by: ["type"],
        where: { userId: DEMO_USER_ID, createdAt: { gte: active.startsAt, lte: active.endsAt } },
        _count: { _all: true },
      }),
    ]);
    // daily focus minutes across the sprint (for the burndown strip)
    const events = await prisma.activityEvent.findMany({
      where: { userId: DEMO_USER_ID, type: "STUDY_SESSION", createdAt: { gte: active.startsAt, lte: active.endsAt } },
      select: { value: true, createdAt: true },
    });
    const dayMs = 86400000;
    const days = Math.max(1, Math.ceil((active.endsAt.getTime() - active.startsAt.getTime()) / dayMs));
    const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, minutes: 0 }));
    for (const e of events) {
      const idx = Math.min(days - 1, Math.floor((e.createdAt.getTime() - active.startsAt.getTime()) / dayMs));
      daily[idx].minutes += e.value;
    }
    const completed = tasks.filter((t) => t.complete).length;
    current = {
      id: active.id, goal: active.goal, retro: active.retro,
      startsAt: active.startsAt, endsAt: active.endsAt,
      dayOfSprint: Math.min(days, Math.floor((now.getTime() - active.startsAt.getTime()) / dayMs) + 1),
      days, tasks, completed, total: tasks.length,
      velocity: {
        focusMinutes: focusAgg._sum.value ?? 0,
        events: Object.fromEntries(byType.map((b) => [b.type, b._count._all])),
        daily,
      },
    };
  }

  const history = await Promise.all(
    sprints.filter((s) => s.id !== active?.id).slice(0, 5).map(async (s) => {
      const tasks = await withProgress(s);
      const focus = await prisma.activityEvent.aggregate({
        where: { userId: DEMO_USER_ID, type: "STUDY_SESSION", createdAt: { gte: s.startsAt, lte: s.endsAt } },
        _sum: { value: true },
      });
      return {
        id: s.id, goal: s.goal, retro: s.retro, startsAt: s.startsAt, endsAt: s.endsAt,
        completed: tasks.filter((t) => t.complete).length, total: tasks.length,
        focusMinutes: focus._sum.value ?? 0,
      };
    })
  );

  return Response.json({ current, history, metricKeys: [...Object.keys(METRICS), "manual"] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { goal?: string; days?: number; tasks?: { title?: string; metric?: string; target?: number }[] } | null;
  if (!body?.goal?.trim()) return Response.json({ error: "A sprint needs a goal." }, { status: 400 });
  const tasks = (body.tasks ?? []).filter((t) => t.title?.trim());
  if (tasks.length === 0) return Response.json({ error: "Add at least one task." }, { status: 400 });

  const now = new Date();
  const clash = await prisma.sprint.findFirst({ where: { userId: DEMO_USER_ID, startsAt: { lte: now }, endsAt: { gte: now } } });
  if (clash) return Response.json({ error: "A sprint is already running — finish or let it end first." }, { status: 409 });

  const startsAt = new Date(now); startsAt.setHours(0, 0, 0, 0);
  const days = Math.min(14, Math.max(3, body.days ?? 7));
  const endsAt = new Date(startsAt.getTime() + days * 86400000 - 1);

  const sprint = await prisma.sprint.create({
    data: {
      userId: DEMO_USER_ID, goal: body.goal.trim(), startsAt, endsAt,
      tasks: {
        create: tasks.map((t) => ({
          title: t.title!.trim().slice(0, 200),
          metric: t.metric && (t.metric in METRICS || t.metric === "manual") ? t.metric : "manual",
          target: Math.min(10000, Math.max(1, t.target ?? 1)),
        })),
      },
    },
  });
  return Response.json({ ok: true, id: sprint.id });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    taskId?: string; done?: boolean; remove?: boolean;
    sprintId?: string; retro?: string; addTask?: { title?: string; metric?: string; target?: number };
  } | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });

  if (body.taskId && body.remove) {
    await prisma.sprintTask.delete({ where: { id: body.taskId } });
    return Response.json({ ok: true });
  }
  if (body.taskId && typeof body.done === "boolean") {
    await prisma.sprintTask.update({ where: { id: body.taskId }, data: { done: body.done } });
    return Response.json({ ok: true });
  }
  if (body.sprintId && typeof body.retro === "string") {
    await prisma.sprint.update({ where: { id: body.sprintId }, data: { retro: body.retro.slice(0, 4000) } });
    return Response.json({ ok: true });
  }
  if (body.sprintId && body.addTask?.title?.trim()) {
    await prisma.sprintTask.create({
      data: {
        sprintId: body.sprintId,
        title: body.addTask.title.trim().slice(0, 200),
        metric: body.addTask.metric && (body.addTask.metric in METRICS || body.addTask.metric === "manual") ? body.addTask.metric : "manual",
        target: Math.min(10000, Math.max(1, body.addTask.target ?? 1)),
      },
    });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Nothing to do" }, { status: 400 });
}
