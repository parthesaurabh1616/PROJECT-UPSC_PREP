/* ════════════════════════════════════════════════════════════════
   Visualization scoring — decides whether a topic deserves a video
   at all, and if so which shape (directive §24–25, §48, §66).

   Deliberately DETERMINISTIC. An AI scorer would be non-reproducible,
   cost quota on every re-run, and drift between sessions — and this
   number gates real render effort. Signals are extracted from the
   class summary itself, so the score is auditable: every point is
   traceable to text the class actually contained.
   ════════════════════════════════════════════════════════════════ */
import {
  Subject, Archetype, ScoreBreakdown, VisualizationScore, tierOf, priorityOf,
} from "./types";
import { getSubject } from "./subjects";

/** Diminishing-returns normaliser: many hits saturate rather than run away. */
function sat(count: number, saturation: number): number {
  return Math.round(10 * (1 - Math.exp(-count / saturation)));
}

/** Count regex hits across the whole text (global, case-insensitive). */
function hits(text: string, re: RegExp): number {
  return (text.match(new RegExp(re.source, "gi")) ?? []).length;
}

/* Lexicons deliberately span BOTH the Earth-scale and cosmic-scale
   vocabularies, and both the political-theory and geopolitical ones.
   The first draft was Earth-centric and thought-centric, which scored
   the Big Bang class at 32 and the chokepoint/IR classes in the 30s —
   all of them strongly visual topics. Blind lexicon, not weak content. */
const LEX = {
  causal: /→|↓|leads to|causes|results in|gives rise|drives|triggers|produces|because|therefore|hence|so that|thus/,
  spatial: /\b(north|south|east|west|equator|tropic|latitude|longitude|hemisphere|coast|margin|basin|plateau|ridge|trench|belt|zone|region|boundary|orbit|distance)\b/,
  process: /\b(process|forms?|formation|cycle|transition|evolution|stage|phase|mechanism|develops?|sequence)\b/,
  temporal: /\b(million|billion|years ago|era|epoch|decade|centur|geological|bya|\bmyr\b)\b/,
  threeD: /\b(layer|depth|cross-?section|interior|vertical|profile|beneath|below|core|mantle|crust|column|deep|gradient|shell|scale)\b/,
  invisible: /\b(mantle|convection|subduction|upwelling|magma|seismic|atmospher|thermohaline|plume|sea ?floor|circulation|pressure|radiation|singularity|inflation|expansion|cosmic|nucleosynthesis|recombination|photon|quark|gravitation|dark (?:matter|energy)|redshift)\b/,
  movement: /\b(move|flow|drift|ris(e|ing)|sink|rotat|circulat|converg|diverg|current|wind|spread|deflect|transport|expand|collapse|accret|coalesc|orbit)\b/,
  abstraction: /\b(sovereignty|legitimacy|justice|liberty|power|authority|equality|rights?|obligation|hegemony|ideology|virtue|freedom|consent|autonomy)\b/,
  comparison: /\bvs\b|versus|compared|comparison|difference|unlike|whereas|contrast|rival|against/,
  theory: /\b(realis|liberalis|marxis|constructivis|idealis|feminis|utilitarian|contractual|positivis|functionalis|pluralis|mandala)\w*/,
  institution: /\b(parliament|executive|judiciary|state|sovereign|constitution|federal|commission|assembly|council|treaty|UN|UNCLOS)\b/,
  /** Strategic/spatial politics — the PSIR half that belongs on a map. */
  geopolitics: /\b(strait|canal|corridor|choke ?point|alliance|balance of power|sphere|border|maritime|trade route|sanction|deterrence|bloc|pipeline|port|hegemon|containment|encircl|de-?hyphenat|neighbourhood)\b/,
  answer: /\b(10 ?M|15 ?M|150 ?W|250 ?W|PYQ|question set|mains|answer|marks)\b/,
  defined: /\bis (?:called|known as|defined)|\bmeans\b|refers to|—\s*the\b/,
  thinker: /\b(Plato|Aristotle|Socrates|Machiavelli|Hobbes|Locke|Rousseau|Mill|Bentham|Marx|Gramsci|Arendt|Gandhi|Ambedkar|Nehru|Kautilya)\b/,
  map: /\b(strait|canal|ocean|sea|gulf|route|corridor|border|island|country|region|map)\b/,
  timeline: /\b(18|19|20)\d{2}\b|\bBC\b|\bphase [1-5]\b|\bact [1-5]\b/,
};

