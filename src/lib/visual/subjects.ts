/* ════════════════════════════════════════════════════════════════
   SUBJECT REGISTRY (§19).

   The test this exists to pass: adding History must be ONE registry entry,
   not `if (subject === "HISTORY")` scattered through scoring, storyboard
   generation, theming and the renderer.

   Everything a subject needs to be taught differently lives here:
   its visual language, its scoring dimensions and weights, its primitive
   documentation, its palette and its on-screen label. The engine reads the
   profile; it never branches on the subject.

   Deliberately dependency-free — no prisma, no fs, no node builtins — because
   the Remotion bundle imports this for theming.
   ════════════════════════════════════════════════════════════════ */

export interface SubjectTheme {
  bg: string; bgSoft: string; grid: string;
  ink: string; ink2: string; ink3: string;
  accent: string; accent2: string; warn: string; good: string; line: string;
}

export interface SubjectProfile {
  id: string;
  label: string;
  /** Shown in the video's persistent chrome. */
  chromeLabel: string;
  theme: SubjectTheme;
  /** One paragraph telling the generator how this subject should be SEEN. */
  visualLanguage: string;
  /** Primitive prop schemas offered to the generator for this subject. */
  primitiveDocs: string;
  /** Signal names scored for this subject, in addition to the shared ones. */
  dimensions: string[];
  /** Weight per dimension; must sum to 1. */
  weights: Record<string, number>;
  /** How much this subject benefits from motion, from its own dimensions. */
  animationBenefit: (d: Record<string, number>) => number;
  /**
   * Which video shape suits a topic in this subject. Returns null to fall
   * through to the shared default, so a profile only states what differs.
   */
  archetypeFor: (signals: {
    topic: string; dims: Record<string, number>;
    hits: (re: RegExp) => number; topicHits: (re: RegExp) => number;
    lex: Record<string, RegExp>;
  }) => string | null;
}

const GEOGRAPHY_PRIMITIVES = `CROSS_SECTION { layers:[{name,colour,depthKm?}], annotations?:[] }
PLATE_BOUNDARY { kind:"convergent"|"divergent"|"transform", left:{name,type:"oceanic"|"continental"}, right:{...}, outcome?:string }
EARTH_GLOBE { focus?:{lat,lon}, overlay?:"plates"|"currents"|"pressure"|"none", markers?:[{label,lat,lon}] }
ATMOSPHERIC_CELL { cells:["hadley"|"ferrel"|"polar"], latitudes:[..], flow:"rising"|"sinking"|"both" }
OCEAN_CURRENT { currents:[{name,temp:"warm"|"cold",path:[..]}] }
PRESSURE_SYSTEM { centres:[{kind:"high"|"low",label,lat,lon}] }
WIND_VECTOR { vectors:[{from,to,label?,deflect?:"right"|"left"}] }
PROFILE_DIAGRAM { stops:[{name,valueLabel?}], axis?:string }
PHYSICAL_MAP { region:string, features:[{kind,label}] }`;

const PSIR_PRIMITIVES = `CONCEPT_GRAPH { nodes:[{id,label,kind?}], edges:[{from,to,label?}] }
THINKER_WORLD { thinker:string, context:string, problem:string, humanNature:string, stateOfNature?:string, solution:string, criticism:string }
GEOPOLITICAL_MAP { actors:[{name,role:"state"|"alliance"|"threat"}], flows?:[{from,to,kind:"trade"|"threat"|"alliance"}] }
INSTITUTION_DIAGRAM { levels:[{name,powers?:[]}], relations?:[{from,to,label}] }
STATE_TRANSITION { before:{label,traits:[]}, trigger:string, after:{label,traits:[]} }`;

