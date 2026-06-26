import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { logEvent } from "@/lib/activity";

/**
 * POST /api/ca/read  { affairId }   → marks a current-affairs item read.
 * GET  /api/ca/read                  → { read: [affairId, …] } for the user.
 * Real read-receipts replace the fabricated "14 unread" counter.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const { affairId } = await req.json().catch(() => ({})) as { affairId?: string };
  if (!affairId) return Response.json({ error: "affairId required" }, { status: 400 });

  const affair = await prisma.currentAffair.findUnique({ where: { id: affairId } });
  if (!affair) return Response.json({ error: "not found" }, { status: 404 });

  // Race-safe: createMany + skipDuplicates is atomic and tells us if the row
  // was newly inserted, so concurrent requests can't collide (P2002) and the
  // CA_READ event is logged exactly once.
  const res = await prisma.caRead.createMany({
    data: [{ userId: DEMO_USER_ID, affairId }],
    skipDuplicates: true,
  });
  if (res.count > 0) {
    await logEvent({ type: "CA_READ", refId: affairId, subject: affair.gsMapping[0] ?? affair.category });
  }
  return Response.json({ read: true });
}

export async function GET() {
  await ensureDemoUser();
  const rows = await prisma.caRead.findMany({ where: { userId: DEMO_USER_ID }, select: { affairId: true } });
  return Response.json({ read: rows.map((r) => r.affairId) });
}
