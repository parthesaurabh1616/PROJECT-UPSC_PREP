import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { logEvent } from "@/lib/activity";

/**
 * POST /api/study/session  { minutes, subject? }
 * Persists a completed deep-work session → StudySession table AND
 * the ledger (value = minutes). This is the ONLY source of study
 * hours; without a real timer, the dashboard shows none.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const { minutes, subject } = await req.json().catch(() => ({})) as { minutes?: number; subject?: string };
  const mins = Math.round(Number(minutes));
  if (!mins || mins < 1 || mins > 600) return Response.json({ error: "minutes must be 1–600" }, { status: 400 });

  const session = await prisma.studySession.create({
    data: { userId: DEMO_USER_ID, duration: mins, subject: subject ?? null },
  });
  await logEvent({ type: "STUDY_SESSION", refId: session.id, subject: subject ?? null, value: mins });

  return Response.json({ ok: true, minutes: mins });
}
