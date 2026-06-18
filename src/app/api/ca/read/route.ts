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

  const existing = await prisma.caRead.findUnique({
    where: { userId_affairId: { userId: DEMO_USER_ID, affairId } },
  });
  if (!existing) {
    await prisma.caRead.create({ data: { userId: DEMO_USER_ID, affairId } });
    await logEvent({ type: "CA_READ", refId: affairId, subject: affair.gsMapping[0] ?? affair.category });
  }
  return Response.json({ read: true });
}

export async function GET() {
  await ensureDemoUser();
  const rows = await prisma.caRead.findMany({ where: { userId: DEMO_USER_ID }, select: { affairId: true } });
  return Response.json({ read: rows.map((r) => r.affairId) });
}
