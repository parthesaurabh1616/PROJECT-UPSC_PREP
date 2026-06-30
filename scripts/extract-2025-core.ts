/* Extract 2025 GS-I..IV + Essay (mains) + Prelims GS-I & CSAT so the
   2025 cross-paper alignment can be computed. Run: npx tsx scripts/extract-2025-core.ts */
import { readFileSync } from "fs";
import fs from "fs";
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* */ }
import { PrismaClient } from "@prisma/client";
import { extractPyqQuestions } from "../src/lib/ai";
const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const force = process.argv.includes("--force");
  const papers = await prisma.pyqPaper.findMany({
    where: { year: 2025, paperCode: { in: ["GS-I", "GS-II", "GS-III", "GS-IV", "ESSAY", "CSAT"] } },
    orderBy: [{ stage: "asc" }, { paperCode: "asc" }],
  });
  console.log(`${papers.length} target papers.`);
  for (const p of papers) {
    const tag = `${p.stage} ${p.paperCode}`;
    if (p.extractedAt && p.questionCount > 0 && !force) { console.log(`  · skip ${tag} (${p.questionCount} cached)`); continue; }
    if (!fs.existsSync(p.pdfPath)) { console.log(`  ✗ ${tag} PDF missing`); continue; }
    try {
      const ex = await extractPyqQuestions(p.pdfPath, p.examCode, p.stage, p.paperName);
      if (!ex.length) { console.log(`  ✗ ${tag} 0 Q`); continue; }
      await prisma.$transaction(async (tx) => {
        await tx.pyqQuestion.deleteMany({ where: { paperId: p.id } });
        await tx.pyqQuestion.createMany({ data: ex.map((q) => ({ paperId: p.id, number: q.number, text: q.text, marks: q.marks, topic: q.topic || null, subtopic: q.subtopic || null, gsMapping: q.gsMapping, keywords: q.keywords })) });
        await tx.pyqPaper.update({ where: { id: p.id }, data: { questionCount: ex.length, extractedAt: new Date() } });
      });
      console.log(`  ✓ ${tag} — ${ex.length} questions`);
    } catch (e) { console.log(`  ✗ ${tag} — ${(e instanceof Error ? e.message : String(e)).slice(0, 110)}`); }
    await sleep(4000);
  }
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
