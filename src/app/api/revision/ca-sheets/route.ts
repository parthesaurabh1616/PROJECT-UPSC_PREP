import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { ensureSheets } from "@/lib/ca-sheets";

/**
 * Daily CA Revision Sheets.
 *   GET  → ensures sheets are current (lazy, deterministic, quota-free),
 *          then returns the archive newest-first (full content included —
 *          sheets are compact by construction).
 *   POST → force a refresh pass.
 */
export async function GET() {
  await ensureSheets().catch(() => {});
  const sheets = await prisma.caDailySheet.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { day: "desc" },
    take: 90,
  });
  return Response.json({ sheets });
}

export async function POST(_req: NextRequest) {
  const touched = await ensureSheets();
  return Response.json({ ok: true, touched });
}
