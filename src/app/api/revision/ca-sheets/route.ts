import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { ensureSheets, type SheetContent, type SheetItem } from "@/lib/ca-sheets";

/**
 * Daily CA Revision Sheets — calendar-first, scale-proof API.
 *   GET                 → available months + latest sheet day (ensures sheets first)
 *   GET ?month=YYYY-MM  → light per-day index for the calendar grid
 *                         + the month digest (top items by revision priority)
 *   GET ?day=YYYY-MM-DD → ONE day's full sheet (content loads per selection —
 *                         never the whole archive at once)
 *   POST                → force refresh pass
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const day = url.searchParams.get("day");

  if (url.searchParams.get("concepts")) {
    const { conceptClusters } = await import("@/lib/ca-quiz");
    return Response.json({ clusters: await conceptClusters() });
  }

  if (day) {
    const d = new Date(`${day}T00:00:00`);
    if (isNaN(d.getTime())) return Response.json({ error: "bad day" }, { status: 400 });
    const sheet = await prisma.caDailySheet.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day: d } } });
    return Response.json({ sheet });
  }

  if (month) {
    const m = new Date(`${month}-01T00:00:00`);
    if (isNaN(m.getTime())) return Response.json({ error: "bad month" }, { status: 400 });
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const sheets = await prisma.caDailySheet.findMany({
      where: { userId: DEMO_USER_ID, day: { gte: m, lt: next } },
      orderBy: { day: "asc" },
    });
    const days = sheets.map((s) => {
      const c = s.content as unknown as SheetContent;
      return { day: s.day, itemCount: s.itemCount, skipped: c.skipped?.count ?? 0, pending: c.pendingJudgement ?? 0 };
    });
    // Month digest: every item of the month, ranked by the Board's revision priority
    const all: SheetItem[] = sheets.flatMap((s) => (s.content as unknown as SheetContent).items ?? []);
    const top = all.sort((a, b) => b.scores.revision - a.scores.revision).slice(0, 20);
    return Response.json({ days, top, monthItems: all.length });
  }

  // index: ensure current, then list months + latest day
  await ensureSheets().catch(() => {});
  const rows = await prisma.caDailySheet.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { day: "desc" },
    select: { day: true },
  });
  // local-date months (toISOString would misfile IST days into the previous UTC month)
  const months = [...new Set(rows.map((r) => `${r.day.getFullYear()}-${String(r.day.getMonth() + 1).padStart(2, "0")}`))];
  return Response.json({ months, latestDay: rows[0]?.day ?? null, totalSheets: rows.length });
}

export async function POST() {
  const touched = await ensureSheets();
  return Response.json({ ok: true, touched });
}
