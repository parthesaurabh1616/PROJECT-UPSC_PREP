/* ════════════════════════════════════════════════════════════
   Conquer Capital — News Feed Registry
   Verified live 2026-06-12. Google News RSS is the universal
   backbone: publishers' own RSS feeds (PIB, The Hindu, IE,
   Reuters, Bloomberg) are dead/403/bot-blocked, but the
   `news.google.com/rss/search?q=site:DOMAIN` pattern bypasses
   all of them with no API key and ~50 items/query.
   ════════════════════════════════════════════════════════════ */

export type FeedCategory = "pib" | "editorial" | "international" | "economy" | "news";

export interface Feed {
  name: string;
  url: string;
  category: FeedCategory;
  /** how many items to pull per sync (keeps AI cost bounded) */
  take: number;
  /** direct = publisher's own feed; gnews = Google News wrapper */
  kind: "direct" | "gnews";
}

const GN = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

export const FEEDS: Feed[] = [
  // ── PIB — Government press releases (own section) ──────────────
  { name: "PIB India",        url: GN("site:pib.gov.in"),                       category: "pib",           take: 6, kind: "gnews" },

  // ── Editorials & Explainers (highest UPSC value) ──────────────
  { name: "The Hindu Editorial", url: GN("site:thehindu.com editorial OR opinion"), category: "editorial", take: 5, kind: "gnews" },
  { name: "IE Explained",     url: GN("site:indianexpress.com explained"),       category: "editorial",    take: 5, kind: "gnews" },

  // ── National news ─────────────────────────────────────────────
  { name: "The Hindu",        url: GN("site:thehindu.com"),                      category: "news",         take: 5, kind: "gnews" },
  { name: "Indian Express",   url: GN("site:indianexpress.com india"),           category: "news",         take: 4, kind: "gnews" },
  { name: "NDTV",             url: "https://feeds.feedburner.com/ndtvnews-india-news", category: "news",   take: 4, kind: "direct" },
  { name: "Govt Policy",      url: GN("india government policy scheme bill"),     category: "news",         take: 4, kind: "gnews" },

  // ── Economy ───────────────────────────────────────────────────
  { name: "Business Standard", url: GN("site:business-standard.com"),            category: "economy",      take: 4, kind: "gnews" },
  { name: "LiveMint",         url: GN("site:livemint.com india economy"),        category: "economy",      take: 3, kind: "gnews" },
  { name: "India Economy",    url: GN("india economy RBI budget inflation GDP"), category: "economy",      take: 3, kind: "gnews" },

  // ── International (IR — GS-II) ─────────────────────────────────
  { name: "Reuters India",    url: GN("site:reuters.com india"),                 category: "international", take: 3, kind: "gnews" },
  { name: "Bloomberg India",  url: GN("site:bloomberg.com india"),               category: "international", take: 3, kind: "gnews" },
  { name: "World Affairs",    url: GN("india foreign policy diplomacy UN G20 BRICS"), category: "international", take: 3, kind: "gnews" },
];

export const CATEGORY_META: Record<FeedCategory, { label: string; short: string }> = {
  pib:           { label: "PIB · Government",   short: "PIB" },
  editorial:     { label: "Editorials",          short: "Editorial" },
  news:          { label: "National News",       short: "News" },
  economy:       { label: "Economy",             short: "Economy" },
  international: { label: "International",        short: "World" },
};
