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

// ── Extract a paper's roman numeral (I/II/III/IV), format-agnostic ─
//    Handles "GenStud_III", "PAPER-II", "PAPER I", "P_II", etc.
function romanPart(f: string): "I" | "II" | "III" | "IV" {
  const near = f.match(/(?:PAPER|GENSTUD|GEN[\s_-]*STUD|GENERAL[\s_-]*STUDIES|P)[\s_-]*(IV|III|II|I)(?![A-Z])/);
  if (near) return near[1] as "I" | "II" | "III" | "IV";
  const loose = f.match(/[\s_-](IV|III|II|I)(?=[\s_.-]|$)/);
  return (loose?.[1] as "I" | "II" | "III" | "IV") ?? "I";
}

/**
 * Decode the Mains paper from a UPSC filename — format-agnostic.
 * Works for the underscore codes (2016-2024, "QP_CSM_2024_GenStud_I")
 * AND the hyphenated 2025+ names ("GENERAL-STUDIES-PAPER I-QP-CSM-25").
 */
function decodeMainsPaper(file: string): { code: string; name: string } | null {
  const f = file.toUpperCase();
  const isGS = /GENSTUD|GEN[\s_-]*STUD|GENERAL[\s_-]*STUDIES/.test(f);
  const isLit = /LIT(ERATURE)?/.test(f) || /_LIT|P_II_LITE|P_I_LITE/.test(f);
  const isComp = /COMP(ULSORY)?|_COMP/.test(f);

  if (f.includes("ESSAY")) return { code: "ESSAY", name: "Essay" };

  if (isGS) {
    const r = romanPart(f);
    const names: Record<string, string> = { I: "General Studies I", II: "General Studies II", III: "General Studies III", IV: "General Studies IV (Ethics)" };
    return { code: `GS-${r}`, name: names[r] };
  }

  // Compulsory qualifying language papers (handle both "ENG_COMP" and "ENGLISH-COMPULSORY")
  if (isComp && !isLit) {
    if (/ENG/.test(f)) return { code: "ENGLISH", name: "English (Qualifying)" };
    if (/HINDI|HN_COMP|\bHN[\s_-]/.test(f)) return { code: "HINDI", name: "Hindi (Qualifying)" };
    if (/MARA/.test(f)) return { code: "MARATHI", name: "Marathi (Qualifying)" };
    return { code: "LANG", name: "Compulsory Language" };
  }

  // Literature (optional literature subjects)
  if (isLit) {
    const r = romanPart(f);
    return { code: `LITERATURE-${r}`, name: `Literature Paper ${r}` };
  }

  // Optional subject papers (e.g. "PUBLIC-ADMINISTRATION-PAPER-I")
  if (/PAPER[\s_-]*(IV|III|II|I)/.test(f)) {
    const r = romanPart(f);
    const m = file.match(/CSM-\d+-([A-Za-z][A-Za-z-]+?)-PAPER/i)        // QP-CSM-24-PUBLIC-ADMINISTRATION-PAPER-I
          ?? file.match(/^([A-Za-z][A-Za-z-]+?)-PAPER/i);                // PUBLIC-ADMINISTRATION-PAPER-I-QP-CSM-25
    const subj = m ? m[1].replace(/-/g, " ").trim() : "Optional";
    return { code: `OPTIONAL-${r}`, name: `${titleCase(subj)} — Paper ${r}` };
  }

  return { code: "OTHER", name: titleCase(file.replace(/\.pdf$/i, "").replace(/[_-]/g, " ")) };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function main() {
  // Non-destructive: upsert papers (preserves already-extracted questions on
  // matched rows), track which (stage,year,paperCode) we actually produced,
  // then prune only the rows we no longer produce (stale / mis-decoded).
  const seen = new Set<string>();
  const key = (stage: string, year: number, code: string) => `${stage}|${year}|${code}`;
  let papers = 0;

  const upsert = async (stage: "mains" | "prelims", year: number, code: string, name: string, full: string) => {
    await prisma.pyqPaper.upsert({
      where: { examCode_stage_year_paperCode: { examCode: "UPSC", stage, year, paperCode: code } },
      update: { paperName: name, pdfPath: full, sizeBytes: fs.statSync(full).size },
      create: { examCode: "UPSC", stage, year, paperCode: code, paperName: name, pdfPath: full, sizeBytes: fs.statSync(full).size },
    });
    seen.add(key(stage, year, code));
    papers++;
  };

  // ── MAINS: UPSC MAINS / MAINS YYYY / <paper PDFs> ────────────
  const mainsRoot = path.join(ROOT, "UPSC MAINS");
  if (fs.existsSync(mainsRoot)) {
    for (const yrDir of fs.readdirSync(mainsRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const year = parseInt((yrDir.name.match(/\d{4}/) ?? ["0"])[0], 10);
      if (!year) continue;
      const dir = path.join(mainsRoot, yrDir.name);
      for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        const dec = decodeMainsPaper(file);
        if (!dec || dec.code === "OTHER") continue; // skip undecodable junk
        await upsert("mains", year, dec.code, dec.name, path.join(dir, file));
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
        await upsert("prelims", year, code, name, path.join(dir, file));
      }
    }
  }

  // ── Prune rows we no longer produce (stale / previously mis-decoded).
  //    Papers WITH extracted questions are never pruned (safety).
  const all = await prisma.pyqPaper.findMany({ select: { id: true, stage: true, year: true, paperCode: true, questionCount: true } });
  const stale = all.filter((p) => !seen.has(key(p.stage, p.year, p.paperCode)) && p.questionCount === 0);
  if (stale.length) {
    await prisma.pyqPaper.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
    console.log(`Pruned ${stale.length} stale paper rows: ${stale.map((p) => `${p.stage} ${p.year} ${p.paperCode}`).join(", ")}`);
  }

  console.log(`Done. ${papers} papers ingested/updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
