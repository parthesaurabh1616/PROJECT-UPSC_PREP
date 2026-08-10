/* ════════════════════════════════════════════════════════════════
   Visual Revision Engine — the type contract.

   The whole point of this layer: a scene's visual is a TYPED
   PRIMITIVE + PROPS, never a prose description. Prose would only
   ever produce slides. A typed primitive can be rendered, diffed,
   re-rendered and QA'd — and it forces the storyboard to commit to
   a structure that mirrors the knowledge rather than decorating it.
   ════════════════════════════════════════════════════════════════ */

export type Subject = "PSIR" | "GEOGRAPHY";

/** Reusable video shapes (directive §26). */
export const ARCHETYPES = [
  "CONCEPT_ANIMATION",
  "PROCESS_ANIMATION",
  "THINKER",
  "THEORY_SIMULATION",
  "COMPARISON",
  "MAP_ANIMATION",
  "TIMELINE",
  "RAPID_REVISION",
  "UPSC_APPLICATION",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

/** Score bands → what actually gets built (directive §24). */
export type Tier = "FULL_VIDEO" | "ANIMATED_EXPLANATION" | "MICRO_ANIMATION" | "STATIC_VISUAL" | "TEXT_ONLY";
export type Priority = "P0" | "P1" | "P2" | "P3";

/* ── Scene primitives ────────────────────────────────────────────
   Shared primitives work for both subjects. Subject-specific ones
   carry that subject's visual language: Geography = Earth, space,
   movement, process; PSIR = ideas, power, institutions, networks. */
export const PRIMITIVES = [
  // shared
  "TITLE", "CAUSAL_CHAIN", "COMPARISON_SPLIT", "TIMELINE", "DEFINITION_REVEAL",
  "QUOTE_REVEAL", "MEMORY_ANCHOR", "RECALL_FRAME", "UPSC_PANEL",
  // geography
  "CROSS_SECTION", "PLATE_BOUNDARY", "EARTH_GLOBE", "ATMOSPHERIC_CELL",
  "OCEAN_CURRENT", "PRESSURE_SYSTEM", "WIND_VECTOR", "PROFILE_DIAGRAM", "PHYSICAL_MAP",
  // psir
  "CONCEPT_GRAPH", "THINKER_WORLD", "GEOPOLITICAL_MAP", "INSTITUTION_DIAGRAM", "STATE_TRANSITION",
] as const;
export type Primitive = (typeof PRIMITIVES)[number];

export interface VisualSpec {
  primitive: Primitive;
  /** Primitive-specific props. Validated per-primitive at render time. */
  props: Record<string, unknown>;
  /** One line on what the viewer should SEE happen. Direction, not decoration. */
  motion?: string;
}

export interface Scene {
  n: number;
  seconds: number;
  /** The pedagogical job of this scene — why it exists at all. */
  beat: string;
  visual: VisualSpec;
  /** Explains what the animation MEANS. Never narrates the picture. */
  narration: string;
  /** Keywords/labels only. Never sentences (directive §39). */
  onScreenText: string[];
  emphasis?: string[];
  /** Which anchor / body line this scene is grounded in (provenance). */
  sourceAnchor?: string;
}

/** The teaching plan (directive §74). If this reads as confusing, the video
    will be confusing — it is checked before a single frame is rendered. */
export interface TeachingPlan {
  learningObjective: string;
  priorKnowledgeRequired: string[];
  coreProblem: string;
  coreConcept: string;
  /** The whole idea in plain words, no jargon at all. */
  simpleExplanation: string;
  technicalDefinition: string;
  causalChain: string[];
  visualMetaphor: string;
  memoryAnchor: string;
  upscBridge: string;
}

export interface Storyboard {
  version: number;
  subject: Subject;
  topic: string;
  nodeId: string | null;
  archetype: Archetype;
  learningObjective: string;
  teachingPlan?: TeachingPlan;
  totalSeconds: number;
  scenes: Scene[];
  /** The compact chain the student replays from memory (directive §30). */
  memoryAnchor: string[];
  /** Silent reconstruction beat before the reveal (directive §31). */
  recallFrame: { prompt: string; answer: string };
  upscApplication: { concept: string; example: string; answerUse: string; pyqHint?: string };
  /** Anything uncertain — never silently invented (directive §33). */
  flags: string[];
}

/* ── Scoring ─────────────────────────────────────────────────────
   Deterministic signals first (free, reproducible, testable). The
   dimensions differ by subject because the subjects differ. */
export interface ScoreBreakdown {
  // shared
  conceptualDifficulty: number;
  causalStructure: number;
  memoryBenefit: number;
  upscRelevance: number;
  animationBenefit: number;
  // geography
  spatialComplexity?: number;
  processComplexity?: number;
  temporalScale?: number;
  threeDBenefit?: number;
  invisibleProcess?: number;
  movementBenefit?: number;
  // psir
  abstraction?: number;
  comparisonPotential?: number;
  theoreticalComplexity?: number;
  institutionalRelations?: number;
  answerWritingUtility?: number;
  /** Directive §25 — strategic/spatial politics: chokepoints, alliances, corridors. */
  geopoliticalInteraction?: number;
}

export interface VisualizationScore {
  subject: Subject;
  breakdown: ScoreBreakdown;
  /** 0–100 */
  total: number;
  tier: Tier;
  priority: Priority;
  archetype: Archetype;
  /** Human-readable justification for the "Why this video?" panel (§53). */
  reasons: string[];
}

/* Duration envelope per archetype — cognitive load, not a fixed template.
   Widened from the first pass: teaching a mechanism from first principles,
   with the hidden steps put back in and one idea per scene, simply takes
   longer than summarising it. Understanding outranks runtime (directive §37),
   so where the two conflicted the envelope was the thing that was wrong. */
export const DURATION: Record<Archetype, { min: number; max: number }> = {
  CONCEPT_ANIMATION: { min: 45, max: 180 },
  PROCESS_ANIMATION: { min: 60, max: 360 },
  THINKER: { min: 180, max: 420 },
  THEORY_SIMULATION: { min: 180, max: 400 },
  COMPARISON: { min: 90, max: 300 },
  MAP_ANIMATION: { min: 60, max: 240 },
  TIMELINE: { min: 60, max: 240 },
  RAPID_REVISION: { min: 60, max: 180 },
  UPSC_APPLICATION: { min: 60, max: 180 },
};

export function tierOf(total: number): Tier {
  if (total >= 90) return "FULL_VIDEO";
  if (total >= 75) return "ANIMATED_EXPLANATION";
  if (total >= 60) return "MICRO_ANIMATION";
  if (total >= 40) return "STATIC_VISUAL";
  return "TEXT_ONLY";
}

export function priorityOf(total: number): Priority {
  if (total >= 90) return "P0";
  if (total >= 75) return "P1";
  if (total >= 60) return "P2";
  return "P3";
}
