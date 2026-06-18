import { prisma } from "@/lib/db";
import { processAffair } from "@/lib/ai";
import { indexContent } from "@/lib/embeddings";
import { scoreAffair } from "@/lib/scoring";
import { FEEDS, type Feed, type FeedCategory } from "@/lib/feeds";
import { XMLParser } from "fast-xml-parser";

export const maxDuration = 60; // Vercel: allow up to 60s for AI processing

interface RawItem {
  headline: string;
  summary: string;
  link: string;
  source: string;
  category: FeedCategory;
  examScope: string[];
  lang: "en" | "mr";
  publishedAt: Date;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** Strip HTML tags + decode the handful of entities Google News emits */
function clean(s: string): string {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google News titles are "Headline - Publisher". Split off the publisher. */
function splitGNewsTitle(title: string): { headline: string; publisher?: string } {
  const idx = title.lastIndexOf(" - ");
  if (idx > 20) {
    return { headline: title.slice(0, idx).trim(), publisher: title.slice(idx + 3).trim() };
  }
  return { headline: title };
}

async function fetchFeed(feed: Feed): Promise<RawItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    let items = parsed?.rss?.channel?.item ?? [];
    if (!Array.isArray(items)) items = [items];

    return items.slice(0, feed.take).map((item: Record<string, unknown>): RawItem | null => {
      const rawTitle = clean(String(item.title ?? ""));
      if (!rawTitle) return null;

      const { headline, publisher } = feed.kind === "gnews"
        ? splitGNewsTitle(rawTitle)
        : { headline: rawTitle, publisher: undefined };

      // Google News puts the real publisher in <source>
      const srcTag = item.source as { "#text"?: string } | string | undefined;
      const gnewsSource = typeof srcTag === "object" ? srcTag?.["#text"] : (typeof srcTag === "string" ? srcTag : undefined);

      const summary = clean(String(item.description ?? ""));
      const link = String(item.link ?? "");
      const pub = item.pubDate ? new Date(String(item.pubDate)) : new Date();

      return {
        headline,
        summary: summary || headline,
        link,
        source: gnewsSource || publisher || feed.name,
        category: feed.category,
        examScope: feed.examScope,
        lang: feed.lang,
        publishedAt: isNaN(pub.getTime()) ? new Date() : pub,
      };
    }).filter((x: RawItem | null): x is RawItem => x !== null);
  } catch {
    return [];
  }
}

/** Run async tasks with bounded concurrency (protects Gemini free-tier RPM). */
async function pooled<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(runners);
}

export async function POST() {
  if (!process.env.GOOGLE_API_KEY) {
    return Response.json(
      { error: "GOOGLE_API_KEY not set. Add your Gemini API key to .env." },
      { status: 400 },
    );
  }

  // 0. DB reachability check — gives a clear message instead of a silent 500
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return Response.json(
      { error: "Database is not reachable. Start Docker (run start.bat or `npm run infra:up`)." },
      { status: 503 },
    );
  }

  // 1. Fetch all feeds in parallel
  const feedResults = await Promise.allSettled(FEEDS.map(fetchFeed));
  const allItems: RawItem[] = feedResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  if (allItems.length === 0) {
    return Response.json(
      { error: "No articles fetched — check your internet connection.", ingested: 0 },
      { status: 502 },
    );
  }

  // 2. Dedupe within this batch by headline
  const seen = new Set<string>();
  const unique = allItems.filter((it) => {
    const key = it.headline.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. Filter out headlines already in the DB
  const existing = await prisma.currentAffair.findMany({
    where: { headline: { in: unique.map((u) => u.headline) } },
    select: { headline: true },
  });
  const existingSet = new Set(existing.map((e) => e.headline));
  const fresh = unique.filter((u) => !existingSet.has(u.headline));

  // 4. Interleave across categories (round-robin) so each sync pulls a
  //    diverse spread — PIB, editorial, news, economy, world — rather than
  //    exhausting the per-run cap on whichever feed came first.
  const byCat = new Map<FeedCategory, RawItem[]>();
  for (const it of fresh) {
    const arr = byCat.get(it.category) ?? [];
    arr.push(it);
    byCat.set(it.category, arr);
  }
  const interleaved: RawItem[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const arr of byCat.values()) {
      const next = arr.shift();
      if (next) { interleaved.push(next); added = true; }
    }
  }

  // Cap per-run so a single sync stays within Gemini free-tier RPM (15/min)
  const batch = interleaved.slice(0, 14);

  // 5. AI-process with bounded concurrency, then store
  let ingested = 0;
  const errors: string[] = [];

  await pooled(batch, 3, async (item) => {
    try {
      const processed = await processAffair(item.headline, item.summary);
      const { score, layer } = scoreAffair({
        gsMapping: processed.gsMapping,
        tags: processed.tags,
        category: item.category,
        source: item.source,
        priority: processed.priority,
        publishedAt: item.publishedAt,
      });
      const created = await prisma.currentAffair.create({
        data: {
          headline: item.headline,
          summary: item.summary,
          whyInNews: processed.whyInNews,
          background: processed.background,
          keyFacts: processed.keyFacts,
          prelims: processed.prelims,
          mains: processed.mains,
          interview: processed.interview,
          gsMapping: processed.gsMapping,
          tags: processed.tags,
          priority: processed.priority,
          importanceScore: score,
          layer,
          source: item.source,
          sourceUrl: item.link,
          category: item.category,
          examScope: item.examScope,
          lang: item.lang,
          publishedAt: item.publishedAt,
        },
      });
      // Best-effort: add to the semantic index so the mentor can retrieve it.
      const both = item.examScope.includes("UPSC") && item.examScope.includes("MPSC");
      void indexContent("CA", created.id, both ? "ALL" : (item.examScope[0] ?? "UPSC"),
        `${created.headline}. ${processed.whyInNews ?? ""} ${processed.background ?? ""} ${processed.gsMapping.join(" ")} ${processed.tags.join(" ")}`).catch(() => {});
      ingested++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Quota errors are expected on free tier — surface count, not noise
      if (!msg.includes("429") && !msg.includes("quota")) errors.push(msg.slice(0, 120));
    }
  });

  return Response.json({
    ingested,
    fetched: allItems.length,
    fresh: fresh.length,
    remaining: Math.max(0, fresh.length - ingested),
    errors: errors.slice(0, 3),
  });
}
