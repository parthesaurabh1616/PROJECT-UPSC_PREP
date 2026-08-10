/* ════════════════════════════════════════════════════════════════
   MEDIA SELECTOR (Phase 4).

   The question this answers is NOT "how do I animate this topic?" but
   "what does the learner need to mentally SEE to understand it?"

   Three rules shape the whole design:

   1. CONCEPT-DRIVEN, NOT SUBJECT-DRIVEN. Nothing here asks which subject
      it is holding. It reasons from signals — motion, space, time,
      causality, interaction, structure, quantity — so a History topic
      with a strong spatial signal gets a map for the same reason a
      Geography one does. Subject profiles supply priors, never verdicts.

   2. LEARNING GAIN PER UNIT OF VISUAL COMPLEXITY. Every medium pays a
      complexity and production cost. Animation must EARN its place by
      carrying information motion alone can carry; otherwise the cheaper
      representation wins. A static diagram that teaches perfectly beats
      a beautiful animation that teaches the same thing.

   3. DETERMINISTIC. Same input, same plan, no API call, no quota. The
      selector gates render effort, so it has to be reproducible and
      auditable — every decision carries the signal values that caused it.
   ════════════════════════════════════════════════════════════════ */
import { LEX } from "./scoring";
import { getSubject } from "./subjects";
import { LearningObject } from "./learning-object";

/* ── Vocabulary ─────────────────────────────────────────────────── */

export const OBJECTIVES = [
  "DEFINE", "IDENTIFY", "LOCATE", "COMPARE", "EXPLAIN", "TRACE_PROCESS",
  "UNDERSTAND_CAUSALITY", "UNDERSTAND_STRUCTURE", "UNDERSTAND_INTERACTION",
  "UNDERSTAND_CHANGE", "MEMORIZE", "APPLY", "ANALYZE", "RECALL",
] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const CONCEPT_ARCHETYPES = [
  "PROCESS", "MECHANISM", "SYSTEM", "STRUCTURE", "ACTOR_INTERACTION", "SPATIAL",
  "TEMPORAL", "CAUSAL", "COMPARATIVE", "QUANTITATIVE", "CLASSIFICATION",
  "HIERARCHY", "CYCLE", "FLOW", "TRANSFORMATION", "ABSTRACT_THEORY",
  "DEFINITION", "CASE_STUDY", "EVENT",
] as const;
export type ConceptArchetype = (typeof CONCEPT_ARCHETYPES)[number];

export const MEDIA = [
  "TEXT", "STATIC_DIAGRAM", "ANIMATED_DIAGRAM", "MAP", "ANIMATED_MAP",
  "TIMELINE", "CHARACTER_SCENE", "PROCESS_ANIMATION", "CONCEPT_GRAPH",
  "COMPARISON", "CHART", "CROSS_SECTION", "GLOBE", "SIMULATION", "MIXED_MEDIA",
] as const;
export type Medium = (typeof MEDIA)[number];

/* ── Signals ────────────────────────────────────────────────────── */

const hits = (text: string, re: RegExp) => (text.match(new RegExp(re.source, "gi")) ?? []).length;
const sat = (n: number, k: number) => Math.round(10 * (1 - Math.exp(-n / k)));

/** Signals the media decision is allowed to reason from. Extra lexicons here
    cover what the render scorer never needed: quantity, structure, actors. */
