import { prisma } from "@/lib/db";
import { matchCountries, countryCoord } from "@/lib/geo";

/**
 * GET /api/pyq-geo — how often each country appears in the decoded PYQ
 * corpus, broken down by exam stage (prelims / mains). Real counts: every
 * question's text is matched (by name / demonym / capital) to the countries
 * it mentions; ambiguous text matches nothing. Cached 5 min in-process.
 */
type Agg = { name: string; lat: number; lng: number; all: number; prelims: number; mains: number };
let cache: { at: number; data: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return Response.json(cache.data);

  const qs = await prisma.pyqQuestion.findMany({ select: { text: true, paper: { select: { stage: true } } } });
  const agg = new Map<string, Agg>();
  const totals = { all: qs.length, prelims: 0, mains: 0 };

  for (const q of qs) {
    const stage = q.paper?.stage;
    if (stage === "prelims") totals.prelims++;
    else if (stage === "mains") totals.mains++;
    for (const name of matchCountries(q.text)) {
      let a = agg.get(name);
      if (!a) {
        const co = countryCoord(name);
        if (!co) continue;
        a = { name, lat: co.lat, lng: co.lng, all: 0, prelims: 0, mains: 0 };
        agg.set(name, a);
      }
      a.all++;
      if (stage === "prelims") a.prelims++;
      else if (stage === "mains") a.mains++;
    }
  }

  const pins = [...agg.values()].sort((a, b) => b.all - a.all);
  const data = { pins, totals };
  cache = { at: Date.now(), data };
  return Response.json(data);
}