export const SUBJECTS: Record<string, SubjectProfile> = {
  GEOGRAPHY: {
    id: "GEOGRAPHY",
    label: "Geography",
    chromeLabel: "Geography · GS-I",
    theme: {
      bg: "#05080F", bgSoft: "#0B1220", grid: "rgba(120,190,255,0.055)",
      ink: "#EAF2FF", ink2: "#A9BDD6", ink3: "#61748C",
      accent: "#4CC9F0", accent2: "#FFB703", warn: "#FF6B6B", good: "#4ADE80",
      line: "rgba(120,190,255,0.16)",
    },
    visualLanguage:
      "GEOGRAPHY VISUAL LANGUAGE — Earth, space, movement, process, interaction.\n" +
      "Make the invisible visible: anything underground, inside the atmosphere or ocean, or over geological time MUST be animated rather than described.",
    primitiveDocs: GEOGRAPHY_PRIMITIVES,
    dimensions: ["spatialComplexity", "processComplexity", "temporalScale", "threeDBenefit", "invisibleProcess", "movementBenefit"],
    weights: {
      animationBenefit: 0.15, invisibleProcess: 0.15, processComplexity: 0.13, threeDBenefit: 0.11,
      spatialComplexity: 0.10, movementBenefit: 0.10, causalStructure: 0.09, upscRelevance: 0.07,
      memoryBenefit: 0.05, conceptualDifficulty: 0.05,
    },
    animationBenefit: (d) => Math.round((d.invisibleProcess + d.movementBenefit + d.processComplexity) / 3),
    archetypeFor: ({ dims, hits, lex }) => {
      if (dims.processComplexity >= 6 || dims.movementBenefit >= 7) return "PROCESS_ANIMATION";
      if (hits(lex.map) >= 14) return "MAP_ANIMATION";
      if (dims.temporalScale >= 7) return "TIMELINE";
      return null;
    },
  },

  PSIR: {
    id: "PSIR",
    label: "PSIR",
    chromeLabel: "PSIR · Optional",
    theme: {
      bg: "#08070A", bgSoft: "#12101A", grid: "rgba(255,190,120,0.05)",
      ink: "#F5EFE6", ink2: "#C9BCA8", ink3: "#7C6F60",
      accent: "#F0A500", accent2: "#8AB4F8", warn: "#FF6B6B", good: "#4ADE80",
      line: "rgba(255,190,120,0.16)",
    },
    visualLanguage:
      "PSIR VISUAL LANGUAGE — ideas, thinkers, power, states, institutions, networks.\n" +
      "Show STRUCTURE: causal chains, transformations, comparisons, power relations. Never a talking-head list of points.",
    primitiveDocs: PSIR_PRIMITIVES,
    dimensions: ["abstraction", "comparisonPotential", "theoreticalComplexity", "institutionalRelations", "answerWritingUtility", "geopoliticalInteraction"],
    weights: {
      animationBenefit: 0.14, causalStructure: 0.14, abstraction: 0.11, comparisonPotential: 0.11,
      theoreticalComplexity: 0.10, geopoliticalInteraction: 0.10, answerWritingUtility: 0.09,
      upscRelevance: 0.07, conceptualDifficulty: 0.07, institutionalRelations: 0.04, memoryBenefit: 0.03,
    },
    animationBenefit: (d) =>
      Math.round((d.causalStructure + d.comparisonPotential + d.abstraction + d.geopoliticalInteraction) / 4),
    archetypeFor: ({ topicHits, dims, hits, lex }) => {
      if (topicHits(lex.thinker) > 0) return "THINKER";
      if (dims.geopoliticalInteraction >= 7) return "MAP_ANIMATION";
      if (dims.comparisonPotential >= 8) return "COMPARISON";
      if (dims.theoreticalComplexity >= 7) return "THEORY_SIMULATION";
      if (hits(lex.timeline) >= 10) return "TIMELINE";
      return null;
    },
  },
};

export type SubjectId = keyof typeof SUBJECTS;

/** Neutral profile so an unregistered subject degrades rather than crashes —
    the same discipline as the renderer's Fallback primitive. */
const NEUTRAL: SubjectProfile = {
  ...SUBJECTS.GEOGRAPHY,
  id: "GENERAL", label: "General", chromeLabel: "General Studies",
  visualLanguage: "Show the structure of the idea: what causes what, what changes into what, what compares with what.",
};

export function getSubject(id: string | undefined | null): SubjectProfile {
  return (id && SUBJECTS[id]) || NEUTRAL;
}

export const SUBJECT_IDS = Object.keys(SUBJECTS);

/** Route free-text subject labels ("PSIR · Paper II", "GS-I") to a profile.
    One place to change when a new subject joins, instead of every caller. */
export function resolveSubject(label: string): SubjectProfile {
  const s = label.toUpperCase();
  if (s.includes("PSIR") || s.includes("POLITICAL SCIENCE")) return SUBJECTS.PSIR;
  if (s.includes("GS-I") || s.includes("GEOGRAPH")) return SUBJECTS.GEOGRAPHY;
  return NEUTRAL;
}
