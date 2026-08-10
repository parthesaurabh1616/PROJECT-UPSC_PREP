/* Deterministic media-selector fixtures. No LLM, no TTS, no network.
   Run: npx tsx scripts/media-fixtures.ts

   Half these subjects (Polity, Economy, Environment, History) have never
   been through the engine. If the selector reasons from concept signals
   rather than subject, it should handle them with no new code. */
import { selectMedium, extractSignals, detectArchetypes, Medium, Objective } from "../src/lib/visual/media";

interface Fixture {
  name: string;
  subject: string;
  objective: Objective;
  text: string;
  /** Any of these is a pass — several media can be defensible. */
  accept: Medium[];
}

const F: Fixture[] = [
  // ── Geography ──
  { name: "Plate tectonics", subject: "GEOGRAPHY", objective: "TRACE_PROCESS", accept: ["PROCESS_ANIMATION", "CROSS_SECTION"],
    text: "Two plates move toward each other. The denser oceanic plate bends downward and sinks beneath the continental plate. This sinking drives magma upward, which causes volcanoes and earthquakes at the boundary. The process forms deep trenches." },
  { name: "Coriolis force", subject: "GEOGRAPHY", objective: "TRACE_PROCESS", accept: ["PROCESS_ANIMATION", "GLOBE", "ANIMATED_MAP"],
    text: "Air moves from high pressure toward low pressure. Because the Earth rotates, the moving air appears to deflect to the right in the northern hemisphere. The rotation does not create the wind; it changes its apparent direction as it flows across latitudes." },
  { name: "Ocean currents (locate)", subject: "GEOGRAPHY", objective: "LOCATE", accept: ["MAP", "ANIMATED_MAP", "GLOBE"],
    text: "Warm and cold currents flow along the coasts of continents. The Benguela current runs north along the south-west African coast; the Peru current flows along the western margin of South America near the equator and the tropic." },
  { name: "Continental shelf (structure)", subject: "GEOGRAPHY", objective: "UNDERSTAND_STRUCTURE", accept: ["CROSS_SECTION", "STATIC_DIAGRAM", "ANIMATED_DIAGRAM"],
    text: "The ocean floor consists of layers. Below the surface lies the continental shelf, then the slope at greater depth, then the rise, and finally the abyssal plain. Each layer sits at a characteristic depth and gradient in vertical profile." },

  // ── PSIR ──
  { name: "Hobbes state of nature", subject: "PSIR", objective: "UNDERSTAND_INTERACTION", accept: ["CHARACTER_SCENE", "CONCEPT_GRAPH"],
    text: "Every person fears every other person. Nobody can trust anyone to keep an agreement, so each actor arms against the others. This mutual fear produces conflict. To escape it they agree to obey a common authority, and consent to a contract that commands all of them." },
  { name: "Sovereignty", subject: "PSIR", objective: "UNDERSTAND_STRUCTURE", accept: ["ANIMATED_DIAGRAM", "CONCEPT_GRAPH", "STATIC_DIAGRAM"],
    text: "The state has a hierarchy of organs. Within its territory the sovereign is the highest level; no other body or chamber stands above it. The constitution assigns the branches their powers, and the structure consists of legislature, executive and judiciary." },
  { name: "Realism vs Liberalism", subject: "PSIR", objective: "COMPARE", accept: ["COMPARISON"],
    text: "Realism differs from liberalism. Unlike liberalism, realism treats the state as the only actor. Compared with realism, liberalism emphasises institutions. The contrast between the two rivals is the core distinction, whereas constructivism differs from both." },

  // ── Polity (never seen by the engine) ──
  { name: "Constitutional amendment", subject: "POLITY", objective: "UNDERSTAND_STRUCTURE", accept: ["ANIMATED_DIAGRAM", "CONCEPT_GRAPH", "STATIC_DIAGRAM"],
    text: "A bill is introduced in Parliament. The structure consists of two houses; each chamber must pass it by the required majority. The constitution divides powers between the union and state levels, and the branches of government check each other in a hierarchy." },

  // ── Economy (never seen) ──
  { name: "Repo rate transmission", subject: "ECONOMY", objective: "UNDERSTAND_CAUSALITY", accept: ["CONCEPT_GRAPH", "PROCESS_ANIMATION"],
    text: "The central bank raises the repo rate. Because borrowing becomes costlier, banks raise loan rates. Therefore credit demand falls, which causes consumption to decline, and hence inflation eases over time." },
  { name: "Inflation data", subject: "ECONOMY", objective: "IDENTIFY", accept: ["CHART", "COMPARISON", "STATIC_DIAGRAM"],
    text: "Inflation rose to 6.2 percent from 4.8 percent. The growth rate of GDP fell by 1.4 percent, and the fiscal deficit widened to 5.9 percent of GDP. The index shows a ratio decline of 12 percent year on year." },

  // ── Environment (never seen) ──
  { name: "Eutrophication", subject: "ENVIRONMENT", objective: "TRACE_PROCESS", accept: ["PROCESS_ANIMATION", "CONCEPT_GRAPH"],
    text: "Fertilizer runoff flows into the lake. Because nutrients accumulate, algae spread rapidly across the surface. The algal bloom then decomposes, which causes oxygen to fall, and therefore fish die. The cycle repeats each season in a feedback loop." },

  // ── History (never seen) ──
  { name: "French Revolution", subject: "HISTORY", objective: "UNDERSTAND_CHANGE", accept: ["TIMELINE", "ANIMATED_MAP", "CONCEPT_GRAPH"],
    text: "In 1789 the estates met; by 1791 the constitution was drafted, and in 1793 the monarchy ended. The decade that followed reshaped Europe. Each phase 1 through phase 3 produced consequences that caused the next stage." },

  // ── Definitional: must NOT manufacture animation ──
  { name: "Simple definition", subject: "GENERAL", objective: "DEFINE", accept: ["TEXT", "STATIC_DIAGRAM"],
    text: "A quorum means the minimum number of members required to be present. It is called a quorum. The term refers to the threshold below which business cannot be conducted." },
];