export interface ScoreInput {
  subject: Subject;
  topic: string;
  body: string;
  anchors: string[];
}

/** The subject profile decides the shape; the engine only supplies signals. */
function pickArchetype(subject: Subject, topic: string, text: string, dims: Record<string, number>): Archetype {
  const chosen = getSubject(subject).archetypeFor({
    topic, dims,
    hits: (re) => hits(text, re),
    topicHits: (re) => hits(topic, re),
    lex: LEX,
  });
  return (chosen as Archetype) ?? "CONCEPT_ANIMATION";
}

export function scoreTopic(input: ScoreInput): VisualizationScore {
  const { subject, topic, body, anchors } = input;
  const text = `${topic}\n${body}\n${anchors.join("\n")}`;

  /* Saturation constants are calibrated so a genuinely rich class CAN
     reach the 90+ FULL_VIDEO band. The first pass used constants that
     capped the scale near 80, which made the directive's own top band
     unreachable and returned zero P0 topics across 37 classes. */
  const causalStructure = sat(hits(text, LEX.causal), 8);
  const memoryBenefit = sat(anchors.length, 7);
  const conceptualDifficulty = Math.max(sat(body.length / 900, 3), sat(hits(text, LEX.defined), 4));
  const upscRelevance = Math.max(sat(hits(text, LEX.answer), 2), 6); // every taught class is examinable

  /* Every signal is computed; the PROFILE decides which ones count. Computing
     all of them is cheap and keeps this function free of subject branches —
     unused dimensions carry no weight and are dropped from the breakdown. */
  const ALL: Record<string, number> = {
    causalStructure, memoryBenefit, conceptualDifficulty, upscRelevance,
    spatialComplexity: sat(hits(text, LEX.spatial), 7),
    processComplexity: sat(hits(text, LEX.process), 5),
    temporalScale: sat(hits(text, LEX.temporal), 3),
    threeDBenefit: sat(hits(text, LEX.threeD), 7),
    invisibleProcess: sat(hits(text, LEX.invisible), 5),
    movementBenefit: sat(hits(text, LEX.movement), 6),
    abstraction: sat(hits(text, LEX.abstraction), 7),
    comparisonPotential: sat(hits(text, LEX.comparison), 4),
    theoreticalComplexity: sat(hits(text, LEX.theory), 3),
    institutionalRelations: sat(hits(text, LEX.institution), 7),
    answerWritingUtility: sat(hits(text, LEX.answer), 2),
    geopoliticalInteraction: sat(hits(text, LEX.geopolitics), 5),
  };

  const profile = getSubject(subject);
  ALL.animationBenefit = profile.animationBenefit(ALL);

  // Breakdown carries the shared signals plus only this subject's dimensions.
  const b: ScoreBreakdown = { causalStructure, memoryBenefit, conceptualDifficulty, upscRelevance, animationBenefit: ALL.animationBenefit };
  for (const d of profile.dimensions) (b as unknown as Record<string, number>)[d] = ALL[d];

  const total = Math.round(
    Object.entries(profile.weights).reduce((sum, [k, weight]) => sum + (ALL[k] ?? 0) * weight, 0) * 10
  );

  const archetype = pickArchetype(subject, topic, text, ALL);

  const reasons = Object.entries(b)
    .filter(([, v]) => (v ?? 0) >= 8)
    .sort((a, z) => (z[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase().trim()}: ${v}/10`);

  return { subject, breakdown: b, total, tier: tierOf(total), priority: priorityOf(total), archetype, reasons };
}
