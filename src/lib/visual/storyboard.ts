/* ════════════════════════════════════════════════════════════════
   Storyboard generation — knowledge → pedagogical model → typed scenes.

   The hard constraint that keeps this from becoming a slide generator:
   every scene must name a PRIMITIVE from the whitelist and supply its
   props. The model cannot say "a nice diagram of plates"; it has to
   commit to PLATE_BOUNDARY { type: "convergent", plates: [...] }.
   If it cannot express a beat as a primitive, that beat probably
   didn't need a video.
   ════════════════════════════════════════════════════════════════ */
import { generateJson } from "@/lib/ai";
import { PRIMITIVES, DURATION, Storyboard, Subject, VisualizationScore } from "./types";

const GEO_PRIMITIVES = `CROSS_SECTION { layers:[{name,colour,depthKm?}], annotations?:[] }
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

const SHARED_PRIMITIVES = `TITLE { title, subtitle? }
CAUSAL_CHAIN { steps:[{label,note?}] }
COMPARISON_SPLIT { axis:string, columns:[{label,points:[]}] }
TIMELINE { events:[{when,label,consequence?}] }
DEFINITION_REVEAL { term, definition }
QUOTE_REVEAL { quote, attribution }
MEMORY_ANCHOR { chain:[..] }
RECALL_FRAME { prompt, blanks:[..] }
UPSC_PANEL { concept, example, answerUse }`;

function system(subject: Subject): string {
  const language = subject === "GEOGRAPHY"
    ? `GEOGRAPHY VISUAL LANGUAGE — Earth, space, movement, process, interaction.
Make the invisible visible: anything underground, inside the atmosphere or ocean, or over geological time MUST be animated rather than described.
Subject primitives:\n${GEO_PRIMITIVES}`
    : `PSIR VISUAL LANGUAGE — ideas, thinkers, power, states, institutions, networks.
Show STRUCTURE: causal chains, transformations, comparisons, power relations. Never a talking-head list of points.
Subject primitives:\n${PSIR_PRIMITIVES}`;

  return `You are the Visual Storytelling Director of a UPSC visual revision engine.
You convert one completed class into a storyboard that produces a MENTAL MODEL, not slides.

${language}

Shared primitives:
${SHARED_PRIMITIVES}

Allowed primitive names (exact): ${PRIMITIVES.join(", ")}

NON-NEGOTIABLE RULES
1. GROUND EVERYTHING in the supplied class summary. Never introduce a fact, date, figure, name or example that is not present in it. If a scene needs something absent, put a note in "flags" instead of inventing.
2. Narration explains what the visual MEANS. It never describes the picture. Bad: "Here we see two plates moving." Good: "As the two plates converge the denser oceanic plate is forced under — that is what builds a trench."
3. onScreenText is keywords/labels ONLY. Never a sentence, never a paragraph. Max 6 words per item, max 4 items per scene.
4. Every scene must carry a real pedagogical job in "beat". If a scene's only job is decoration, delete it.
5. Ordering must build understanding: context → mechanism → consequence → comparison/criticism → memory.
6. Second-to-last scene is RECALL_FRAME (SILENT — narration must be ""), last scene is MEMORY_ANCHOR (also silent).
7. SELECT, DO NOT COVER. You are building ONE mental model, not summarising the whole class. A class has far more material than a revision video should carry; choose the spine and drop the rest. The notes remain available as text.
8. Narration pace is 2.4 words per second. HARD BUDGET per scene: words ≤ seconds × 2.4. A 10-second scene gets at most 24 words of narration. Write to that budget; do not overrun it.
9. Set "sourceAnchor" on each scene to the anchor or phrase from the class it came from.

