/* ════════════════════════════════════════════════════════════
   MENTOR CONTEXT — retrieval that grounds the AI Mentor in the
   platform's REAL data (current affairs, PYQs, NCERT, notes,
   the student's own progress) instead of model memory.

   Returns a compact "[PLATFORM INTELLIGENCE]" block to prepend
   to the system prompt. If nothing relevant exists, returns "".
   ════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { computeStreak } from "@/lib/activity";

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

export async function gatherMentorContext(message: string, examCode: string): Promise<string> {
  const kws = keywords(message);
  const studyGuidance = STUDY_RE.test(message);
  const worldNews = WORLD_RE.test(message);

  // Generic chit-chat with nothing to retrieve → no context block.
  if (kws.length === 0 && !studyGuidance && !worldNews) return "";

  const [caAll, pyqAll, ncertAll, notesAll] = await Promise.all([
    prisma.currentAffair.findMany({
      where: { examScope: { has: examCode } }, orderBy: { publishedAt: "desc" }, take: 150,
      select: { headline: true, whyInNews: true, gsMapping: true, tags: true, importanceScore: true, publishedAt: true },
    }),
    prisma.pyqQuestion.findMany({
      where: { paper: { examCode } }, take: 800,
      select: { text: true, topic: true, keywords: true, marks: true, paper: { select: { year: true, stage: true, paperCode: true } } },
    }),
    prisma.ncertChapter.findMany({ where: { kind: "chapter" }, take: 600, include: { book: true } }),
    prisma.note.findMany({
      where: { userId: DEMO_USER_ID }, orderBy: { updatedAt: "desc" }, take: 100,
      select: { title: true, subject: true, tags: true, content: true },
    }),
  ]);

  const blocks: string[] = [];

  // ── Current affairs ──────────────────────────────────────────
  const caScored = worldNews
    ? caAll.map((r) => ({ r, score: (r.importanceScore || 0) / 20 + hits(`${r.headline} ${r.tags.join(" ")}`, kws) }))
    : caAll.map((r) => ({ r, score: hits(`${r.headline} ${r.tags.join(" ")} ${r.whyInNews ?? ""}`, kws) }));
  const caTop = caScored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, worldNews ? 8 : 5);
  if (caTop.length) blocks.push(
    "CURRENT AFFAIRS (real items from the platform's live feed — cite these, do not invent headlines):\n" +
    caTop.map(({ r }) => `- [${r.publishedAt.toISOString().slice(0, 10)}] ${r.headline}${r.gsMapping.length ? ` (${r.gsMapping.join(", ")})` : ""}${r.whyInNews ? ` — ${r.whyInNews.slice(0, 160)}` : ""}`).join("\n"),
  );

  // ── Past questions (PYQ) ─────────────────────────────────────
  if (kws.length) {
    const pyqTop = pyqAll
      .map((q) => ({ q, score: hits(`${q.text} ${q.topic ?? ""} ${q.keywords.join(" ")}`, kws) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
    if (pyqTop.length) blocks.push(
      "PAST QUESTIONS (real, from the PYQ database — cite the exact year/paper):\n" +
      pyqTop.map(({ q }) => `- ${examCode} ${q.paper.stage}${q.paper.year ? " " + q.paper.year : ""} ${q.paper.paperCode}: "${q.text.slice(0, 150)}"${q.marks ? ` (${q.marks}m)` : ""}`).join("\n"),
    );
  }

  // ── NCERT chapters ───────────────────────────────────────────
  if (kws.length) {
    const ncertTop = ncertAll
      .map((c) => ({ c, score: hits(`${c.title} ${c.aiConcepts.join(" ")} ${c.book.subject}`, kws) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    if (ncertTop.length) blocks.push(
      "NCERT (from the platform library):\n" +
      ncertTop.map(({ c }) => `- Class ${c.book.klass} ${c.book.subject} — ${c.title} (${c.book.title})`).join("\n"),
    );
  }

  // ── Student's own notes ──────────────────────────────────────
  if (kws.length) {
    const noteTop = notesAll
      .map((n) => ({ n, score: hits(`${n.title} ${n.subject ?? ""} ${n.tags.join(" ")} ${n.content}`, kws) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    if (noteTop.length) blocks.push(
      "STUDENT'S NOTES (their own — reference and build on these):\n" +
      noteTop.map(({ n }) => `- ${n.title}${n.subject ? ` (${n.subject})` : ""}`).join("\n"),
    );
  }

  // ── Progress (only for study-guidance questions) ─────────────
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
    const accLine = [...acc.entries()].filter(([, m]) => m.r >= 3)
      .map(([s, m]) => `${s} ${Math.round((m.c / m.r) * 100)}% (${m.r} attempts)`).sort();
    blocks.push(
      "STUDENT PROGRESS (real activity — personalise the plan to this, name specific gaps):\n" +
      `- Streak ${streak.streak} days, active ${streak.active30}/30 days\n` +
      `- NCERT coverage: ${ncertDone}/${ncertTotal} chapters completed\n` +
      `- Revision: ${dueCards} cards due now\n` +
      `- PYQ accuracy by area: ${accLine.length ? accLine.join("; ") : "not enough attempts yet — recommend starting PYQ practice"}`,
    );
  }

  if (blocks.length === 0) return "";
  return "\n\n[PLATFORM INTELLIGENCE — the following is REAL data from this student's platform. Ground your answer in it and cite the specific items. Do NOT fabricate sources, PYQ years, case names or headlines. If you add anything from general knowledge, keep it exam-accurate.]\n\n" + blocks.join("\n\n");
}