const EXTRA = {
  /**
   * Motion, stemmed.
   * LEX.movement wraps its stems in \b…\b, so "sinks", "moves" and "rotating"
   * never match — only the bare stem does. That under-counts motion badly on
   * ordinary prose, which is why plate tectonics read as motionless. Fixed
   * here rather than in LEX because the render scorer is calibrated against
   * the current behaviour and must stay byte-identical; LEX deserves the same
   * fix separately, with its own re-calibration.
   */
  motion: /\b(mov|flow|drift|ris|sink|rotat|circulat|converg|diverg|current|wind|spread|deflect|transport|expand|collaps|accret|coalesc|orbit|slid|slip|descend|bend|push|pull|travel|dive|erupt|migrat)\w*/,
  depth: /\b(layer|depth|deep|cross-?section|interior|vertical|profile|beneath|below|underneath|core|mantle|crust|column|gradient|shelf|slope|floor|surface)\w*/,
  quantitative: /\b(\d+\s*%|percent|per cent|ratio|rate|index|billion|million|trillion|crore|lakh|growth|decline|share of|GDP|deficit|inflation)\b/,
  structural: /\b(hierarch|level|tier|branch|organ|composed of|consists? of|structure|body|chamber|house|division of powers|separation)\b/,
  interaction: /\b(negotiat|conflict|cooperat|agree|contract|alliance|rival|actor|stakeholder|bargain|fear|trust|obey|command|consent)\b/,
  definitional: /\bis (?:called|known as|defined)|\bmeans\b|refers to|definition|terminology/,
  cyclical: /\b(cycle|cyclical|recurring|seasonal|feedback|loop|returns? to|repeats)\b/,
};

export interface ConceptSignals {
  motion: number; space: number; time: number; causality: number;
  interaction: number; quantitative: number; structural: number;
  comparison: number; definitional: number; cyclical: number; depth: number;
}

/**
 * Signals are DENSITY, not raw count — hits per 1000 characters.
 *
 * The render scorer counts raw hits because it always compares whole class
 * summaries of similar length. The media selector does not: it must judge a
 * 250-character concept statement and a 7000-character class on the same
 * scale. With raw counts the short text scored "no signal" on everything and
 * every concept collapsed to TEXT — five fixtures failed that way, including
 * plate tectonics, which is the most obviously animated concept we have.
 *
 * The floor stops a one-line input from exploding on a single lucky match.
 */
function density(text: string, re: RegExp): number {
  const per1000 = (hits(text, re) * 1000) / Math.max(400, text.length);
  return per1000;
}

export function extractSignals(text: string): ConceptSignals {
  const d = (re: RegExp) => density(text, re);
  return {
    motion: sat(d(EXTRA.motion), 9),
    space: sat(d(LEX.spatial) + d(LEX.map), 10),
    time: sat(d(LEX.temporal) + d(LEX.timeline), 7),
    causality: sat(d(LEX.causal), 9),
    interaction: sat(d(EXTRA.interaction), 7),
    quantitative: sat(d(EXTRA.quantitative), 7),
    structural: sat(d(EXTRA.structural) + d(LEX.institution), 9),
    comparison: sat(d(LEX.comparison), 6),
    definitional: sat(d(EXTRA.definitional), 5),
    cyclical: sat(d(EXTRA.cyclical), 4),
    depth: sat(d(EXTRA.depth), 9),
  };
}

/** Concept archetypes, derived from signals — no subject involved. */
export function detectArchetypes(s: ConceptSignals): ConceptArchetype[] {
  const out: ConceptArchetype[] = [];
  if (s.motion >= 6 || s.causality >= 7) out.push("PROCESS");
  if (s.motion >= 7 && s.causality >= 6) out.push("MECHANISM");
  if (s.space >= 6) out.push("SPATIAL");
  if (s.time >= 6) out.push("TEMPORAL");
  if (s.causality >= 6) out.push("CAUSAL");
  if (s.comparison >= 6) out.push("COMPARATIVE");
  if (s.quantitative >= 6) out.push("QUANTITATIVE");
  if (s.structural >= 6) out.push("STRUCTURE");
  if (s.structural >= 7) out.push("HIERARCHY");
  if (s.interaction >= 6) out.push("ACTOR_INTERACTION");
  if (s.cyclical >= 5) out.push("CYCLE");
  if (s.definitional >= 6 && s.motion < 5) out.push("DEFINITION");
  return out.length ? out : ["DEFINITION"];
}

/* ── Media candidates ───────────────────────────────────────────── */

interface Candidate {
  medium: Medium;
  /** Existing render primitive. null = recommendable but not yet buildable. */
  primitive: string | null;
  serves: ConceptArchetype[];
  objectives: Objective[];
  /** Signal that must clear the bar, else this medium is not even considered. */
  gate?: (s: ConceptSignals) => boolean;
  fit: (s: ConceptSignals) => number;
  complexityCost: number;
  productionCost: number;
}

