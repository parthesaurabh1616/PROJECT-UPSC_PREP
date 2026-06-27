/* ════════════════════════════════════════════════════════════
   Optional PYQ extraction — runs the Gemini decoder over the
   Sociology / PSIR / Public Administration optional papers so the
   optional-decision analysis is built on REAL extracted questions.

   Paced for the free tier (delay + the decoder's own 429 backoff).
   Idempotent: skips papers already extracted unless --force.

   Run: npx tsx scripts/extract-optionals.ts [--all-years] [--force]
   ════════════════════════════════════════════════════════════ */
import { readFileSync } from "fs";
import fs from "fs";
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env optional */ }

import { PrismaClient } from "@prisma/client";
import { extractPyqQuestions } from "../src/lib/ai";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GOOGLE_API_KEY) { console.error("GOOGLE_API_KEY missing."); process.exit(1); }
  const force = process.argv.includes("--force");
  const allYears = process.argv.includes("--all-years");
  const minYear = allYears ? 2016 : 2021;

  const papers = await prisma.pyqPaper.findMany({
    where: {
      year: { gte: minYear },
      OR: [
        { paperCode: { startsWith: "OPTIONAL-SOC" } },
        { paperCode: { startsWith: "OPTIONAL-PSIR" } },
        { paperCode: { startsWith: "OPTIONAL-PUBAD" } },
      ],
    },
    orderBy: [{ year: "desc" }, { paperCode: "asc" }],
  });

  console.log(`${papers.length} optional papers in scope (year >= ${minYear}).`);
  let ok = 0, skipped = 0, failed = 0, totalQ = 0;

  for (const p of papers) {
    const tag = `${p.year} ${p.paperCode}`;
    if (p.extractedAt && p.questionCount > 0 && !force) { skipped++; console.log(`  · skip ${tag} (${p.questionCount} Q cached)`); continue; }
    if (!fs.existsSync(p.pdfPath)) { failed++; console.log(`  ✗ ${tag} — PDF missing`); continue; }

    try {
      const extracted = await extractPyqQuestions(p.pdfPath, p.examCode, p.stage, p.paperName);
      if (extracted.length === 0) { failed++; console.log(`  ✗ ${tag} — 0 questions`); continue; }
      await prisma.$transaction(async (tx) => {
        await tx.pyqQuestion.deleteMany({ where: { paperId: p.id } });
        await tx.pyqQuestion.createMany({
          data: extracted.map((q) => ({
            paperId: p.id, number: q.number, text: q.text, marks: q.marks,
            topic: q.topic || null, subtopic: q.subtopic || null, gsMapping: q.gsMapping, keywords: q.keywords,
          })),
        });
        await tx.pyqPaper.update({ where: { id: p.id }, data: { questionCount: extracted.length, extractedAt: new Date() } });
      });
      ok++; totalQ += extracted.length;
      console.log(`  ✓ ${tag} — ${extracted.length} questions`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${tag} — ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
    }
    await sleep(4000); // pace for free-tier RPM
  }

  console.log(`\nDone. extracted ${ok} papers (${totalQ} questions) · skipped ${skipped} · failed ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
