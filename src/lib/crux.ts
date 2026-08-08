/* ════════════════════════════════════════════════════════════════
   Crux — the institute-notes shelf.

   StudyIQ hands out a CRUX before every class plus handwritten
   notes / board PPTs after it. The user drops those files into the
   Crux folder (subfolder = subject: "PSIR", "GS - Geography", …) and
   the platform lists them here — newest class first, searchable,
   viewable in the browser. Stateless by design: the folder IS the
   database, so nothing can drift out of sync.
   ════════════════════════════════════════════════════════════════ */
import fs from "fs";
import path from "path";
import { parseDayFromName } from "@/lib/ca-sources";
import { libraryPath } from "@/lib/library-root";

export const CRUX_ROOT = libraryPath("Crux");

const EXTS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain", ".md": "text/markdown",
};

export interface CruxFile {
  rel: string;        // path relative to CRUX_ROOT (the API file key)
  subject: string;    // subfolder name ("(root)" for loose files)
  name: string;
  ext: string;
  size: number;
  day: string | null; // ISO date parsed from the filename (else file mtime)
  mtime: string;
}

/** List every note in the Crux folder, newest class-day first. */
export function listCrux(): { subjects: { subject: string; files: CruxFile[] }[]; total: number; root: string } {
  const bySubject = new Map<string, CruxFile[]>();
  let total = 0;
  if (fs.existsSync(CRUX_ROOT)) {
    const walk = (dir: string, subject: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p, subject === "(root)" ? e.name : `${subject} / ${e.name}`); continue; }
        const ext = path.extname(e.name).toLowerCase();
        if (!(ext in EXTS) || e.name.toLowerCase() === "readme.txt") continue;
        let st: fs.Stats;
        try { st = fs.statSync(p); } catch { continue; }
        const day = parseDayFromName(e.name, st.mtime);
        const f: CruxFile = {
          rel: path.relative(CRUX_ROOT, p).split(path.sep).join("/"),
          subject, name: e.name, ext: ext.slice(1), size: st.size,
          day: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
          mtime: st.mtime.toISOString(),
        };
        if (!bySubject.has(subject)) bySubject.set(subject, []);
        bySubject.get(subject)!.push(f);
        total++;
      }
    };
    walk(CRUX_ROOT, "(root)");
  }
  const subjects = [...bySubject.entries()]
    .map(([subject, files]) => ({ subject, files: files.sort((a, b) => (b.day ?? "").localeCompare(a.day ?? "") || b.mtime.localeCompare(a.mtime)) }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
  return { subjects, total, root: CRUX_ROOT };
}

/** Resolve a listed file safely (must stay inside CRUX_ROOT). */
export function resolveCruxFile(rel: string): { abs: string; mime: string } | null {
  const abs = path.resolve(CRUX_ROOT, rel);
  if (!abs.startsWith(path.resolve(CRUX_ROOT) + path.sep)) return null;
  const mime = EXTS[path.extname(abs).toLowerCase()];
  if (!mime || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return { abs, mime };
}