Return ONLY JSON matching this shape:
{"version":1,"subject":"...","topic":"...","nodeId":null,"archetype":"...","learningObjective":"...","totalSeconds":0,
 "scenes":[{"n":1,"seconds":8,"beat":"...","visual":{"primitive":"...","props":{},"motion":"..."},"narration":"...","onScreenText":["..."],"emphasis":["..."],"sourceAnchor":"..."}],
 "memoryAnchor":["..."],"recallFrame":{"prompt":"...","answer":"..."},
 "upscApplication":{"concept":"...","example":"...","answerUse":"...","pyqHint":"..."},"flags":["..."]}`;
}

export interface StoryboardInput {
  subject: Subject;
  topic: string;
  nodeId: string | null;
  body: string;
  anchors: string[];
  score: VisualizationScore;
}

/** Words a narrator actually speaks per second. */
const PACE = 2.4;
/** Silent by design — the recall beat only works without a voice over it. */
const SILENT = new Set(["RECALL_FRAME", "MEMORY_ANCHOR"]);

/**
 * Re-derive each scene's duration from its narration length.
 * The model is poor at this arithmetic and consistently under-times dense
 * narration; computing it removes an entire class of QA failure instead of
 * asking the prompt to be careful.
 */
export function fitTimings(sb: Storyboard): Storyboard {
  for (const s of sb.scenes ?? []) {
    if (SILENT.has(s.visual?.primitive)) { s.seconds = Math.max(6, s.seconds || 8); continue; }
    const words = (s.narration ?? "").trim().split(/\s+/).filter(Boolean).length;
    s.seconds = Math.max(4, Math.ceil(words / PACE));
  }
  sb.totalSeconds = sb.scenes?.reduce((t, s) => t + s.seconds, 0) ?? 0;
  return sb;
}

export async function generateStoryboard(input: StoryboardInput): Promise<Storyboard> {
  const env = DURATION[input.score.archetype];
  /* One scene per ~18s of runtime. Without a budget the model tries to cover
     the whole class and produces a 20-scene board that cannot fit any envelope. */
  const sceneBudget = Math.min(14, Math.max(8, Math.round(env.max / 18)));
  const user = `SUBJECT: ${input.subject}
TOPIC: ${input.topic}
ARCHETYPE: ${input.score.archetype}
DURATION ENVELOPE: ${env.min}-${env.max} seconds
SCENE BUDGET: ${sceneBudget} scenes maximum, including the RECALL_FRAME and MEMORY_ANCHOR
WHY THIS IS BEING VISUALISED: ${input.score.reasons.join(" · ")}

ANCHORS (each is one already-curated idea — treat them as candidate scene beats):
${input.anchors.map((a, i) => `${i + 1}. ${a}`).join("\n")}

CLASS SUMMARY (the ONLY permitted source of facts):
"""
${input.body}
"""`;

  const sb = await generateJson<Storyboard>(system(input.subject), user, 16384);
  sb.subject = input.subject;
  sb.topic = input.topic;
  sb.nodeId = input.nodeId;
  sb.archetype = input.score.archetype;
  return fitTimings(sb);
}

/** Structural QA. Returns problems; empty array means the board is renderable. */
export function validateStoryboard(sb: Storyboard, score: VisualizationScore): string[] {
  const problems: string[] = [];
  const allowed = new Set<string>(PRIMITIVES);
  const env = DURATION[score.archetype];

  if (!sb.scenes?.length) problems.push("no scenes");
  sb.scenes?.forEach((s) => {
    const silent = SILENT.has(s.visual?.primitive);
    if (!allowed.has(s.visual?.primitive)) problems.push(`scene ${s.n}: unknown primitive "${s.visual?.primitive}"`);
    // RECALL_FRAME and MEMORY_ANCHOR are silent by design — the recall beat
    // only works if nothing is talking over it. Not a defect.
    if (!silent && !s.narration?.trim()) problems.push(`scene ${s.n}: empty narration`);
    if (!s.beat?.trim()) problems.push(`scene ${s.n}: no pedagogical beat`);
    if (!s.seconds || s.seconds < 3) problems.push(`scene ${s.n}: implausible duration ${s.seconds}s`);
    const words = (s.narration ?? "").trim().split(/\s+/).filter(Boolean).length;
    const pace = words / Math.max(1, s.seconds);
    if (!silent && pace > 3.0) problems.push(`scene ${s.n}: narration too fast (${pace.toFixed(1)} w/s over ${s.seconds}s)`);
    (s.onScreenText ?? []).forEach((t) => {
      if (t.split(/\s+/).length > 6) problems.push(`scene ${s.n}: on-screen text is a sentence — "${t.slice(0, 40)}…"`);
    });
  });

  const kinds = sb.scenes?.map((s) => s.visual?.primitive) ?? [];
  if (!kinds.includes("MEMORY_ANCHOR")) problems.push("missing MEMORY_ANCHOR scene");
  if (!kinds.includes("RECALL_FRAME")) problems.push("missing RECALL_FRAME scene");
  if (sb.totalSeconds < env.min || sb.totalSeconds > env.max) {
    problems.push(`total ${sb.totalSeconds}s outside ${score.archetype} envelope ${env.min}-${env.max}s`);
  }
  if (!sb.memoryAnchor?.length) problems.push("no memory anchor chain");
  return problems;
}
