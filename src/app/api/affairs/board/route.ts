import { NextRequest } from "next/server";
import { boardBatch, boardEvaluate, boardStats } from "@/lib/upsc-board";

/**
 * UPSC Examination Board API.
 *   GET                → judging stats
 *   POST {}            → judge next batch of pending affairs (default 8)
 *   POST {affairId}    → judge one affair now (returns full verdict)
 */
export async function GET() {
  return Response.json(await boardStats());
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { affairId?: string; limit?: number };
  try {
    if (b.affairId) {
      const verdict = await boardEvaluate(b.affairId);
      return Response.json({ ok: true, verdict });
    }
    const result = await boardBatch(b.limit ?? 8);
    return Response.json({ ok: true, ...result, stats: await boardStats() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const friendly = /quota|429|exhaust/i.test(msg) ? "AI quota exhausted — the Board resumes after the daily reset (or tonight's run)." : msg;
    return Response.json({ error: friendly }, { status: 502 });
  }
}
