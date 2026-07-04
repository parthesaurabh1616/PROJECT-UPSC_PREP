import { NextRequest } from "next/server";
import { touchTopic, gradeTopic, materializeDueRevisions, topicOverview } from "@/lib/cos";

/**
 * COS Memory Engine API (Phase 3.1).
 *   GET   → tracked topics with live retention (+ lazily materializes
 *           due revisions into the active sprint — idempotent, capped)
 *   POST  → { nodeId, title } start tracking a syllabus topic
 *   PATCH → { topicId, grade 0..5 } record a topic revision
 */
export async function GET() {
  const materialized = await materializeDueRevisions().catch(() => 0);
  const topics = await topicOverview();
  return Response.json({ topics, materialized });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { nodeId?: string; title?: string } | null;
  if (!body?.nodeId || !body?.title?.trim()) return Response.json({ error: "nodeId and title required" }, { status: 400 });
  const t = await touchTopic(body.nodeId, body.title.trim());
  return Response.json({ ok: true, id: t.id, nextRevisionAt: t.nextRevisionAt });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as { topicId?: string; nodeId?: string; grade?: number } | null;
  if ((!body?.topicId && !body?.nodeId) || typeof body?.grade !== "number") return Response.json({ error: "topicId|nodeId and grade required" }, { status: 400 });
  try {
    const t = await gradeTopic({ topicId: body.topicId, nodeId: body.nodeId }, body.grade);
    return Response.json({ ok: true, ladderStage: t.ladderStage, nextRevisionAt: t.nextRevisionAt, status: t.status });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