let pass = 0;
console.log("\nMEDIA SELECTOR FIXTURES — deterministic, zero API calls");
console.log("─".repeat(104));
console.log(`  ${"CONCEPT".padEnd(28)}${"OBJECTIVE".padEnd(24)}${"CHOSEN".padEnd(20)}${"CONF".padEnd(7)}ARCHETYPES`);
console.log("─".repeat(104));

for (const f of F) {
  const d = selectMedium(f.text, f.objective, f.subject);
  const ok = f.accept.includes(d.medium);
  if (ok) pass++;
  console.log(
    `${ok ? "  ✓ " : "  ✗ "}${f.name.padEnd(26)}${f.objective.padEnd(24)}${d.medium.padEnd(20)}${String(d.confidence).padEnd(7)}${d.archetypes.slice(0, 3).join("+")}`
  );
  if (!ok) {
    console.log(`      expected one of: ${f.accept.join(", ")}`);
    console.log(`      signals: ${JSON.stringify(extractSignals(f.text))}`);
    console.log(`      reason : ${d.reason}`);
  }
}

console.log("─".repeat(104));
console.log(`  ${pass}/${F.length} fixtures pass\n`);

// One worked example, to show the decision is explainable rather than opaque.
const demo = F[0];
const d = selectMedium(demo.text, demo.objective, demo.subject);
console.log(`EXPLAINABILITY — ${demo.name}`);
console.log(`  MEDIA            ${d.medium}   (primitive: ${d.primitive ?? "NOT YET BUILT"})`);
console.log(`  WHY              ${d.reason}`);
console.log(`  CONFIDENCE       ${d.confidence}`);
console.log(`  ALTERNATIVE      ${d.alternative ?? "—"}`);
console.log(`  REJECTED BECAUSE ${d.rejectedBecause ?? "—"}`);
console.log(`  ARCHETYPES       ${detectArchetypes(extractSignals(demo.text)).join(", ")}\n`);

process.exit(pass === F.length ? 0 : 1);
