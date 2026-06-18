/* ════════════════════════════════════════════════════════════
   MENTOR CONTEXT — grounds the AI Mentor in the platform's REAL
   data. Primary retrieval is SEMANTIC (pgvector embeddings, by
   meaning); if the index is unavailable or Gemini is throttled it
   falls back to keyword matching. Either way it returns a compact
   "[PLATFORM INTELLIGENCE]" block to prepend to the system prompt.
   ════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { computeStreak } from "@/lib/activity";
import { semanticSearch } from "@/lib/embeddings";

const STOP = new Set(
  ("the a an and or of for to in on at is are be by with from as it its into your you i we this that these those what which how why when where who whom should would could do does did about between within across over under more most than then them they will can may must also using use used new latest news current give tell explain me my our help".split(" ")),
);
function keywords(s: string): string[] {
  return Array.from(new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)),
  )).slice(0, 12);
}
function hits(text: string, kws: string[]): number {
  const t = text.toLowerCase();
  return kws.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
}

const STUDY_RE = /\b(what|where|which|how)\b[^.?]{0,40}\b(study|prepare|prep|start|read|revise|focus|next|weak|improve|plan)\b|study plan|what next|where do i start|what should i do/i;
const WORLD_RE = /\b(world|global|geopolit\w*|international|foreign|diplomac\w*|breaking|happening|news today|current affairs|this week|in the news)\b/i;

// ── Display formatters (fetch real records → human lines) ─────
async function caLines(ids: string[], limit: number): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await prisma.currentAffair.findMany({
    where: { id: { in: ids } },
    select: { id: true, headline: true, whyInNews: true, gsMapping: true, publishedAt: true },
  });
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => m.get(id)).filter(Boolean).slice(0, limit)
    .map((r) => `- [${r!.publishedAt.toISOString().slice(0, 10)}] ${r!.headline}${r!.gsMapping.length ? ` (${r!.gsMapping.join(", ")})` : ""}${r!.whyInNews ? ` — ${r!.whyInNews.slice(0, 160)}` : ""}`);
}
async function pyqLines(ids: string[], examCode: string, limit: number): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await prisma.pyqQuestion.findMany({
    where: { id: { in: ids } },
    select: { id: true, text: true, marks: true, paper: { select: { year: true, stage: true, paperCode: true } } },
  });
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => m.get(id)).filter(Boolean).slice(0, limit)
    .map((q) => `- ${examCode} ${q!.paper.stage}${q!.paper.year ? " " + q!.paper.year : ""} ${q!.paper.paperCode}: "${q!.text.slice(0, 150)}"${q!.marks ? ` (${q!.marks}m)` : ""}`);
}
async function ncertLines(ids: string[], limit: number): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await prisma.ncertChapter.findMany({ where: { id: { in: ids } }, include: { book: true } });
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => m.get(id)).filter(Boolean).slice(0, limit)
    .map((c) => `- Class ${c!.book.klass} ${c!.book.subject} — ${c!.title} (${c!.book.title})`);
}
async function noteLines(ids: string[], limit: number): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await prisma.note.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, subject: true } });
  const m = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => m.get(id)).filter(Boolean).slice(0, limit)
    .map((n) => `- ${n!.title}${n!.subject ? ` (${n!.subject})` : ""}`);
}

function block(label: string, lines: string[]): string | null {
  return lines.length ? `${label}\n${lines.join("\n")}` : null;
}

export async function gatherMentorContext(message: string, examCode: string): Promise<string> {
  const kws = keywords(message);
  const studyGuidance = STUDY_RE.test(message);
  const worldNews = WORLD_RE.test(message);
  if (kws.length === 0 && !studyGuidance && !worldNews) return "";

  const blocks: (string | null)[] = [];

  // ── 1. Semantic retrieval (primary) ──────────────────────────
  const semHits = await semanticSearch(message, { examCode, limit: 20 }).catch(() => []);
  const grouped: Record<string, string[]> = { CA: [], PYQ: [], NCERT: [], NOTE: [] };
  for (const h of semHits) grouped[h.kind]?.push(h.refId);

  if (semHits.length) {
    if (!worldNews) blocks.push(block("CURRENT AFFAIRS (real items from the platform feed — cite these, do not invent headlines):", await caLines(grouped.CA, 6)));
    blocks.push(block("PAST QUESTIONS (real, from the PYQ database — cite the exact year/paper):", await pyqLines(grouped.PYQ, examCode, 6)));
    blocks.push(block("NCERT (from the platform library):", await ncertLines(grouped.NCERT, 4)));
    blocks.push(block("STUDENT'S NOTES (their own — reference and build on these):", await noteLines(grouped.NOTE, 4)));
  } else if (kws.length) {
    // ── 2. Keyword fallback (index unavailable / throttled) ────
    const [caAll, pyqAll, ncertAll, notesAll] = await Promise.all([
      prisma.currentAffair.findMany({ where: { examScope: { has: examCode } }, orderBy: { publishedAt: "desc" }, take: 150, select: { id: true, headline: true, whyInNews: true, gsMapping: true, tags: true } }),
      prisma.pyqQuestion.findMany({ where: { paper: { examCode } }, take: 800, select: { id: true, text: true, topic: true, keywords: true } }),
      prisma.ncertChapter.findMany({ where: { kind: "chapter" }, take: 600, select: { id: true, title: true, aiConcepts: true, book: { select: { subject: true } } } }),
      prisma.note.findMany({ where: { userId: DEMO_USER_ID }, take: 100, select: { id: true, title: true, subject: true, tags: true, content: true } }),
    ]);
    const top = <T extends { id: string }>(rows: T[], text: (r: T) => string, n: number) =>
      rows.map((r) => ({ r, s: hits(text(r), kws) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.r.id);
    if (!worldNews) blocks.push(block("CURRENT AFFAIRS (real items from the platform feed — cite these, do not invent headlines):", await caLines(top(caAll, (r) => `${r.headline} ${r.tags.join(" ")} ${r.whyInNews ?? ""}`, 5), 5)));
    blocks.push(block("PAST QUESTIONS (real, from the PYQ database — cite the exact year/paper):", await pyqLines(top(pyqAll, (r) => `${r.text} ${r.topic ?? ""} ${r.keywords.join(" ")}`, 6), examCode, 6)));
    blocks.push(block("NCERT (from the platform library):", await ncertLines(top(ncertAll, (r) => `${r.title} ${r.aiConcepts.join(" ")} ${r.book.subject}`, 4), 4)));
    blocks.push(block("STUDENT'S NOTES (their own — reference and build on these):", await noteLines(top(notesAll, (r) => `${r.title} ${r.subject ?? ""} ${r.tags.join(" ")} ${r.content}`, 4), 4)));
  }

  // ── 3. World-news intent → importance-ranked recent CA ───────
  if (worldNews) {
    const recent = await prisma.currentAffair.findMany({
      where: { examScope: { has: examCode } }, orderBy: [{ importanceScore: "desc" }, { publishedAt: "desc" }], take: 8,
      select: { id: true, headline: true, whyInNews: true, gsMapping: true, publishedAt: true },
    });
    const lines = recent.map((r) => `- [${r.publishedAt.toISOString().slice(0, 10)}] ${r.headline}${r.gsMapping.length ? ` (${r.gsMapping.join(", ")})` : ""}${r.whyInNews ? ` — ${r.whyInNews.slice(0, 160)}` : ""}`);
    blocks.unshift(block("TOP CURRENT AFFAIRS (highest-priority items in the platform feed — build the briefing on these):", lines));
  }

  // ── 4. Study-guidance intent → real progress ─────────────────
  if (studyGuidance) {
    const [streak, ncertDone, ncertTotal, dueCards, attempts] = await Promise.all([
      computeStreak(),
      prisma.chapterProgress.count({ where: { userId: DEMO_USER_ID } }),
      prisma.ncertChapter.count({ where: { kind: "chapter" } }),
      prisma.revision.count({ where: { userId: DEMO_USER_ID, dueAt: { lte: new Date() } } }),
      prisma.pyqAttempt.findMany({ where: { userId: DEMO_USER_ID, selfRating: { in: ["correct", "partial", "wrong"] } }, select: { subject: true, selfRating: true } }),
    ]);
    const acc = new Map<string, { r: number; c: number }>();
    for (const a of attempts) { const s = a.subject ?? "General"; const m = acc.get(s) ?? { r: 0, c: 0 }; m.r++; if (a.selfRating === "correct") m.c++; acc.set(s, m); }
    const accLine = [...acc.entries()].filter(([, m]) => m.r >= 3).map(([s, m]) => `${s} ${Math.round((m.c / m.r) * 100)}% (${m.r} attempts)`).sort();
    blocks.push(
      "STUDENT PROGRESS (real activity — personalise the plan to this, name specific gaps):\n" +
      `- Streak ${streak.streak} days, active ${streak.active30}/30 days\n` +
      `- NCERT coverage: ${ncertDone}/${ncertTotal} chapters completed\n` +
      `- Revision: ${dueCards} cards due now\n` +
      `- PYQ accuracy by area: ${accLine.length ? accLine.join("; ") : "not enough attempts yet — recommend starting PYQ practice"}`,
    );
  }

  const present = blocks.filter((b): b is string => !!b);
  if (present.length === 0) return "";
  return "\n\n[PLATFORM INTELLIGENCE — the following is REAL data from this student's platform, retrieved by semantic relevance to their question. Ground your answer in it and cite the specific items. Do NOT fabricate sources, PYQ years, case names or headlines. If you add anything from general knowledge, keep it exam-accurate.]\n\n" + present.join("\n\n");
}
