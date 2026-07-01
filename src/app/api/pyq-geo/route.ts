import { prisma } from "@/lib/db";
import { matchCountries, countryCoord } from "@/lib/geo";

/**
 * GET /api/pyq-geo — how often each country appears in the decoded PYQ
 * corpus. Real counts: every question's text is matched (by name / demonym
 * / capital) to the countries it mentions; ambiguous text matches nothing.
 * Cached in-process for 5 min since the corpus changes only on re-decode.
 */
let cache: { at: number; data: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return Response.json(cache.data);

  const qs = await prisma.pyqQuestion.findMany({ select: { text: true } });
  const counts = new Map<string, number>();
  for (const q of qs) for (const c of matchCountries(q.text)) counts.set(c, (counts.get(c) ?? 0) + 1);

  const pins = [...counts.entries()]
    .map(([name, count]) => { const co = countryCoord(name); return co ? { name, count, lat: co.lat, lng: co.lng } : null; })
    .filter((p): p is { name: string; count: number; lat: number; lng: number } => p !== null)
    .sort((a, b) => b.count - a.count);

  const data = { pins, total: qs.length, max: pins[0]?.count ?? 0 };
  cache = { at: Date.now(), data };
  return Response.json(data);
}
