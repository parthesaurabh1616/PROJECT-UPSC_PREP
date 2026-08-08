/* ════════════════════════════════════════════════════════════
   NCERT scan / ingestion engine
   Walks the raw NCERT PDF folder and builds a normalized
   Class → Subject → Book → Chapter database. Structure is derived
   from reliable NCERT filename codes; chapter titles are a
   best-effort PDF-text extraction with a clean fallback.
   Re-runnable (wipes + rebuilds the NCERT tables).

   Run:  npx tsx scripts/ncert-scan.ts
   ════════════════════════════════════════════════════════════ */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { libraryPath } from "../src/lib/library-root";

const prisma = new PrismaClient();
const ROOT = libraryPath("NCERT's");

// ── Subject normalization ─────────────────────────────────────
function normSubject(raw: string): string {
  const s = raw.toUpperCase().trim();
  if (s.includes("HIS") && s.includes("GEO")) return "Social Science";
  if (s.startsWith("POLITY") || s.includes("POLITICAL")) return "Political Science";
  if (s.startsWith("SCIENCE")) return "Science";
  if (s.startsWith("HISTORY")) return "History";
  if (s.startsWith("GEOGRAPHY")) return "Geography";
  if (s.startsWith("ECONOMICS")) return "Economics";
  return titleCase(raw);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// Clean a book/dir/file name into a presentable title.
function cleanTitle(raw: string): string {
  return titleCase(
    raw.replace(/\.pdf$/i, "")
       .replace(/\s*\[\d+\]\s*$/g, "")  // strip trailing [9]
       .replace(/_/g, " ")
       .replace(/\s+/g, " ")
       .trim(),
  );
}

// ── Decode an NCERT filename code → chapter info ───────────────
interface Decoded { kind: string; chapterNo: number | null; code: string | null; }
function decode(fileBase: string): Decoded {
  // NCERT code: 4 letters + part digit + (2 digits = chapter | 2 letters = matter)
  const m = fileBase.match(/^([a-z]{4}\d)(\d{2}|[a-z]{2})$/i);
  if (m) {
    const code = m[0];
    const suffix = m[2].toLowerCase();
    if (/^\d{2}$/.test(suffix)) return { kind: "chapter", chapterNo: parseInt(suffix, 10), code };
    const matter: Record<string, string> = {
      ps: "frontmatter", pr: "frontmatter", cc: "frontmatter", co: "frontmatter",
      cn: "frontmatter", in: "frontmatter", gl: "glossary", an: "answers",
    };
    return { kind: matter[suffix] ?? "other", chapterNo: null, code };
  }
  // Human-named file → treat as a chapter; pull a leading number if present.
  const numMatch = fileBase.match(/(?:chapter|ch|unit)?\s*(\d{1,2})/i);
  return { kind: "chapter", chapterNo: numMatch ? parseInt(numMatch[1], 10) : null, code: null };
}

const KIND_LABEL: Record<string, string> = {
  frontmatter: "Preface & Contents", glossary: "Glossary", answers: "Answers", other: "Supplementary",
};

// ── Best-effort title extraction from PDF page 1 ──────────────
async function extractTitle(pdfPath: string): Promise<string | null> {
  try {
    const mod: any = await import("pdf-parse");
    const buf = fs.readFileSync(pdfPath);
    let text = "";
    // Try v2 class API, then v1 function API.
    if (mod.PDFParse) {
      const p = new mod.PDFParse({ data: new Uint8Array(buf) });
      const r = await p.getText();
      text = r?.text ?? "";
    } else {
      const fn = mod.default ?? mod;
      const r = await fn(buf, { max: 1 });
      text = r?.text ?? "";
    }
    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    // Heuristic: first line that looks like a title (letters, 5-70 chars, not a page number/header).
    for (const l of lines.slice(0, 12)) {
      const clean = l.replace(/\s+/g, " ");
      if (clean.length >= 5 && clean.length <= 70 && /[a-zA-Z]{4,}/.test(clean)
          && !/^\d+$/.test(clean) && !/^(chapter|unit|reprint|rationalised|©|isbn)/i.test(clean)) {
        return titleCase(clean);
      }
    }
  } catch { /* fall back */ }
  return null;
}

// ── Walk: find "book directories" (dirs that directly hold PDFs) ─
function findBookDirs(dir: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const hasPdf = entries.some((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"));
  if (hasPdf) out.push(dir);
  for (const e of entries) if (e.isDirectory()) out.push(...findBookDirs(path.join(dir, e.name)));
  return out;
}

async function main() {
  console.log("Wiping existing NCERT tables…");
  await prisma.ncertChapter.deleteMany();
  await prisma.ncertBook.deleteMany();

  const classDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /class\s*\d+/i.test(e.name));

  let bookCount = 0, chapterCount = 0;

  for (const cls of classDirs) {
    const klass = parseInt(cls.name.match(/\d+/)![0], 10);
    const classPath = path.join(ROOT, cls.name);
    const subjectDirs = fs.readdirSync(classPath, { withFileTypes: true }).filter((e) => e.isDirectory());

    for (const subj of subjectDirs) {
      const subject = normSubject(subj.name);
      const subjPath = path.join(classPath, subj.name);
      const bookDirs = findBookDirs(subjPath);

      let bOrder = 0;
      for (const bookDir of bookDirs) {
        const pdfs = fs.readdirSync(bookDir, { withFileTypes: true })
          .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
          .map((e) => e.name).sort();
        if (!pdfs.length) continue;

        // Book title: subject-dir itself → subject (or single file's name); else dir name.
        const isSubjectDir = path.resolve(bookDir) === path.resolve(subjPath);
        let bookTitle: string;
        if (isSubjectDir) {
          bookTitle = pdfs.length === 1 ? cleanTitle(pdfs[0]) : subject;
        } else {
          bookTitle = cleanTitle(path.basename(bookDir));
        }

        const codePrefix = decode(pdfs[0].replace(/\.pdf$/i, "")).code?.slice(0, 5) ?? null;
        const book = await prisma.ncertBook.create({
          data: {
            klass, subject, title: bookTitle, code: codePrefix,
            coverStyle: Math.abs(hash(subject + bookTitle)) % 6, sortOrder: bOrder++,
          },
        });

        // Decode + order chapters: numbered chapters first (by number), then matter.
        const decoded = pdfs.map((name) => {
          const base = name.replace(/\.pdf$/i, "");
          const d = decode(base);
          const full = path.join(bookDir, name);
          const size = fs.statSync(full).size;
          return { name, base, ...d, pdfPath: full, size };
        });
        decoded.sort((a, b) => {
          const ak = a.kind === "chapter" ? 0 : a.kind === "frontmatter" ? -1 : 1;
          const bk = b.kind === "chapter" ? 0 : b.kind === "frontmatter" ? -1 : 1;
          if (ak !== bk) return ak - bk;
          return (a.chapterNo ?? 99) - (b.chapterNo ?? 99) || a.base.localeCompare(b.base);
        });

        let cOrder = 0, chaptersInBook = 0;
        for (const d of decoded) {
          let title: string;
          if (d.kind === "chapter") {
            const extracted = await extractTitle(d.pdfPath);
            title = extracted ?? (d.chapterNo ? `Chapter ${d.chapterNo}` : cleanTitle(d.base));
            chaptersInBook++;
          } else {
            title = KIND_LABEL[d.kind] ?? "Supplementary";
          }
          await prisma.ncertChapter.create({
            data: {
              bookId: book.id, order: cOrder++, code: d.code, title, kind: d.kind,
              chapterNo: d.chapterNo, pdfPath: d.pdfPath, sizeBytes: d.size,
            },
          });
          chapterCount++;
        }
        await prisma.ncertBook.update({ where: { id: book.id }, data: { chapterCount: chaptersInBook } });
        bookCount++;
        console.log(`  ✓ Class ${klass} · ${subject} · ${bookTitle} (${decoded.length} files)`);
      }
    }
  }
  console.log(`\nDone. ${bookCount} books, ${chapterCount} chapters.`);
}

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
