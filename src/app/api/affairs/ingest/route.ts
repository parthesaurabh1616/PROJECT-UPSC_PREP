import { prisma } from "@/lib/db";
import { processAffair } from "@/lib/ai";
import { XMLParser } from "fast-xml-parser";

const RSS_FEEDS = [
  { url: "https://feeds.feedburner.com/ndtvnews-india-news", source: "NDTV" },
  { url: "https://timesofindia.indiatimes.com/rss/topstories", source: "Times of India" },
  { url: "https://www.thehindu.com/news/national/feeder/default.rss", source: "The Hindu" },
];

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate?: string;
}

async function fetchRSS(url: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "UPSC-PREP-OS/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items: RSSItem[] = parsed?.rss?.channel?.item ?? [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return [];
  }
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not set. Add it to .env to enable AI processing." },
      { status: 400 },
    );
  }

  let ingested = 0;
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    const items = await fetchRSS(feed.url);

    for (const item of items.slice(0, 5)) {
      const headline = String(item.title ?? "").replace(/<[^>]+>/g, "").trim();
      const summary = String(item.description ?? "").replace(/<[^>]+>/g, "").trim();
      if (!headline) continue;

      // Skip if already ingested
      const exists = await prisma.currentAffair.findFirst({
        where: { headline },
      });
      if (exists) continue;

      try {
        const processed = await processAffair(headline, summary);
        await prisma.currentAffair.create({
          data: {
            headline,
            summary,
            whyInNews: processed.whyInNews,
            background: processed.background,
            keyFacts: processed.keyFacts,
            prelims: processed.prelims,
            mains: processed.mains,
            interview: processed.interview,
            gsMapping: processed.gsMapping,
            tags: processed.tags,
            priority: processed.priority,
            source: feed.source,
            sourceUrl: String(item.link ?? ""),
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          },
        });
        ingested++;
      } catch (e) {
        errors.push(String(e));
      }
    }
  }

  return Response.json({ ingested, errors });
}
