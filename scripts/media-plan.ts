/* Media plan for the real saved boards. Deterministic — no LLM, no TTS.
   Run: npx tsx scripts/media-plan.ts */
import fs from "fs";
import path from "path";
import { buildMediaPlan } from "../src/lib/visual/media";
import { fromClassSummary } from "../src/lib/visual/learning-object";
import { resolveSubject } from "../src/lib/visual/subjects";

const dir = path.join(process.cwd(), "storyboards");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && !x.endsWith(".lock.json"))) {
  const b = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const sb = b.storyboard;
  const lo = fromClassSummary({
    id: f.replace(/\.json$/, ""), subject: sb.subject, nodeId: sb.nodeId, topic: sb.topic,
    body: sb.teachingPlan?.simpleExplanation ?? sb.scenes.map((s: any) => s.narration).join(" "),
    anchors: sb.memoryAnchor ?? [],
  }, resolveSubject(sb.subject).id);

  const plan = buildMediaPlan(lo);
  console.log(`\n${"═".repeat(94)}\n  ${plan.topic}\n${"═".repeat(94)}`);
  console.log(`  archetypes : ${plan.archetypes.join(", ")}`);
  console.log(`  strategy   : ${plan.overallStrategy}  (confidence ${plan.confidence})`);
  console.log(`  signals    : ${Object.entries(plan.signals).filter(([, v]) => v >= 5).map(([k, v]) => `${k} ${v}`).join(" · ") || "none ≥5"}`);
  for (const s of plan.scenes) {
    console.log(`   ${s.objective.padEnd(24)}→ ${s.medium.padEnd(20)}${(s.primitive ?? "NEEDS NEW PRIMITIVE").padEnd(22)}~${s.estimatedSeconds}s`);
  }
}
console.log();