/* Costs are what stop the engine reaching for animation by default.
   Animation only wins where its fit exceeds the cheaper option by more
   than the extra load it puts on the learner. */
const CANDIDATES: Candidate[] = [
  { medium: "TEXT", primitive: "DEFINITION_REVEAL", serves: ["DEFINITION"], objectives: ["DEFINE", "MEMORIZE", "RECALL"],
    fit: (s) => s.definitional * 0.9 + (10 - s.motion) * 0.2, complexityCost: 0, productionCost: 0 },

  { medium: "STATIC_DIAGRAM", primitive: "DEFINITION_REVEAL", serves: ["DEFINITION", "STRUCTURE", "CLASSIFICATION"],
    objectives: ["DEFINE", "IDENTIFY", "UNDERSTAND_STRUCTURE", "RECALL"],
    fit: (s) => s.definitional * 0.6 + s.structural * 0.5 + (10 - s.motion) * 0.3, complexityCost: 1, productionCost: 1 },

  { medium: "CONCEPT_GRAPH", primitive: "CONCEPT_GRAPH", serves: ["CAUSAL", "SYSTEM", "ABSTRACT_THEORY", "FLOW"],
    objectives: ["UNDERSTAND_CAUSALITY", "EXPLAIN", "ANALYZE"],
    gate: (s) => s.causality >= 5,
    fit: (s) => s.causality * 1.0 + s.structural * 0.2, complexityCost: 3, productionCost: 2 },

  { medium: "PROCESS_ANIMATION", primitive: "CAUSAL_CHAIN", serves: ["PROCESS", "MECHANISM", "TRANSFORMATION", "CYCLE"],
    objectives: ["TRACE_PROCESS", "UNDERSTAND_CHANGE", "EXPLAIN"],
    // Motion must be present. Animation without movement is decoration.
    gate: (s) => s.motion >= 6,
    fit: (s) => s.motion * 0.9 + s.causality * 0.5, complexityCost: 5, productionCost: 5 },

  { medium: "CROSS_SECTION", primitive: "CROSS_SECTION", serves: ["STRUCTURE", "MECHANISM", "SPATIAL"],
    objectives: ["UNDERSTAND_STRUCTURE", "EXPLAIN", "TRACE_PROCESS"],
    gate: (s) => s.depth >= 6,
    fit: (s) => s.depth * 0.9 + s.motion * 0.3, complexityCost: 3, productionCost: 3 },

  { medium: "MAP", primitive: "PHYSICAL_MAP", serves: ["SPATIAL"], objectives: ["LOCATE", "IDENTIFY"],
    gate: (s) => s.space >= 6,
    fit: (s) => s.space * 0.9 - s.motion * 0.2, complexityCost: 2, productionCost: 2 },

  { medium: "ANIMATED_MAP", primitive: "GEOPOLITICAL_MAP", serves: ["SPATIAL", "TEMPORAL", "FLOW"],
    objectives: ["UNDERSTAND_CHANGE", "LOCATE", "TRACE_PROCESS"],
    gate: (s) => s.space >= 6 && s.motion >= 5,
    fit: (s) => s.space * 0.7 + s.motion * 0.5, complexityCost: 5, productionCost: 5 },

  { medium: "GLOBE", primitive: "EARTH_GLOBE", serves: ["SPATIAL", "SYSTEM"], objectives: ["LOCATE", "UNDERSTAND_CHANGE"],
    // Planetary scale only — a globe for a district map is spectacle.
    gate: (s) => s.space >= 7 && s.depth >= 5,
    fit: (s) => s.space * 0.6 + s.depth * 0.4, complexityCost: 4, productionCost: 4 },

  { medium: "TIMELINE", primitive: "TIMELINE", serves: ["TEMPORAL", "EVENT"], objectives: ["UNDERSTAND_CHANGE", "IDENTIFY"],
    gate: (s) => s.time >= 6,
    fit: (s) => s.time * 1.0 + s.causality * 0.2, complexityCost: 2, productionCost: 2 },

  { medium: "COMPARISON", primitive: "COMPARISON_SPLIT", serves: ["COMPARATIVE", "CLASSIFICATION"],
    objectives: ["COMPARE", "ANALYZE"],
    gate: (s) => s.comparison >= 6,
    fit: (s) => s.comparison * 1.1, complexityCost: 2, productionCost: 2 },

  { medium: "CHARACTER_SCENE", primitive: "STATE_TRANSITION", serves: ["ACTOR_INTERACTION", "ABSTRACT_THEORY", "CASE_STUDY"],
    objectives: ["UNDERSTAND_INTERACTION", "EXPLAIN", "APPLY"],
    gate: (s) => s.interaction >= 6,
    fit: (s) => s.interaction * 1.0 + s.causality * 0.2, complexityCost: 4, productionCost: 6 },

  { medium: "CHART", primitive: "PROFILE_DIAGRAM", serves: ["QUANTITATIVE"], objectives: ["IDENTIFY", "COMPARE", "ANALYZE"],
    gate: (s) => s.quantitative >= 6,
    fit: (s) => s.quantitative * 1.1, complexityCost: 2, productionCost: 2 },

  { medium: "ANIMATED_DIAGRAM", primitive: "INSTITUTION_DIAGRAM", serves: ["STRUCTURE", "HIERARCHY", "FLOW"],
    objectives: ["UNDERSTAND_STRUCTURE", "EXPLAIN"],
    gate: (s) => s.structural >= 6,
    fit: (s) => s.structural * 0.9 + s.causality * 0.2, complexityCost: 3, productionCost: 3 },
];

