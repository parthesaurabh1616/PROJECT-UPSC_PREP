import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

/**
 * COS M4 — Decision Journal. Append-only in spirit: decisions are never
 * deleted; they get REVIEWED (with a note) or SUPERSEDED by a new record.
 *   GET   → all records, newest first
 *   POST  → create { title, decision, reason, evidence?, alternatives?, expectedOutcome?, reviewAt? }
 *   PATCH → { id, status: REVIEWED|SUPERSEDED, reviewNote? }
 */
export async function GET() {
  const records = await prisma.decisionRecord.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { decidedAt: "desc" },
  });
  return Response.json({ records });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as Record<string, string | undefined> | null;
  if (!b?.title?.trim() || !b?.decision?.trim() || !b?.reason?.trim()) {
    return Response.json({ error: "title, decision and reason are required" }, { status: 400 });
  }
  const rec = await prisma.decisionRecord.create({
    data: {
      userId: DEMO_USER_ID,
      decidedAt: new Date(),
      title: b.title.trim().slice(0, 160),
      decision: b.decision.trim().slice(0, 2000),
      reason: b.reason.trim().slice(0, 2000),
      evidence: b.evidence?.trim().slice(0, 2000) || null,
      alternatives: b.alternatives?.trim().slice(0, 2000) || null,
      expectedOutcome: b.expectedOutcome?.trim().slice(0, 2000) || null,
      reviewAt: b.reviewAt ? new Date(b.reviewAt) : null,
    },
  });
  return Response.json({ ok: true, id: rec.id });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null) as { id?: string; status?: string; reviewNote?: string } | null;
  if (!b?.id || !["REVIEWED", "SUPERSEDED", "ACTIVE"].includes(b.status ?? "")) {
    return Response.json({ error: "id and a valid status required" }, { status: 400 });
  }
  await prisma.decisionRecord.update({
    where: { id: b.id },
    data: { status: b.status, reviewNote: b.reviewNote?.slice(0, 2000) ?? undefined },
  });
  return Response.json({ ok: true });
}
