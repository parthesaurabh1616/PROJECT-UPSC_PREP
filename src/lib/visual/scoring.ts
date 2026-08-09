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

function pickArchetype(s: Subject, topic: string, text: string, b: ScoreBreakdown): Archetype {
  if (s === "PSIR") {
    if (hits(topic, LEX.thinker) > 0) return "THINKER";
    if ((b.geopoliticalInteraction ?? 0) >= 7) return "MAP_ANIMATION";
    if ((b.comparisonPotential ?? 0) >= 8) return "COMPARISON";
    if ((b.theoreticalComplexity ?? 0) >= 7) return "THEORY_SIMULATION";
    if (hits(text, LEX.timeline) >= 10) return "TIMELINE";
    return "CONCEPT_ANIMATION";
  }
  if ((b.processComplexity ?? 0) >= 6 || (b.movementBenefit ?? 0) >= 7) return "PROCESS_ANIMATION";
  if (hits(text, LEX.map) >= 14) return "MAP_ANIMATION";
  if ((b.temporalScale ?? 0) >= 7) return "TIMELINE";
  return "CONCEPT_ANIMATION";
}

const W_GEO: Record<string, number> = {
  animationBenefit: 0.15, invisibleProcess: 0.15, processComplexity: 0.13, threeDBenefit: 0.11,
  spatialComplexity: 0.10, movementBenefit: 0.10, causalStructure: 0.09, upscRelevance: 0.07,
  memoryBenefit: 0.05, conceptualDifficulty: 0.05,
};
const W_PSIR: Record<string, number> = {
  animationBenefit: 0.14, causalStructure: 0.14, abstraction: 0.11, comparisonPotential: 0.11,
  theoreticalComplexity: 0.10, geopoliticalInteraction: 0.10, answerWritingUtility: 0.09,
  upscRelevance: 0.07, conceptualDifficulty: 0.07, institutionalRelations: 0.04, memoryBenefit: 0.03,
};

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

  const b: ScoreBreakdown = { causalStructure, memoryBenefit, conceptualDifficulty, upscRelevance, animationBenefit: 0 };

  if (subject === "GEOGRAPHY") {
    b.spatialComplexity = sat(hits(text, LEX.spatial), 7);
    b.processComplexity = sat(hits(text, LEX.process), 5);
    b.temporalScale = sat(hits(text, LEX.temporal), 3);
    b.threeDBenefit = sat(hits(text, LEX.threeD), 7);
    b.invisibleProcess = sat(hits(text, LEX.invisible), 5);
    b.movementBenefit = sat(hits(text, LEX.movement), 6);
    b.animationBenefit = Math.round(((b.invisibleProcess + b.movementBenefit + b.processComplexity) / 3));
  } else {
    b.abstraction = sat(hits(text, LEX.abstraction), 7);
    b.comparisonPotential = sat(hits(text, LEX.comparison), 4);
    b.theoreticalComplexity = sat(hits(text, LEX.theory), 3);
    b.institutionalRelations = sat(hits(text, LEX.institution), 7);
    b.answerWritingUtility = sat(hits(text, LEX.answer), 2);
    b.geopoliticalInteraction = sat(hits(text, LEX.geopolitics), 5);
    b.animationBenefit = Math.round(
      (causalStructure + (b.comparisonPotential ?? 0) + (b.abstraction ?? 0) + (b.geopoliticalInteraction ?? 0)) / 4
    );
  }

  const w = subject === "GEOGRAPHY" ? W_GEO : W_PSIR;
  const total = Math.round(
    Object.entries(w).reduce((sum, [k, weight]) => sum + ((b as Record<string, number | undefined>)[k] ?? 0) * weight, 0) * 10
  );

  const archetype = pickArchetype(subject, topic, text, b);

  const reasons = Object.entries(b)
    .filter(([, v]) => (v ?? 0) >= 8)
    .sort((a, z) => (z[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase().trim()}: ${v}/10`);

  return { subject, breakdown: b, total, tier: tierOf(total), priority: priorityOf(total), archetype, reasons };
}
