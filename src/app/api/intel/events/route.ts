import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { scoreAffair, tierOf, layerOf, type Layer } from "@/lib/scoring";

/**
 * GET /api/intel/events?layer=global|india|maharashtra|all
 * Returns intelligence events for the active exam, ranked by importanceScore.
 * Existing rows (score 0) are scored on read so nothing needs re-processing.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layer = (searchParams.get("layer") ?? "all") as Layer | "all";

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  const rows = await prisma.currentAffair.findMany({
    where: { examScope: { has: examCode } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  const events = rows.map((r) => {
    // On-read scoring fallback for legacy rows.
    let score = r.importanceScore;
    let evLayer = (r.layer as Layer) ?? layerOf(r.category);
    if (score === 0) {
      const s = scoreAffair({
        gsMapping: r.gsMapping, tags: r.tags, category: r.category,
        source: r.source, priority: r.priority, publishedAt: r.publishedAt,
      });
      score = s.score;
      evLayer = s.layer;
    }
    return {
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
  filtered.sort((a, b) => b.importanceScore - a.importanceScore);

  const counts = {
    all: events.length,
    global: events.filter((e) => e.layer === "global").length,
    india: events.filter((e) => e.layer === "india").length,
    maharashtra: events.filter((e) => e.layer === "maharashtra").length,
  };

  return Response.json({ events: filtered, counts, examCode });
}
