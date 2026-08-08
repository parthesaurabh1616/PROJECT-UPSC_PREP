/* ════════════════════════════════════════════════════════════════
   CA source-folder ingestion — the user's coaching/newspaper PDFs.

   He drops files into the library folders exactly as he already does;
   the platform picks them up: scan (register/refresh) → decode (Gemini
   OCR → CurrentAffair items, source-tagged, dated from the filename)
   → Examination Board → daily revision sheets. Fully idempotent:
   a file is decoded once, re-decoded only if it changes on disk.
   ════════════════════════════════════════════════════════════════ */
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { extractCaFromPdf } from "@/lib/ai";
import { libraryPath } from "@/lib/library-root";

export const SOURCE_ROOT = libraryPath("Current Affairs");

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Parse the (first) date out of messy filenames:
    "01.07.2026 …", "1 July 2026", "CURRENT AFFAIRS – 6 July 2026",
    "3rd July to 6 July …" (ranges → first day), "5 & 6 July 2026". */
export function parseDayFromName(name: string, fallback: Date): Date {
  const n = name.toLowerCase();
  let m = n.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);           // dd.mm.yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
  m = n.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:&\s*\d{1,2}\s*)?(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s*,?\s*(\d{4})?/);
  if (m) {
    const month = MONTHS.findIndex((x) => x.startsWith(m![2].slice(0, 3)));
    const year = m[3] ? Number(m[3]) : fallback.getFullYear();
    if (month >= 0) return new Date(year, month, Number(m[1]), 12);
  }
  const d = new Date(fallback); d.setHours(12, 0, 0, 0); return d;
}

/** Walk the source folders; register new files, re-flag changed ones. */
export async function scanSources(): Promise<{ found: number; added: number; changed: number }> {
  let found = 0, added = 0, changed = 0;
  if (!fs.existsSync(SOURCE_ROOT)) return { found, added, changed };
  for (const folder of fs.readdirSync(SOURCE_ROOT, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const dir = path.join(SOURCE_ROOT, folder.name);
    for (const f of fs.readdirSync(dir)) {
      if (!f.toLowerCase().endsWith(".pdf")) continue;
      const p = path.join(dir, f);
      let st: fs.Stats;
      try { st = fs.statSync(p); } catch { continue; }
      found++;
      const existing = await prisma.sourceDoc.findUnique({ where: { path: p } });
      if (!existing) {
        await prisma.sourceDoc.create({
          data: {
            path: p, folder: folder.name, filename: f,
            day: parseDayFromName(f, st.mtime), size: st.size, mtimeMs: st.mtimeMs,
          },
        });
        added++;
      } else if (existing.size !== st.size || Math.abs(existing.mtimeMs - st.mtimeMs) > 1000) {
        await prisma.sourceDoc.update({ where: { id: existing.id }, data: { size: st.size, mtimeMs: st.mtimeMs, status: "PENDING", error: null } });
        changed++;
      }
    }
  }
  return { found, added, changed };
}

/** Decode pending docs (newest day first). Each item becomes a CurrentAffair
    (source-tagged, dated) unless the same headline already exists that day. */
export async function decodeSourceBatch(limit = 3): Promise<{ decoded: number; items: number; failed: number }> {
  const pending = await prisma.sourceDoc.findMany({
    where: { status: "PENDING" },
    orderBy: [{ day: "desc" }, { createdAt: "asc" }],
    take: Math.min(10, Math.max(1, limit)),
  });
  let decoded = 0, items = 0, failed = 0;

  for (const doc of pending) {
    if (!fs.existsSync(doc.path)) {
      await prisma.sourceDoc.update({ where: { id: doc.id }, data: { status: "FAILED", error: "file missing on disk" } });
      failed++; continue;
    }
    const day = doc.day ?? new Date();
    try {
      const extracted = await extractCaFromPdf(doc.path, doc.folder, day.toDateString());
      let created = 0;
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
      for (const it of extracted) {
        const dup = await prisma.currentAffair.findFirst({
          where: { headline: it.headline, publishedAt: { gte: dayStart, lte: dayEnd } },
          select: { id: true },
        });
        if (dup) continue;
        await prisma.currentAffair.create({
          data: {
            headline: it.headline, summary: it.summary, whyInNews: it.whyInNews, keyFacts: it.keyFacts,
            gsMapping: it.gsMapping, tags: it.tags,
            category: it.category, priority: it.priority,
            source: doc.folder, sourceUrl: null,
            examScope: ["UPSC"], layer: it.category === "international" ? "global" : "india",
            publishedAt: day,
          },
        });
        created++;
      }
      await prisma.sourceDoc.update({ where: { id: doc.id }, data: { status: "DECODED", items: created, decodedAt: new Date(), error: null } });
      decoded++; items += created;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "decode failed";
      const quota = /quota|429|exhaust/i.test(msg);
      // quota exhaustion is transient — keep the doc PENDING so it retries
      await prisma.sourceDoc.update({ where: { id: doc.id }, data: { status: quota ? "PENDING" : "FAILED", error: msg.slice(0, 300) } });
      failed++;
      if (quota) break; // stop the batch — resumes next run after reset
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { decoded, items, failed };
}

export async function sourceStats() {
  const [total, pending, decodedAgg, failed] = await Promise.all([
    prisma.sourceDoc.count(),
    prisma.sourceDoc.count({ where: { status: "PENDING" } }),
    prisma.sourceDoc.aggregate({ where: { status: "DECODED" }, _count: { _all: true }, _sum: { items: true } }),
    prisma.sourceDoc.count({ where: { status: "FAILED" } }),
  ]);
  return { total, pending, decoded: decodedAgg._count._all, itemsExtracted: decodedAgg._sum.items ?? 0, failed };
}
