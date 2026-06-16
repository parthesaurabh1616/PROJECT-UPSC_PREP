import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { scoreAffair } from "@/lib/scoring";
import { generateBriefing, type Briefing } from "@/lib/ai";

// In-memory cache: one briefing per exam per day (cheap, avoids re-calling AI on every load).
const cache = new Map<string, { at: number; briefing: Briefing }>();
const TTL = 3 * 60 * 60 * 1000; // 3h

/**
 * GET /api/intel/briefing  → AI "today's N that matter" for the active exam.
 * POST (or ?force=1)       → bypass cache and regenerate.
 */
async function build(examCode: string): Promise<Briefing> {
  const rows = await prisma.currentAffair.findMany({
    where: { examScope: { has: examCode } },
    orderBy: { publishedAt: "desc" },
    take: 120,
  });

  const scored = rows.map((r) => {
    const score = r.importanceScore || scoreAffair({
      gsMapping: r.gsMapping, tags: r.tags, category: r.category,
      source: r.source, priority: r.priority, publishedAt: r.publishedAt,
    }).score;
    return { headline: r.headline, whyInNews: r.whyInNews, gsMapping: r.gsMapping, score };
  });
  scored.sort((a, b) => b.score - a.score);

  return generateBriefing(scored.slice(0, 10), examCode);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";
  const key = `${examCode}:${new Date().toISOString().slice(0, 10)}`;

  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL) {
    return Response.json({ ...hit.briefing, examCode, cached: true });
  }

  const briefing = await build(examCode);
  cache.set(key, { at: Date.now(), briefing });
  return Response.json({ ...briefing, examCode, cached: false });
}

export async function POST() {
  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";
  const key = `${examCode}:${new Date().toISOString().slice(0, 10)}`;
  const briefing = await build(examCode);
  cache.set(key, { at: Date.now(), briefing });
  return Response.json({ ...briefing, examCode, cached: false });
}
