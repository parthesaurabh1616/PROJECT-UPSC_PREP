/* ════════════════════════════════════════════════════════════
   PYQ scan / ingestion — past papers → normalized PyqPaper rows.
   Decodes stage / year / paper from reliable filename + folder
   codes (UPSC official QP_CSM naming). Questions are extracted
   later, on-demand, by Gemini reading the PDF.

   Run:  npx tsx scripts/pyq-scan.ts   (or npm run pyq:scan)
   ════════════════════════════════════════════════════════════ */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const ROOT = "C:\\Users\\saura\\OneDrive\\Desktop\\UPSC PREP\\PYQ'S";

// ── Decode the Mains paper from a UPSC filename ───────────────
function decodeMainsPaper(file: string): { code: string; name: string } | null {
  const f = file.toUpperCase();
  if (f.includes("ESSAY")) return { code: "ESSAY", name: "Essay" };
  if (f.includes("GENSTUD_I_") || f.includes("GENSTUD_I.") || /GEN.?STUD.?_?I[_\.]/.test(f) && !f.includes("II") && !f.includes("III") && !f.includes("IV")) return { code: "GS-I", name: "General Studies I" };
  if (f.includes("GENSTUD_IV")) return { code: "GS-IV", name: "General Studies IV (Ethics)" };
  if (f.includes("GENSTUD_III")) return { code: "GS-III", name: "General Studies III" };
  if (f.includes("GENSTUD_II")) return { code: "GS-II", name: "General Studies II" };
  if (f.includes("GENSTUD_I")) return { code: "GS-I", name: "General Studies I" };
  if (f.includes("ENG_COMP")) return { code: "ENGLISH", name: "English (Qualifying)" };
  if (f.includes("HN_COMP")) return { code: "HINDI", name: "Hindi (Qualifying)" };
  if (f.includes("MARA_COMP")) return { code: "MARATHI", name: "Marathi (Qualifying)" };
  if (f.includes("LITE") || f.includes("_LIT")) {
    const part = f.includes("P_II") || f.includes("PAPER-II") || f.includes("PAPER_II") ? "II" : "I";
    return { code: `LITERATURE-${part}`, name: `Literature Paper ${part}` };
  }
  if (f.includes("PAPER-I") || f.includes("PAPER_I") || f.includes("PAPER-II")) {
    const part = f.includes("PAPER-II") || f.includes("PAPER_II") ? "II" : "I";
    // optional subject name (best effort from filename)
    const m = file.match(/CSM-\d+-([A-Z-]+?)-PAPER/i);
    const subj = m ? m[1].replace(/-/g, " ").trim() : "Optional";
    return { code: `OPTIONAL-${part}`, name: `${titleCase(subj)} — Paper ${part}` };
  }
  return { code: "OTHER", name: titleCase(file.replace(/\.pdf$/i, "").replace(/[_-]/g, " ")) };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function main() {
  console.log("Wiping existing PYQ tables…");
  await prisma.pyqQuestion.deleteMany();
  await prisma.pyqPaper.deleteMany();

  let papers = 0;

  // ── MAINS: UPSC MAINS / MAINS YYYY / <16 paper PDFs> ─────────
  const mainsRoot = path.join(ROOT, "UPSC MAINS");
  if (fs.existsSync(mainsRoot)) {
    for (const yrDir of fs.readdirSync(mainsRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const year = parseInt((yrDir.name.match(/\d{4}/) ?? ["0"])[0], 10);
      if (!year) continue;
      const dir = path.join(mainsRoot, yrDir.name);
      for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        const dec = decodeMainsPaper(file);
        if (!dec) continue;
        const full = path.join(dir, file);
        await prisma.pyqPaper.upsert({
          where: { examCode_stage_year_paperCode: { examCode: "UPSC", stage: "mains", year, paperCode: dec.code } },
          update: { paperName: dec.name, pdfPath: full, sizeBytes: fs.statSync(full).size },
          create: { examCode: "UPSC", stage: "mains", year, paperCode: dec.code, paperName: dec.name, pdfPath: full, sizeBytes: fs.statSync(full).size },
        });
        papers++;
      }
    }
  }

  // ── PRELIMS: UPSC PRELIMS / <paper> / "UPSC GS - I 2016 PRELIMS.pdf" ─
  const prelimsRoot = path.join(ROOT, "UPSC PRELIMS");
  if (fs.existsSync(prelimsRoot)) {
    for (const paperDir of fs.readdirSync(prelimsRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const isCsat = /csat|ii/i.test(paperDir.name);
      const code = isCsat ? "CSAT" : "GS-I";
      const name = isCsat ? "CSAT (Paper II)" : "General Studies I";
      const dir = path.join(prelimsRoot, paperDir.name);
      for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        const year = parseInt((file.match(/\b(20\d{2})\b/) ?? ["0"])[0], 10);
        if (!year) continue;
        const full = path.join(dir, file);
        await prisma.pyqPaper.upsert({
          where: { examCode_stage_year_paperCode: { examCode: "UPSC", stage: "prelims", year, paperCode: code } },
          update: { paperName: name, pdfPath: full, sizeBytes: fs.statSync(full).size },
          create: { examCode: "UPSC", stage: "prelims", year, paperCode: code, paperName: name, pdfPath: full, sizeBytes: fs.statSync(full).size },
        });
        papers++;
      }
    }
  }

  console.log(`Done. ${papers} papers ingested.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
