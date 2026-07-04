import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

/**
 * COS Daily Check-in (M5 capture). Day boundary 04:00 (approved D-2):
 * anything before 4 AM belongs to the previous logical day.
 *   GET  → today's check-in (or null)
 *   POST → upsert today's values; writes one CHECKIN ledger event per day
 */
function logicalDay(now = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const clamp5 = (v: unknown) => (typeof v === "number" && v >= 1 && v <= 5 ? Math.round(v) : null);

export async function GET() {
  const day = logicalDay();
  const row = await prisma.dailyCheckin.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day } } });
  return Response.json({ checkin: row, day });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return Response.json({ error: "Bad request" }, { status: 400 });
  const day = logicalDay();
  const data = {
    sleepHrs: typeof b.sleepHrs === "number" && b.sleepHrs >= 0 && b.sleepHrs <= 16 ? Math.round(b.sleepHrs * 2) / 2 : null,
    energy: clamp5(b.energy), mood: clamp5(b.mood), stress: clamp5(b.stress),
    focus: clamp5(b.focus), confidence: clamp5(b.confidence), distraction: clamp5(b.distraction),
    note: typeof b.note === "string" ? b.note.slice(0, 500) : null,
  };
  const existing = await prisma.dailyCheckin.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day } } });
  const row = await prisma.dailyCheckin.upsert({
    where: { userId_day: { userId: DEMO_USER_ID, day } },
    create: { userId: DEMO_USER_ID, day, ...data },
    update: data,
  });
  if (!existing) {
    await prisma.activityEvent.create({ data: { userId: DEMO_USER_ID, type: "CHECKIN", value: data.energy ?? 0 } }).catch(() => {});
  }
  return Response.json({ ok: true, checkin: row });
}