/* ── Decision ───────────────────────────────────────────────────── */

export interface MediaDecision {
  medium: Medium;
  primitive: string | null;
  objective: Objective;
  archetypes: ConceptArchetype[];
  score: number;
  confidence: number;
  reason: string;
  alternative: Medium | null;
  rejectedBecause: string | null;
  /** True when the medium is sound but no primitive exists to build it yet. */
  needsNewPrimitive: boolean;
}

function scoreCandidate(c: Candidate, s: ConceptSignals, objective: Objective, priors: Set<string>): number {
  if (c.gate && !c.gate(s)) return -Infinity;
  const objectiveFit = c.objectives.includes(objective) ? 6 : 0;
  // Subject profiles nudge, never decide: a small prior for primitives the
  // subject already speaks in.
  const prior = c.primitive && priors.has(c.primitive) ? 1.5 : 0;
  return c.fit(s) + objectiveFit + prior - c.complexityCost * 0.8 - c.productionCost * 0.4;
}

export function selectMedium(
  text: string, objective: Objective, subjectId?: string,
): MediaDecision {
  const signals = extractSignals(text);
  const archetypes = detectArchetypes(signals);
  const priors = new Set((getSubject(subjectId).primitiveDocs.match(/^[A-Z_]+/gm) ?? []));

  const ranked = CANDIDATES
    .map((c) => ({ c, score: scoreCandidate(c, signals, objective, priors) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);

  // §34 — uncertainty resolves to the safe pedagogical option, never to spectacle.
  if (!ranked.length) {
    return {
      medium: "STATIC_DIAGRAM", primitive: "DEFINITION_REVEAL", objective, archetypes,
      score: 0, confidence: 0.3,
      reason: "No medium cleared its gate; falling back to the safe static representation rather than manufacturing motion.",
      alternative: null, rejectedBecause: null, needsNewPrimitive: false,
    };
  }

  const top = ranked[0], next = ranked[1];
  const margin = next ? top.score - next.score : top.score;
  const confidence = Math.max(0.3, Math.min(0.98, 0.55 + margin / 20));

  const drivers = (Object.entries(signals) as [keyof ConceptSignals, number][])
    .filter(([, v]) => v >= 6).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k} ${v}/10`);

  return {
    medium: top.c.medium,
    primitive: top.c.primitive,
    objective, archetypes,
    score: Math.round(top.score * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    reason: drivers.length
      ? `Objective ${objective}; dominant signals ${drivers.join(", ")}.`
      : `Objective ${objective}; no strong signal, so the cheapest adequate representation wins.`,
    alternative: next?.c.medium ?? null,
    rejectedBecause: next
      ? `${next.c.medium} scored ${Math.round(next.score * 10) / 10} against ${Math.round(top.score * 10) / 10}` +
        (next.c.complexityCost > top.c.complexityCost
          ? " and costs more learner attention for no extra explanatory value."
          : ".")
      : null,
    needsNewPrimitive: top.c.primitive === null,
  };
}

/* ── Media plan ─────────────────────────────────────────────────── */

export interface MediaScene {
  objective: Objective;
  archetypes: ConceptArchetype[];
  medium: Medium;
  primitive: string | null;
  complexityBudget: number;
  estimatedSeconds: number;
  rationale: string;
}

export interface MediaPlan {
  lessonId: string;
  topic: string;
  signals: ConceptSignals;
  archetypes: ConceptArchetype[];
  overallStrategy: Medium | "MIXED_MEDIA";
  confidence: number;
  scenes: MediaScene[];
  rationale: string;
}

/** Objectives worth planning for, given what the concept actually contains.
    A concept with no spatial signal gets no LOCATE scene. */
function objectivesFor(s: ConceptSignals): Objective[] {
  const out: Objective[] = [];
  if (s.definitional >= 5 || s.structural >= 5) out.push("DEFINE");
  if (s.space >= 6) out.push("LOCATE");
  if (s.motion >= 6) out.push("TRACE_PROCESS");
  if (s.causality >= 6) out.push("UNDERSTAND_CAUSALITY");
  if (s.structural >= 6) out.push("UNDERSTAND_STRUCTURE");
  if (s.interaction >= 6) out.push("UNDERSTAND_INTERACTION");
  if (s.time >= 6) out.push("UNDERSTAND_CHANGE");
  if (s.comparison >= 6) out.push("COMPARE");
  if (s.quantitative >= 6) out.push("IDENTIFY");
  if (!out.length) out.push("DEFINE");
  out.push("RECALL"); // every lesson ends by asking for it back
  return out;
}

export function buildMediaPlan(lo: LearningObject): MediaPlan {
  const text = `${lo.topic}\n${lo.explanation}\n${lo.memoryAnchors.join("\n")}`;
  const signals = extractSignals(text);
  const archetypes = detectArchetypes(signals);

  const scenes: MediaScene[] = [];
  const seen = new Set<Medium>();
  for (const objective of objectivesFor(signals)) {
    const d = selectMedium(text, objective, lo.subject);
    // One scene per MEDIUM per objective — repeating a medium back-to-back for
    // two objectives teaches nothing new visually.
    if (seen.has(d.medium) && d.objective !== "RECALL") continue;
    seen.add(d.medium);
    scenes.push({
      objective, archetypes: d.archetypes, medium: d.medium, primitive: d.primitive,
      complexityBudget: 1, // one major cognitive task per scene (§10)
      estimatedSeconds: d.medium === "TEXT" ? 8 : d.medium.includes("ANIM") || d.medium === "PROCESS_ANIMATION" ? 14 : 10,
      rationale: `${d.reason} Chose ${d.medium}` + (d.alternative ? ` over ${d.alternative} — ${d.rejectedBecause}` : "."),
    });
  }

  const strategy: MediaPlan["overallStrategy"] = scenes.length > 2 ? "MIXED_MEDIA" : scenes[0]?.medium ?? "STATIC_DIAGRAM";
  const confidence = Math.round((scenes.length ? 0.6 + Math.min(0.3, scenes.length * 0.05) : 0.3) * 100) / 100;

  return {
    lessonId: lo.id, topic: lo.topic, signals, archetypes,
    overallStrategy: strategy, confidence, scenes,
    rationale: `Concept reads as ${archetypes.join(" + ")}. ${scenes.length} representation(s) chosen by signal strength, cheapest adequate medium first.`,
  };
}
