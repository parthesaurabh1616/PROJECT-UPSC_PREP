/* ════════════════════════════════════════════════════════════════
   LEARNING OBJECT (§18) — the universal content representation.

   Today every lesson is built from a ClassSummary: topic + body + anchors.
   That shape is narrow, and it is the reason the engine can only teach what
   the user personally sat in a class for. A LearningObject is the wider
   shape the same engine can be fed from NCERT chapters, PYQs, current
   affairs or a pasted syllabus, without the storyboard layer noticing.

   FOUNDATION ONLY, deliberately. The type plus a lossless adapter from what
   we already store — no migration, no new tables, nothing regenerated. The
   existing pipeline keeps running through the adapter, and richer sources
   can be added later by writing another adapter rather than another engine.
   ════════════════════════════════════════════════════════════════ */
import { Subject } from "./types";

/** Where a claim came from. Ranked: higher wins a conflict (§8, §16). */
export const SOURCE_TIERS = [
  "OFFICIAL",        // UPSC, government, constitutional text
  "STANDARD",        // NCERT, standard textbook
  "REPUTABLE",       // established secondary source
  "CLASS_CONTENT",   // the user's own class notes — authoritative for THEIR syllabus
  "EXPLANATORY",     // coaching material, summaries
  "GENERATED",       // model-written explanation
  "ANALOGY",         // deliberate simplification, not a factual claim
] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export interface Provenance {
  tier: SourceTier;
  /** Human-readable origin: "Class 22 Jul", "NCERT XI Ch.2", "PIB 4 Jun 2026". */
  origin: string;
  /** Set when the claim could not be verified — never silently dropped. */
  uncertain?: boolean;
  verifiedAt?: string;
}

export interface Claim {
  text: string;
  provenance: Provenance;
}

export interface LearningObject {
  id: string;
  subject: Subject;
  /** Syllabus coordinates. nodeId ties it to the revision ladder. */
  paper?: string;
  nodeId: string | null;
  topic: string;
  concept?: string;

  /** The teaching substance. */
  explanation: string;
  /** Atomic recall hooks — what the current `anchors` field already holds. */
  memoryAnchors: string[];
  prerequisites: string[];
  mechanisms: string[];
  examples: string[];
  /** What a learner most often gets wrong here (§28). */
  misconceptions: string[];

  /** Exam surface. */
  examRelevance?: { prelims?: string; mains?: string; pyq?: string[] };
  recallQuestions: string[];

  /** Every factual claim's origin. Empty is honest; invented is not. */
  claims: Claim[];
  difficulty?: number;
  /** When this content was captured, for current-affairs staleness. */
  capturedAt?: string;
}

/** What the class-summary pipeline currently supplies. */
export interface ClassSummaryLike {
  id: string;
  subject: string;
  nodeId: string | null;
  topic: string;
  body: string;
  anchors: string[];
  day?: Date | string;
}

/**
 * Adapter: existing content → LearningObject, lossless and offline.
 * Fields we genuinely do not have yet stay empty rather than being invented —
 * an empty `misconceptions` is a truthful "not captured", and something the
 * pipeline can fill later without pretending it was always there.
 */
export function fromClassSummary(row: ClassSummaryLike, subjectId: string): LearningObject {
  return {
    id: row.id,
    subject: subjectId,
    paper: row.subject,
    nodeId: row.nodeId,
    topic: row.topic,
    explanation: row.body,
    memoryAnchors: row.anchors,
    prerequisites: [],
    mechanisms: [],
    examples: [],
    misconceptions: [],
    recallQuestions: [],
    claims: [{
      text: row.body,
      provenance: {
        tier: "CLASS_CONTENT",
        origin: row.day ? `Class ${new Date(row.day).toLocaleDateString("en-IN")}` : "Class notes",
      },
    }],
    capturedAt: row.day ? new Date(row.day).toISOString() : undefined,
  };
}

/** What the storyboard generator consumes today — unchanged shape, so the
    adapter can be slotted in without touching the generator. */
export function toStoryboardInput(lo: LearningObject) {
  return {
    subject: lo.subject,
    topic: lo.topic,
    nodeId: lo.nodeId,
    body: lo.explanation,
    anchors: lo.memoryAnchors,
  };
}

/** Higher tier wins; equal tiers are a genuine conflict to surface, not resolve (§9). */
export function compareTiers(a: SourceTier, b: SourceTier): number {
  return SOURCE_TIERS.indexOf(a) - SOURCE_TIERS.indexOf(b);
}
