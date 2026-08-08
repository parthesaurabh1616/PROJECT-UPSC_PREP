import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { scanSources, decodeSourceBatch, sourceStats } from "@/lib/ca-sources";

/**
 * CA source folders (the user's coaching/newspaper PDFs in the library).
 *   GET  → scan folders (register new/changed files) + stats + recent docs
 *   POST → decode a batch of pending PDFs (default 3; quota-aware)
 */
export async function GET() {
  const scan = await scanSources().catch(() => ({ found: 0, added: 0, changed: 0 }));
  const stats = await sourceStats();
  const docs = await prisma.sourceDoc.findMany({ orderBy: [{ day: "desc" }], take: 30 });
  return Response.json({ scan, stats, docs });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { limit?: number };
  await scanSources().catch(() => {});
  try {
    const result = await decodeSourceBatch(b.limit ?? 3);
    return Response.json({ ok: true, ...result, stats: await sourceStats() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return Response.json({ error: /quota|429/i.test(msg) ? "AI quota exhausted — resumes on the next run." : msg }, { status: 502 });
  }
}
