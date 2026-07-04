import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { generateArtifact, kitOverview, ARTIFACT_KINDS, type ArtifactKind } from "@/lib/cos-artifacts";

/**
 * COS M6/M7 — artifacts.
 *   GET              → kit overview (topic × kind states)
 *   GET ?nodeId=…    → that node's artifacts (full content)
 *   POST {nodeId,kind} → generate now (honest cache by grounding hash)
 */
export async function GET(req: NextRequest) {
  const nodeId = new URL(req.url).searchParams.get("nodeId");
  if (nodeId) {
    const artifacts = await prisma.topicArtifact.findMany({ where: { userId: DEMO_USER_ID, nodeId } });
    return Response.json({ artifacts });
  }
  return Response.json({ topics: await kitOverview() });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as { nodeId?: string; kind?: string } | null;
  if (!b?.nodeId || !ARTIFACT_KINDS.includes(b.kind as ArtifactKind)) {
    return Response.json({ error: "nodeId and a valid kind required" }, { status: 400 });
  }
  try {
    const { artifact, cached } = await generateArtifact(b.nodeId, b.kind as ArtifactKind);
    // viewing/generating is a real ledger event (feeds LQS component later)
    await prisma.activityEvent.create({ data: { userId: DEMO_USER_ID, type: "ARTIFACT_VIEWED", refId: b.nodeId, subject: b.kind } }).catch(() => {});
    return Response.json({ ok: true, cached, artifact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generation failed";
    const friendly = /quota|429|exhaust/i.test(msg) ? "AI quota exhausted for now — it regenerates tonight or after the daily reset." : msg;
    return Response.json({ error: friendly }, { status: 502 });
  }
}
