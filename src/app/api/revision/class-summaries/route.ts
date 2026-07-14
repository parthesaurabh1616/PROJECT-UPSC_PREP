import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { touchTopic } from "@/lib/cos";

/**
 * Class summaries — "what I learned in class today", one card per class.
 *   GET                 → all summaries, newest day first (?subject= filter)
 *   POST                → create; a syllabus nodeId auto-tracks the topic on
 *                         the 1/7/21/60/120 ladder so the summary resurfaces
 *   PATCH               → edit { id, topic?, body?, anchors?, subject?, day? }
 *   DELETE ?id=         → remove
 */
export async function GET(req: NextRequest) {
  await ensureDemoUser();
  const subject = new URL(req.url).searchParams.get("subject");
  const rows = await prisma.classSummary.findMany({
    where: { userId: DEMO_USER_ID, ...(subject ? { subject } : {}) },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
  });
  return Response.json(rows);
}

interface Body { id?: string; day?: string; subject?: string; nodeId?: string | null; topic?: string; body?: string; anchors?: string[] }

export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const b = await req.json().catch(() => null) as Body | null;
  if (!b?.subject?.trim() || !b?.topic?.trim() || !b?.body?.trim()) {
    return Response.json({ error: "Subject, topic and the summary itself are all required." }, { status: 400 });
  }
  const day = b.day ? new Date(`${b.day}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  if (isNaN(day.getTime())) return Response.json({ error: "Bad day" }, { status: 400 });

  const row = await prisma.classSummary.create({
    data: {
      userId: DEMO_USER_ID,
      day,
      subject: b.subject.trim().slice(0, 80),
      nodeId: b.nodeId || null,
      topic: b.topic.trim().slice(0, 200),
      body: b.body.trim().slice(0, 20000),
      anchors: (b.anchors ?? []).map((a) => String(a).trim()).filter(Boolean).slice(0, 20),
    },
  });

  // start (or refresh) the topic on the revision ladder — this is what
  // turns "saved day by day" into "resurfaces at 1/7/21/60/120 days"
  let ladder: string | null = null;
  if (row.nodeId) {
    try {
      const t = await touchTopic(row.nodeId, row.topic);
      ladder = t.nextRevisionAt ? new Date(t.nextRevisionAt).toISOString() : null;
    } catch { /* ladder is best-effort; the summary itself is saved */ }
  }
  return Response.json({ ...row, nextRevisionAt: ladder });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null) as Body | null;
  if (!b?.id) return Response.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (b.topic?.trim()) data.topic = b.topic.trim().slice(0, 200);
  if (b.body?.trim()) data.body = b.body.trim().slice(0, 20000);
  if (b.subject?.trim()) data.subject = b.subject.trim().slice(0, 80);
  if (Array.isArray(b.anchors)) data.anchors = b.anchors.map((a) => String(a).trim()).filter(Boolean).slice(0, 20);
  if (b.nodeId !== undefined) data.nodeId = b.nodeId || null;
  if (b.day) {
    const d = new Date(`${b.day}T00:00:00`);
    if (!isNaN(d.getTime())) data.day = d;
  }
  if (Object.keys(data).length === 0) return Response.json({ error: "nothing to update" }, { status: 400 });
  const rows = await prisma.classSummary.updateMany({ where: { id: b.id, userId: DEMO_USER_ID }, data });
  return Response.json({ ok: rows.count > 0 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await prisma.classSummary.deleteMany({ where: { id, userId: DEMO_USER_ID } });
  return Response.json({ ok: true });
}
