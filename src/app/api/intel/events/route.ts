import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { scoreAffair, liveRank, tierOf, layerOf, type Layer } from "@/lib/scoring";

/**
 * GET /api/intel/events?layer=global|india|maharashtra|all
 * Live intelligence feed for the active exam. Ranked by a recency-aware
 * live score computed ON READ (importance × steep time-decay), so fresh
 * events surface and week-old items sink — nothing is frozen at ingest.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layer = (searchParams.get("layer") ?? "all") as Layer | "all";

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  // Only the last 30 days count as "live"; older items live in the archive.
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.currentAffair.findMany({
    where: { examScope: { has: examCode }, publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  const events = rows.map((r) => {
    const input = { gsMapping: r.gsMapping, tags: r.tags, category: r.category, source: r.source, priority: r.priority, publishedAt: r.publishedAt };
    // Computed on read: live recency-aware score (shown) + rank (for sorting),
    // so a 10-day-old item no longer carries a frozen-high score.
    const score = scoreAffair(input).score;
    const rank = liveRank(input);
    const evLayer = (r.layer as Layer) ?? layerOf(r.category);
    return {
      _rank: rank,
      id: r.id,
      headline: r.headline,
      whyInNews: r.whyInNews,
      summary: r.summary,
      background: r.background,
      keyFacts: r.keyFacts,
      prelims: r.prelims,
      mains: r.mains,
      interview: r.interview,
      gsMapping: r.gsMapping,
      tags: r.tags,
      source: r.source,
      sourceUrl: r.sourceUrl,
      category: r.category,
      lang: r.lang,
      publishedAt: r.publishedAt,
      importanceScore: score,
      tier: tierOf(score),
      layer: evLayer,
    };
  });

  const filtered = layer === "all" ? events : events.filter((e) => e.layer === layer);
  // Recency-dominant ranking — newest relevant events first.
  filtered.sort((a, b) => b._rank - a._rank);

  const counts = {
    all: events.length,
    global: events.filter((e) => e.layer === "global").length,
    india: events.filter((e) => e.layer === "india").length,
    maharashtra: events.filter((e) => e.layer === "maharashtra").length,
  };

  // Strip the internal rank from the payload.
  const payload = filtered.map(({ _rank, ...e }) => { void _rank; return e; });
  return Response.json({ events: payload, counts, examCode });
}
