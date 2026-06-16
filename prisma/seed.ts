/* ════════════════════════════════════════════════════════════
   Civil Services Core Engine — exam seed
   Seeds UPSC + MPSC as configurable exams. Re-runnable (upsert).
   Run:  npx prisma db seed   (or npx tsx prisma/seed.ts)
   ════════════════════════════════════════════════════════════ */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Exam definitions ──────────────────────────────────────────
const EXAMS = [
  {
    code: "UPSC",
    name: "UPSC Civil Services Examination",
    shortName: "UPSC CSE",
    authority: "Union Public Service Commission",
    languages: ["en"],
    accentColor: "accent",
    sortOrder: 0,
    config: {
      negativeMarking: 1 / 3,
      csatQualifyingPct: 33,
      interviewMarks: 275,
      mainsMeritMarks: 1750,
    },
    stages: [
      {
        type: "prelims", name: "Preliminary Examination", totalMarks: 400, sortOrder: 0,
        papers: [
          { code: "GS-I", name: "General Studies I", marks: 200, durationMin: 120, qualifying: false, type: "objective" },
          { code: "CSAT", name: "CSAT (General Studies II)", marks: 200, durationMin: 120, qualifying: true, type: "objective" },
        ],
      },
      {
        type: "mains", name: "Main Examination", totalMarks: 1750, sortOrder: 1,
        papers: [
          { code: "LANG-A", name: "Indian Language", marks: 300, durationMin: 180, qualifying: true, type: "descriptive" },
          { code: "LANG-B", name: "English", marks: 300, durationMin: 180, qualifying: true, type: "descriptive" },
          { code: "ESSAY", name: "Essay", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-I", name: "General Studies I", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-II", name: "General Studies II", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-III", name: "General Studies III", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-IV", name: "General Studies IV (Ethics)", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "OPT-I", name: "Optional Paper I", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "OPT-II", name: "Optional Paper II", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
        ],
      },
      {
        type: "interview", name: "Personality Test", totalMarks: 275, sortOrder: 2,
        papers: [{ code: "INT", name: "Personality Test", marks: 275, durationMin: 30, qualifying: false, type: "interview" }],
      },
    ],
  },
  {
    code: "MPSC",
    name: "MPSC Rajyaseva (Maharashtra State Services)",
    shortName: "MPSC Rajyaseva",
    authority: "Maharashtra Public Service Commission",
    languages: ["en", "mr"],
    accentColor: "gold",
    sortOrder: 1,
    config: {
      negativeMarking: 1 / 4,
      csatQualifyingPct: 33,
      mainsQualifyingGen: 45,
      mainsQualifyingReserved: 40,
      // NOTE: MPSC switched to UPSC-style descriptive Mains (in effect 2025 cycle).
      patternNote: "Descriptive Mains, 9 papers, ~1750 merit marks",
    },
    stages: [
      {
        type: "prelims", name: "Preliminary Examination", totalMarks: 400, sortOrder: 0,
        papers: [
          { code: "GS-I", name: "General Studies I", marks: 200, durationMin: 120, qualifying: false, type: "objective" },
          { code: "CSAT", name: "CSAT (General Studies II)", marks: 200, durationMin: 120, qualifying: true, type: "objective" },
        ],
      },
      {
        type: "mains", name: "Main Examination", totalMarks: 1750, sortOrder: 1,
        papers: [
          { code: "MARATHI", name: "Marathi", marks: 300, durationMin: 180, qualifying: true, type: "descriptive" },
          { code: "ENGLISH", name: "English", marks: 300, durationMin: 180, qualifying: true, type: "descriptive" },
          { code: "ESSAY", name: "Essay", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-I", name: "General Studies I", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-II", name: "General Studies II", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-III", name: "General Studies III", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "GS-IV", name: "General Studies IV (Ethics)", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "OPT-I", name: "Optional Paper I", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
          { code: "OPT-II", name: "Optional Paper II", marks: 250, durationMin: 180, qualifying: false, type: "descriptive" },
        ],
      },
      {
        type: "interview", name: "Interview", totalMarks: 275, sortOrder: 2,
        papers: [{ code: "INT", name: "Interview", marks: 275, durationMin: 30, qualifying: false, type: "interview" }],
      },
    ],
  },
] as const;

// ── Top-level Mains syllabus spine (shared GS papers) ─────────
// Each entry: [code, title, paperCode, titleMr?]
const SHARED_GS: [string, string, string][] = [
  ["GS1.HISTORY", "History & Indian Heritage", "GS-I"],
  ["GS1.GEOGRAPHY", "Geography", "GS-I"],
  ["GS1.SOCIETY", "Indian Society", "GS-I"],
  ["GS2.POLITY", "Polity & Constitution", "GS-II"],
  ["GS2.GOVERNANCE", "Governance", "GS-II"],
  ["GS2.IR", "International Relations", "GS-II"],
  ["GS3.ECONOMY", "Economy", "GS-III"],
  ["GS3.ENVIRONMENT", "Environment & Ecology", "GS-III"],
  ["GS3.SCITECH", "Science & Technology", "GS-III"],
  ["GS3.SECURITY", "Internal Security", "GS-III"],
  ["GS4.ETHICS", "Ethics, Integrity & Aptitude", "GS-IV"],
];

// ── Maharashtra subtree (MPSC only) ───────────────────────────
const MAHA_NODES: [string, string, string, string][] = [
  // [code, title, paperCode, titleMr]
  ["MH.HISTORY", "Maharashtra History", "GS-I", "महाराष्ट्राचा इतिहास"],
  ["MH.GEOGRAPHY", "Maharashtra Geography", "GS-I", "महाराष्ट्राचा भूगोल"],
  ["MH.POLITY", "Maharashtra Polity & Administration", "GS-II", "महाराष्ट्र राज्यव्यवस्था व प्रशासन"],
  ["MH.ECONOMY", "Maharashtra Economy", "GS-III", "महाराष्ट्राची अर्थव्यवस्था"],
  ["MH.SCHEMES", "Maharashtra Schemes", "GS-II", "महाराष्ट्र शासन योजना"],
  ["MH.CULTURE", "Maharashtra Culture & Society", "GS-I", "महाराष्ट्राची संस्कृती व समाज"],
  ["MH.CURRENT", "Maharashtra Current Affairs", "GS-II", "महाराष्ट्र चालू घडामोडी"],
];

async function seedExam(def: (typeof EXAMS)[number]) {
  const exam = await prisma.exam.upsert({
    where: { code: def.code },
    update: {
      name: def.name, shortName: def.shortName, authority: def.authority,
      languages: [...def.languages], accentColor: def.accentColor,
      sortOrder: def.sortOrder, config: def.config,
    },
    create: {
      code: def.code, name: def.name, shortName: def.shortName, authority: def.authority,
      languages: [...def.languages], accentColor: def.accentColor,
      sortOrder: def.sortOrder, config: def.config,
    },
  });

  // Stages
  for (const s of def.stages) {
    await prisma.examStage.upsert({
      where: { examId_type: { examId: exam.id, type: s.type } },
      update: { name: s.name, totalMarks: s.totalMarks, papers: s.papers as object, sortOrder: s.sortOrder },
      create: { examId: exam.id, type: s.type, name: s.name, totalMarks: s.totalMarks, papers: s.papers as object, sortOrder: s.sortOrder },
    });
  }

  // Shared GS syllabus nodes
  let order = 0;
  for (const [code, title, paper] of SHARED_GS) {
    await prisma.syllabusNode.upsert({
      where: { examId_code: { examId: exam.id, code } },
      update: { title, paperCode: paper, stage: "mains", sortOrder: order },
      create: { examId: exam.id, code, title, paperCode: paper, stage: "mains", sortOrder: order, path: code.toLowerCase() },
    });
    order++;
  }

  // Maharashtra subtree (MPSC only)
  if (def.code === "MPSC") {
    for (const [code, title, paper, titleMr] of MAHA_NODES) {
      await prisma.syllabusNode.upsert({
        where: { examId_code: { examId: exam.id, code } },
        update: { title, titleMr, paperCode: paper, stage: "mains", sortOrder: order },
        create: { examId: exam.id, code, title, titleMr, paperCode: paper, stage: "mains", sortOrder: order, path: code.toLowerCase() },
      });
      order++;
    }
  }

  const nodeCount = await prisma.syllabusNode.count({ where: { examId: exam.id } });
  console.log(`✓ ${def.code}: ${def.stages.length} stages, ${nodeCount} syllabus nodes`);
}

async function main() {
  for (const def of EXAMS) await seedExam(def);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
