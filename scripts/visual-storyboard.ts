/* Generate + validate storyboards for the vertical-slice topics.
   Run: npx tsx scripts/visual-storyboard.ts
   Writes storyboards/<slug>.json and prints a readable board for review. */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { scoreTopic } from "../src/lib/visual/scoring";
import { generateStoryboard, validateStoryboard } from "../src/lib/visual/storyboard";
import type { Subject } from "../src/lib/visual/types";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "storyboards");

/* The slice. Hobbes spans two classes (state of nature → contract, then
   sovereignty → liberty); they are one teaching unit, so they are merged
   into a single board rather than two half-arguments. */
const SLICE: { key: string; subject: Subject; match: string[]; title: string }[] = [
  {
    key: "geo-plate-tectonics",
    subject: "GEOGRAPHY",
    match: ["Plate Tectonics"],
    title: "Plate Tectonics — Boundaries & Convergence",
  },
  {
    key: "psir-hobbes",
    subject: "PSIR",
    match: ["Hobbes: human nature", "Hobbes: sovereignty"],
    title: "Hobbes — State of Nature to Leviathan",
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const rows = await prisma.classSummary.findMany({ orderBy: { day: "asc" } });

  for (const s of SLICE) {
    const cards = rows.filter((r) => s.match.some((m) => r.topic.includes(m)));
    if (!cards.length) { console.error(`!! no class found for ${s.key}`); continue; }

    const body = cards.map((c) => c.body).join("\n\n");
    const anchors = [...new Set(cards.flatMap((c) => c.anchors))];
    const score = scoreTopic({ subject: s.subject, topic: s.title, body, anchors });

    console.log(`\n${"═".repeat(92)}`);
    console.log(`  ${s.title}`);
    console.log(`  ${cards.length} class card(s) · ${body.length} chars · ${anchors.length} anchors`);
    console.log(`  SCORE ${score.total}  ${score.tier}  ${score.priority}  ${score.archetype}`);
    console.log(`  WHY: ${score.reasons.join(" · ")}`);
    console.log(`${"═".repeat(92)}`);

    const sb = await generateStoryboard({
      subject: s.subject, topic: s.title, nodeId: cards[0].nodeId, body, anchors, score,
    });
    const problems = validateStoryboard(sb, score);

    console.log(`\n  OBJECTIVE: ${sb.learningObjective}`);
    console.log(`  RUNTIME  : ${sb.totalSeconds}s across ${sb.scenes.length} scenes\n`);
    for (const sc of sb.scenes) {
      console.log(`  ── ${String(sc.n).padStart(2)} · ${sc.seconds}s · ${sc.visual.primitive}`);
      console.log(`     beat   : ${sc.beat}`);
      console.log(`     visual : ${JSON.stringify(sc.visual.props).slice(0, 150)}`);
      if (sc.visual.motion) console.log(`     motion : ${sc.visual.motion}`);
      console.log(`     says   : ${sc.narration}`);
      console.log(`     screen : ${(sc.onScreenText ?? []).join("  |  ")}`);
    }
    console.log(`\n  MEMORY ANCHOR : ${sb.memoryAnchor.join("  →  ")}`);
    console.log(`  RECALL        : ${sb.recallFrame?.prompt}`);
    console.log(`     answer     : ${sb.recallFrame?.answer}`);
    console.log(`  UPSC          : ${sb.upscApplication?.answerUse}`);
    if (sb.flags?.length) console.log(`  ⚠ FLAGS       : ${sb.flags.join(" | ")}`);
    console.log(problems.length ? `  ✗ QA FAILED   : ${problems.join(" | ")}` : `  ✓ QA PASSED`);

    fs.writeFileSync(path.join(OUT, `${s.key}.json`), JSON.stringify({ score, storyboard: sb, problems }, null, 2), "utf8");
  }
  await prisma.$disconnect();
})();
