/* ════════════════════════════════════════════════════════════════
   Daily CA Revision Sheets — one saved sheet per day, compiled
   DETERMINISTICALLY from the Examination Board's stored verdicts
   (no AI call → instant, quota-free, replayable). A day's sheet is
   the ordered revision material of that day's news: 25-word lines,
   3-keyword cues, one-day-before sentences, static links, traps —
   worthy items only, ranked by the Board's revisionPriority.
   Day boundary: publishedAt calendar day (IST news day).
   ════════════════════════════════════════════════════════════════ */
import { createHash } from "crypto";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { BoardVerdict } from "@/lib/upsc-board";

export interface SheetItem {
  affairId: string;
  headline: string;
  category: string;
  verdict: string;
  scores: { prelims: number; mains: number; revision: number };
  w25: string;
  keywords3: string[];
  oneDayBefore: string;
  staticLinks: { paper: string; topic: string }[];
  traps: string[];
  confusable: string;
}
export interface SheetContent {
  items: SheetItem[];
  skipped: { count: number; headlines: string[] }; // Board REJECTs — listed so nothing is hidden
  pendingJudgement: number;                        // items of the day not yet judged
}

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const DAY = 86400000;

/** Compile (or refresh) the sheet for one calendar day. Returns null if the day has no judged items. */
export async function compileSheet(day: Date) {
  const from = dayStart(day), to = new Date(from.getTime() + DAY - 1);
  const affairs = await prisma.currentAffair.findMany({
    where: { publishedAt: { gte: from, lte: to } },
    orderBy: { publishedAt: "asc" },
  });
  if (affairs.length === 0) return null;

  const judged = affairs.filter((a) => a.boardAt);
  if (judged.length === 0) return null;

  const hash = createHash("sha1").update(judged.map((a) => a.id + (a.boardAt?.getTime() ?? 0)).sort().join("|")).digest("hex");
  const existing = await prisma.caDailySheet.findUnique({ where: { userId_day: { userId: DEMO_USER_ID, day: from } } });
  if (existing && existing.sourceHash === hash) return existing;

  const items: SheetItem[] = [];
  const skippedHeadlines: string[] = [];
  for (const a of judged) {
    const v = a.boardVerdict as unknown as BoardVerdict | null;
    if (!v || v.verdict === "REJECT") { skippedHeadlines.push(a.headline); continue; }
    items.push({
      affairId: a.id,
      headline: a.headline,
      category: a.category,
      verdict: v.verdict,
      scores: { prelims: v.scores?.prelimsProb ?? 0, mains: v.scores?.mainsProb ?? 0, revision: v.scores?.revisionPriority ?? 0 },
      w25: v.compression?.w25 ?? "",
      keywords3: v.compression?.keywords3 ?? [],
      oneDayBefore: v.oneDayBefore ?? "",
      staticLinks: v.staticLinks ?? [],
      traps: v.prelimsTraps ?? [],
      confusable: v.confusable ?? "",
    });
  }
  items.sort((a, b) => b.scores.revision - a.scores.revision);

  const content: SheetContent = {
    items,
    skipped: { count: skippedHeadlines.length, headlines: skippedHeadlines.slice(0, 20) },
    pendingJudgement: affairs.length - judged.length,
  };

  return prisma.caDailySheet.upsert({
    where: { userId_day: { userId: DEMO_USER_ID, day: from } },
    create: { userId: DEMO_USER_ID, day: from, content: content as unknown as Prisma.InputJsonObject, itemCount: items.length, judgedCount: judged.length, sourceHash: hash },
    update: { content: content as unknown as Prisma.InputJsonObject, itemCount: items.length, judgedCount: judged.length, sourceHash: hash },
  });
}

/** Ensure sheets exist/refresh for every day (last `days`) that has judged items. */
export async function ensureSheets(days = 60): Promise<number> {
  const since = new Date(Date.now() - days * DAY);
  const judged = await prisma.currentAffair.findMany({
    where: { boardAt: { not: null }, publishedAt: { gte: since } },
    select: { publishedAt: true },
  });
  const daySet = new Set(judged.map((a) => dayStart(a.publishedAt).getTime()));
  let touched = 0;
  for (const t of [...daySet].sort((a, b) => b - a)) {
    const r = await compileSheet(new Date(t));
    if (r) touched++;
  }
  return touched;
}
