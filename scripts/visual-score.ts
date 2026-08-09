/* Score every completed class against the visualization rubric.
   Run: npx tsx scripts/visual-score.ts
   This is the gate that stops the engine generating video for topics
   that a paragraph already teaches perfectly well. */
import { PrismaClient } from "@prisma/client";
import { scoreTopic } from "../src/lib/visual/scoring";
import type { Subject } from "../src/lib/visual/types";

const prisma = new PrismaClient();

const subjectOf = (s: string): Subject => (s.includes("PSIR") ? "PSIR" : "GEOGRAPHY");

(async () => {
  const rows = await prisma.classSummary.findMany({ orderBy: { day: "asc" } });
  const scored = rows.map((r) => ({
    day: r.day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    topic: r.topic,
    // scoreTopic already returns `subject` — don't set it twice.
    ...scoreTopic({ subject: subjectOf(r.subject), topic: r.topic, body: r.body, anchors: r.anchors }),
  }));

  for (const subject of ["GEOGRAPHY", "PSIR"] as const) {
    const list = scored.filter((s) => s.subject === subject).sort((a, b) => b.total - a.total);
    console.log(`\n${"═".repeat(96)}\n  ${subject}  —  ${list.length} completed classes\n${"═".repeat(96)}`);
    console.log(`  ${"SCORE".padEnd(6)}${"TIER".padEnd(22)}${"PRI".padEnd(5)}${"ARCHETYPE".padEnd(20)}TOPIC`);
    for (const s of list) {
      console.log(`  ${String(s.total).padEnd(6)}${s.tier.padEnd(22)}${s.priority.padEnd(5)}${s.archetype.padEnd(20)}${s.topic.slice(0, 46)}`);
    }
    const p0 = list.filter((s) => s.priority === "P0").length;
    const p1 = list.filter((s) => s.priority === "P1").length;
    console.log(`  → P0: ${p0}   P1: ${p1}   P2+: ${list.length - p0 - p1}`);
  }

  const top = scored.sort((a, b) => b.total - a.total)[0];
  console.log(`\n  Highest overall: ${top.topic} (${top.total})`);
  console.log(`  Why: ${top.reasons.join(" · ")}\n`);
  await prisma.$disconnect();
})();
