/* ════════════════════════════════════════════════════════════════
   COS M1 — Learning Profile Engine. Pure derivations over the ledger
   and real content tables. Law L2: a trait below its evidence gate is
   reported as "collecting" with n/N — never guessed.
   ════════════════════════════════════════════════════════════════ */
import { prisma, DEMO_USER_ID } from "@/lib/db";

export interface Trait {
  key: string;
  label: string;
  ready: boolean;
  n: number;               // evidence collected
  need: number;            // evidence gate
  value: string | null;    // human-readable finding (only when ready)
  detail: string | null;   // supporting numbers
}

const DAY = 86400000;

export async function computeProfile(): Promise<{ traits: Trait[]; computedAt: string }> {
  const since28 = new Date(Date.now() - 28 * DAY);

  const [pyqAttempts, reviews, sessions, chapters28, answers, tests] = await Promise.all([
    prisma.pyqAttempt.findMany({ where: { userId: DEMO_USER_ID }, select: { subject: true, selfRating: true } }),
    prisma.activityEvent.findMany({ where: { userId: DEMO_USER_ID, type: { in: ["REVISION_REVIEWED", "TOPIC_REVISED"] } }, select: { value: true, createdAt: true } }),
    prisma.activityEvent.findMany({ where: { userId: DEMO_USER_ID, type: "STUDY_SESSION" }, select: { value: true, createdAt: true } }),
    prisma.activityEvent.count({ where: { userId: DEMO_USER_ID, type: "CHAPTER_READ", createdAt: { gte: since28 } } }),
    prisma.mainsAnswer.findMany({ where: { userId: DEMO_USER_ID, score: { not: null } }, select: { score: true, maxMarks: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.testAttempt.findMany({ where: { userId: DEMO_USER_ID }, select: { totalQ: true, correct: true } }),
  ]);

  const traits: Trait[] = [];

  // ── Strong / weak subjects (PYQ self-ratings per subject) ──
  {
    const bySub = new Map<string, { n: number; ok: number }>();
    for (const a of pyqAttempts) {
      const s = a.subject ?? "General";
      const e = bySub.get(s) ?? { n: 0, ok: 0 };
      e.n++; if (a.selfRating === "correct") e.ok++; else if (a.selfRating === "partial") e.ok += 0.5;
      bySub.set(s, e);
    }
    const qualified = [...bySub.entries()].filter(([, v]) => v.n >= 10).map(([s, v]) => ({ s, acc: v.ok / v.n, n: v.n }));
    const total = pyqAttempts.length;
    if (qualified.length >= 2) {
      const sorted = qualified.sort((a, b) => b.acc - a.acc);
      traits.push({
        key: "subjects", label: "Strong / weak subjects", ready: true, n: total, need: 10,
        value: `Strongest: ${sorted[0].s} (${Math.round(sorted[0].acc * 100)}%) · Weakest: ${sorted[sorted.length - 1].s} (${Math.round(sorted[sorted.length - 1].acc * 100)}%)`,
        detail: sorted.map((q) => `${q.s} ${Math.round(q.acc * 100)}% (n=${q.n})`).join(" · "),
      });
    } else {
      traits.push({ key: "subjects", label: "Strong / weak subjects", ready: false, n: total, need: 20, value: null, detail: "needs ≥10 graded PYQ attempts in ≥2 subjects" });
    }
  }

  // ── Retention ability (mean recall grade) ──
  {
    const n = reviews.length;
    if (n >= 30) {
      const mean = reviews.reduce((s, r) => s + r.value, 0) / n;
      traits.push({ key: "retention", label: "Retention ability", ready: true, n, need: 30, value: `${mean.toFixed(1)} / 5 mean recall grade`, detail: `${n} graded recalls` });
    } else traits.push({ key: "retention", label: "Retention ability", ready: false, n, need: 30, value: null, detail: "grade revisions to build this" });
  }

  // ── Learning speed (chapters per deep-work hour, 28d) ──
  {
    const focusMin = sessions.filter((s) => s.createdAt >= since28).reduce((s, x) => s + x.value, 0);
    const ready = chapters28 >= 8 && focusMin >= 300;
    traits.push(ready
      ? { key: "speed", label: "Learning speed", ready: true, n: chapters28, need: 8, value: `${(chapters28 / (focusMin / 60)).toFixed(1)} chapters per focus-hour`, detail: `${chapters28} chapters · ${Math.round(focusMin / 60)}h deep work · last 28 days` }
      : { key: "speed", label: "Learning speed", ready: false, n: chapters28, need: 8, value: null, detail: "complete NCERT chapters with the timer running" });
  }

  // ── Concentration span (p75 session length) ──
  {
    const n = sessions.length;
    if (n >= 20) {
      const sorted = sessions.map((s) => s.value).sort((a, b) => a - b);
      const p75 = sorted[Math.floor(0.75 * (sorted.length - 1))];
      traits.push({ key: "span", label: "Concentration span", ready: true, n, need: 20, value: `${p75} min sustained (p75)`, detail: `${n} logged sessions` });
    } else traits.push({ key: "span", label: "Concentration span", ready: false, n, need: 20, value: null, detail: "use the deep-work timer" });
  }

  // ── Preferred study timing (focus minutes by hour, ≥14 active days) ──
  {
    const days = new Set(sessions.map((s) => s.createdAt.toISOString().slice(0, 10)));
    if (days.size >= 14) {
      const byHour = new Array(24).fill(0);
      for (const s of sessions) byHour[s.createdAt.getHours()] += s.value;
      const top = byHour.map((m, h) => ({ h, m })).sort((a, b) => b.m - a.m).slice(0, 2).sort((a, b) => a.h - b.h);
      const fmt = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
      traits.push({ key: "timing", label: "Preferred study window", ready: true, n: days.size, need: 14, value: top.map((t) => `${fmt(t.h)}–${fmt((t.h + 1) % 24)}`).join(" & "), detail: "by focus minutes logged" });
    } else traits.push({ key: "timing", label: "Preferred study window", ready: false, n: days.size, need: 14, value: null, detail: "needs 14 active days" });
  }

  // ── Answer writing quality ──
  {
    const n = answers.length;
    if (n >= 6) {
      const pct = answers.map((a) => (a.score! / a.maxMarks) * 100);
      const first = pct.slice(0, Math.ceil(n / 2)), last = pct.slice(Math.floor(n / 2));
      const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const trend = avg(last) - avg(first);
      traits.push({ key: "answers", label: "Answer writing quality", ready: true, n, need: 6, value: `${avg(pct).toFixed(0)}% of max marks${Math.abs(trend) >= 2 ? ` · ${trend > 0 ? "improving" : "declining"} ${Math.abs(trend).toFixed(0)}pp` : " · steady"}`, detail: `${n} AI-evaluated answers` });
    } else traits.push({ key: "answers", label: "Answer writing quality", ready: false, n, need: 6, value: null, detail: "write answers in the Answer Lab" });
  }

  // ── MCQ accuracy ──
  {
    const attempts = tests.reduce((s, t) => s + t.totalQ, 0) + pyqAttempts.length;
    if (attempts >= 40) {
      const testCorrect = tests.reduce((s, t) => s + t.correct, 0);
      const testTotal = tests.reduce((s, t) => s + t.totalQ, 0);
      const parts: string[] = [];
      if (testTotal > 0) parts.push(`tests ${Math.round((testCorrect / testTotal) * 100)}% (${testTotal}Q)`);
      if (pyqAttempts.length > 0) {
        const ok = pyqAttempts.filter((a) => a.selfRating === "correct").length;
        parts.push(`PYQs ${Math.round((ok / pyqAttempts.length) * 100)}% (${pyqAttempts.length}Q)`);
      }
      traits.push({ key: "mcq", label: "MCQ accuracy", ready: true, n: attempts, need: 40, value: parts.join(" · "), detail: null });
    } else traits.push({ key: "mcq", label: "MCQ accuracy", ready: false, n: attempts, need: 40, value: null, detail: "attempt tests and PYQs" });
  }

  return { traits, computedAt: new Date().toISOString() };
}

/** Persist a weekly snapshot (Sundays, idempotent) for trend lines. */
export async function maybeSnapshot() {
  const now = new Date();
  if (now.getDay() !== 0) return;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const exists = await prisma.profileSnapshot.findUnique({ where: { userId_weekStart: { userId: DEMO_USER_ID, weekStart } } });
  if (exists) return;
  const profile = await computeProfile();
  await prisma.profileSnapshot.create({ data: { userId: DEMO_USER_ID, weekStart, data: profile as object } });
}
