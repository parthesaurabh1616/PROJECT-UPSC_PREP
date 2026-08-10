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
import { validateTermOrdering, termOrderingRule } from "./pedagogy";

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

const TERM_ORDERING_RULE = termOrderingRule();

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

THE STANDARD: "explain it to a donkey and a child".
The CONTENT stays UPSC-level. The EXPLANATION is absolute-beginner level.
Simplify the LANGUAGE, never the mechanism. Removing a step to make it
shorter produces a wrong concept, which is worse than a hard one.

NON-NEGOTIABLE RULES
1. GROUND EVERYTHING in the supplied class summary. Never introduce a fact, date, figure, name or example that is not present in it. If a scene needs something absent, put a note in "flags" instead of inventing.
2. NEVER OPEN WITH JARGON. Scene 1 is a HOOK: a question, puzzle or everyday situation that makes the viewer curious. No "Welcome", no "Today we will learn", no "According to X".
3. SHOW → SAY → NAME → CONNECT. Show the thing happening; say in plain words what is happening; only THEN give the academic term; then say why it matters. The viewer must understand the idea BEFORE receiving its label.
4. ONE IDEA PER SCENE. One new concept, one new term, one visual state. If a scene carries two ideas, split it into two scenes.
5. NO HIDDEN STEPS. If understanding runs A → B → C, you must show B. Never state a cause and effect with the mechanism missing.
6. SPOKEN ENGLISH, NOT WRITTEN ENGLISH. Sentences of 8–18 words. Split long clauses. Use "Imagine…", "Why? Because…", "So what does that mean?", "Here is the key point." Contractions are fine. Read it aloud in your head — if you would not say it, rewrite it.
7. Narration explains what the visual MEANS; it never describes the picture. Bad: "Here we see two plates moving." Good: "One plate is heavier. So it bends down and slides underneath."
8. onScreenText is keywords/labels ONLY. Max 6 words per item, max 4 items per scene.
9. PACING: each scene carries at most 2 sentences and AT MOST 40 words. Short scenes are correct — a new visual state every 6–14 seconds is the target. Long narration must be SPLIT ACROSS SCENES, never parked on one static picture.
10. Include a short MINI-RECAP scene after every 3–4 new concepts ("So far: … , … , and … ").
11. Second-to-last scene is RECALL_FRAME (SILENT — narration ""), last scene is MEMORY_ANCHOR (also silent).
12. Include one UPSC_PANEL scene near the end: first the simple understanding, then how to express it in exam language.
13. SELECT, DO NOT COVER. Build ONE mental model. The notes remain available as text.
14. Set "sourceAnchor" on each scene to the anchor or phrase from the class it came from.

${TERM_ORDERING_RULE}

Also produce a teachingPlan. Write it first, in plain language. If the plan
does not read clearly, the video will not either.

Return ONLY JSON matching this shape:
{"version":2,"subject":"...","topic":"...","nodeId":null,"archetype":"...","learningObjective":"...",
 "teachingPlan":{"learningObjective":"...","priorKnowledgeRequired":["..."],"coreProblem":"...","coreConcept":"...","simpleExplanation":"...","technicalDefinition":"...","causalChain":["..."],"visualMetaphor":"...","memoryAnchor":"...","upscBridge":"..."},
 "totalSeconds":0,
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
  /* MANY SHORT SCENES, not few long ones. One scene per ~10s is what keeps a
     visual state from sitting static while narration runs on — the previous
     boards parked one comparison panel on screen for 31 seconds. Splitting is
     also what enforces "one idea per scene". */
  const sceneBudget = Math.min(34, Math.max(14, Math.round(env.max / 10)));
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

  /* 30-odd short scenes plus a teaching plan is a large JSON document; at
     16k the response was silently truncated mid-string. */
  const sb = await generateJson<Storyboard>(system(input.subject), user, 65536);
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
    // Cognitive load: a scene carrying more than ~40 words is two scenes.
    if (!silent && words > 46) problems.push(`scene ${s.n}: ${words} words — split it, one idea per scene`);
    // Written-English detector: very long sentences do not survive being spoken.
    const longest = Math.max(0, ...(s.narration ?? "").split(/[.?!]/).map((x) => x.trim().split(/\s+/).filter(Boolean).length));
    if (!silent && longest > 26) problems.push(`scene ${s.n}: a ${longest}-word sentence — split it into spoken-length sentences`);
    (s.onScreenText ?? []).forEach((t) => {
      if (t.split(/\s+/).length > 6) problems.push(`scene ${s.n}: on-screen text is a sentence — "${t.slice(0, 40)}…"`);
    });
  });

  /* The first line decides whether anyone keeps watching. Greetings and
     "today we will learn" spend the opening seconds saying nothing. */
  const opener = (sb.scenes?.[0]?.narration ?? "").trim().toLowerCase();
  // Punctuation-tolerant: "Today, we explore…" slipped past a stricter version.
  if (/^(welcome|hello|hi\b|today[\s,]+we|in this video|this video|let'?s (learn|look|explore)|let us (learn|explore)|we (will|are going to) (discuss|learn|explore)|we explore)/.test(opener)) {
    problems.push('scene 1: banned opener — open with a question, puzzle or everyday situation, not a greeting or a syllabus announcement');
  }

  const kinds = sb.scenes?.map((s) => s.visual?.primitive) ?? [];
  if (!kinds.includes("MEMORY_ANCHOR")) problems.push("missing MEMORY_ANCHOR scene");
  if (!kinds.includes("RECALL_FRAME")) problems.push("missing RECALL_FRAME scene");
  if (sb.totalSeconds < env.min || sb.totalSeconds > env.max) {
    problems.push(`total ${sb.totalSeconds}s outside ${score.archetype} envelope ${env.min}-${env.max}s`);
  }
  if (!sb.memoryAnchor?.length) problems.push("no memory anchor chain");

  // Terminology must arrive after the mechanism, never before it.
  for (const p of validateTermOrdering(sb)) problems.push(p.message);

  return problems;
}
