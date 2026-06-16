/* ════════════════════════════════════════════════════════════
   Civil Services Intelligence — importance scoring engine
   Turns a processed news item into a 0-100 importance score +
   severity tier + globe layer. Pure functions; computable from
   fields we already store, so it works on existing rows too.
   ════════════════════════════════════════════════════════════ */

export type Tier = "critical" | "high" | "normal" | "low";
export type Layer = "global" | "india" | "maharashtra";

export interface ScoreInput {
  gsMapping: string[];        // matched GS papers / syllabus areas
  tags: string[];
  category: string;           // pib | editorial | news | economy | international | maharashtra
  source: string | null;
  priority: string;           // AI-assigned: high | normal | low
  publishedAt: Date | string;
}

export interface ScoreResult {
  score: number;              // 0-100
  tier: Tier;
  layer: Layer;
}

// ── Source authority (official > quality press > aggregator) ──
function sourceAuthority(source: string | null, category: string): number {
  const s = (source ?? "").toLowerCase();
  if (category === "pib" || s.includes("pib") || s.includes("press information")) return 1.0;
  if (s.includes("supreme court") || s.includes("rbi") || s.includes("niti") || s.includes("prs")) return 1.0;
  if (s.includes("hindu") || s.includes("indian express") || s.includes("livemint") || s.includes("mint")) return 0.9;
  if (s.includes("reuters") || s.includes("bloomberg") || s.includes("business standard")) return 0.85;
  if (category === "editorial") return 0.9;
  if (category === "economy") return 0.8;
  if (category === "maharashtra") return s.includes("gov") ? 0.9 : 0.7;
  if (category === "international") return 0.8;
  return 0.6; // generic national news / aggregators
}

// ── National vs state reach ───────────────────────────────────
function impact(category: string): number {
  if (category === "maharashtra") return 0.6;        // state reach
  if (category === "international") return 0.85;
  return 0.9;                                         // national
}

// ── Recency: exponential decay, ~7-day half-life ──────────────
function recency(publishedAt: Date | string): number {
  const t = typeof publishedAt === "string" ? new Date(publishedAt).getTime() : publishedAt.getTime();
  const ageDays = Math.max(0, (Date.now() - t) / 86_400_000);
  return Math.exp(-Math.LN2 * ageDays / 7); // 1.0 today → 0.5 at 7d → 0.25 at 14d
}

// ── AI priority as a proxy for national-impact + student interest
function priorityWeight(priority: string): number {
  if (priority === "high") return 1.0;
  if (priority === "low") return 0.25;
  return 0.55; // normal
}

// ── Layer routing from category ───────────────────────────────
export function layerOf(category: string): Layer {
  if (category === "international") return "global";
  if (category === "maharashtra") return "maharashtra";
  return "india";
}

export function tierOf(score: number): Tier {
  if (score >= 75) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "normal";
  return "low";
}

/**
 * Weighted importance score. Weights sum to 1.
 *   syllabusRelevance 0.30 · sourceAuthority 0.20 · aiPriority 0.20
 *   recency 0.15 · impact 0.15
 */
export function scoreAffair(input: ScoreInput): ScoreResult {
  const syllabusRelevance = Math.min(1, input.gsMapping.length / 3)
    + Math.min(0.2, input.tags.length * 0.04); // small topic-depth bonus
  const sr = Math.min(1, syllabusRelevance);

  const raw =
      0.30 * sr +
      0.20 * sourceAuthority(input.source, input.category) +
      0.20 * priorityWeight(input.priority) +
      0.15 * recency(input.publishedAt) +
      0.15 * impact(input.category);

  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  return { score, tier: tierOf(score), layer: layerOf(input.category) };
}
