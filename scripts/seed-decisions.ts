/* Seed the Decision Journal (COS M4) with the three decisions already made.
   Idempotent — skips titles that exist. Run: npx tsx scripts/seed-decisions.ts */
import { readFileSync } from "fs";
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* */ }
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const USER = "demo-user";

const DECISIONS = [
  {
    decidedAt: new Date("2026-07-03"),
    title: "Optional subject: PSIR",
    decision: "Political Science & International Relations as the optional (Papers VI–VII, 500 marks).",
    reason: "Interest alignment + broadest cross-stage footprint: GS-II & IR, Prelims polity, Essay themes, Interview edge.",
    evidence: "Data-backed comparison on /optional (sealed): 530 decoded optional PYQs; syllabus-overlap totals PSIR 29/40 vs PubAd 27 vs Sociology 25; PYQ themes matched subject expectations.",
    alternatives: "Sociology (analysis winner on pure 1-year ROI: smallest syllabus, Essay engine, GS-I overlap). Public Administration (GS-II/GS-IV overlap but stingy recent marking).",
    expectedOutcome: "Deep synergy with GS-II study already underway; optional prep doubles as GS/Essay/Interview prep; syllabus completable by Feb 2027 via the StudyIQ schedule.",
    reviewAt: new Date("2026-10-01"),
  },
  {
    decidedAt: new Date("2026-07-04"),
    title: "PSIR coaching: StudyIQ July 2026 batch",
    decision: "StudyIQ live PSIR batch (from 8 Jul 2026, faculty Shashank Tyagi) as the PSIR class source; timetable integrated into the Sprint Board.",
    reason: "Live classes 6 days/week with a published topic-level timetable + 12-test series that the platform can schedule against. Spotlight Academy remains available; primary-source policy deliberately deferred.",
    evidence: "Official timetable PDF ingested → src/lib/psir-schedule.ts (40 topic blocks + 12 tests).",
    alternatives: "Spotlight Academy as PSIR source; self-study-only PSIR.",
    expectedOutcome: "Class-sync tickets keep optional on schedule without manual planning; test series provides real answer-writing evidence from Aug 2026.",
    reviewAt: new Date("2026-09-15"),
  },
  {
    decidedAt: new Date("2026-07-02"),
    title: "Operating system: weekly sprints + tickets, process-only metrics",
    decision: "Run the entire preparation as weekly sprints of typed tickets on the platform; outcome metrics quarantined to the quarterly Direction Room (Outcome Shield).",
    reason: "Evidence from own life: −45 kg achieved through weekly-goal focus, not end-goal focus. Rank obsession measurably harms execution.",
    evidence: "IAS OS PRD Phase 1 (docs/IAS_OS_PRD_Phase1.md) + Program Charter; Sprint Board live since 3 Jul 2026.",
    alternatives: "Traditional yearly timetable; daily to-do lists; coaching-driven planning only.",
    expectedOutcome: "Sprint completion % becomes the only score that matters weekly; consistency compounds to Prelims without countdown anxiety.",
    reviewAt: new Date("2026-08-30"),
  },
];

async function main() {
  const user = await prisma.user.findFirst();
  const userId = user?.id ?? USER;
  let created = 0;
  for (const d of DECISIONS) {
    const exists = await prisma.decisionRecord.findFirst({ where: { userId, title: d.title } });
    if (exists) { console.log(`· exists: ${d.title}`); continue; }
    await prisma.decisionRecord.create({ data: { userId, ...d } });
    created++;
    console.log(`✓ seeded: ${d.title}`);
  }
  console.log(`Done — ${created} created.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
