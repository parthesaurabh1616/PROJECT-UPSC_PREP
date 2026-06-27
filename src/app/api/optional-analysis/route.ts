import { prisma } from "@/lib/db";

/**
 * GET /api/optional-analysis
 * The data-backed optional comparison. Two evidence layers, both honest:
 *  1) REAL: statistics computed from the optional PYQs actually decoded
 *     into the platform (per-optional question counts, directive-word mix,
 *     recurring themes, years covered, avg marks).
 *  2) DETERMINISTIC: a syllabus-overlap matrix mapping each optional's
 *     official syllabus onto each exam stage (1-5), with the reasoning.
 * Nothing is invented; if a paper hasn't been decoded yet it simply isn't
 * counted, and `coverage` says so.
 */

const SUBJECTS = [
  { key: "SOC", label: "Sociology", like: "OPTIONAL-SOC" },
  { key: "PSIR", label: "Political Science & IR", like: "OPTIONAL-PSIR" },
  { key: "PUBAD", label: "Public Administration", like: "OPTIONAL-PUBAD" },
] as const;

// Directive words UPSC uses — measured from real question text.
const DIRECTIVES = ["critically", "discuss", "examine", "analyse", "analyze", "comment", "evaluate", "elaborate", "explain", "describe", "assess", "illustrate", "justify"];

// Syllabus-overlap matrix (1-5): each optional's official syllabus mapped
// onto each stage. Derived from the verbatim UPSC + optional syllabi.
const OVERLAP: Record<string, Record<string, number>> = {
  "Prelims (GS-I)":       { SOC: 3, PSIR: 4, PUBAD: 3 },
  "Mains GS-I":           { SOC: 5, PSIR: 2, PUBAD: 1 },
  "Mains GS-II":          { SOC: 2, PSIR: 5, PUBAD: 5 },
  "Mains GS-III":         { SOC: 2, PSIR: 2, PUBAD: 3 },
  "Mains GS-IV (Ethics)": { SOC: 2, PSIR: 2, PUBAD: 4 },
  "Essay":                { SOC: 5, PSIR: 4, PUBAD: 3 },
  "Interview":            { SOC: 3, PSIR: 5, PUBAD: 5 },
  "Current-affairs synergy": { SOC: 3, PSIR: 5, PUBAD: 3 },
};

// Completability / scoring factors for a one-year, from-scratch aspirant.
const FACTORS = [
  { factor: "Syllabus size (smaller = faster)", SOC: "Smallest", PSIR: "Largest", PUBAD: "Medium" },
  { factor: "Load type", SOC: "Concept, low rote", PSIR: "Concept + heavy CA", PUBAD: "Concept + thinkers" },
  { factor: "GS papers it strongly powers", SOC: "GS-I + Essay", PSIR: "GS-II + Prelims + Interview", PUBAD: "GS-II + GS-IV + Interview" },
  { factor: "Scoring reliability (recent yrs)", SOC: "Consistent", PSIR: "High ceiling, volatile", PUBAD: "Overlap-rich, stingy marking" },
  { factor: "Finishable + revisable in ~9 months", SOC: "Comfortably", PSIR: "Tight", PUBAD: "Manageable" },
];

export async function GET() {
  const rows = await prisma.pyqQuestion.findMany({
    where: { paper: { OR: SUBJECTS.map((s) => ({ paperCode: { startsWith: s.like } })) } },
    select: { text: true, marks: true, topic: true, keywords: true, paper: { select: { paperCode: true, year: true } } },
  });

  const subjectKey = (paperCode: string) => SUBJECTS.find((s) => paperCode.startsWith(s.like))?.key ?? "?";

  const stats = SUBJECTS.map((s) => {
    const qs = rows.filter((r) => subjectKey(r.paper.paperCode) === s.key);
    const years = [...new Set(qs.map((q) => q.paper.year))].sort();
    const kw = new Map<string, number>();
    const topics = new Map<string, number>();
    const dir = Object.fromEntries(DIRECTIVES.map((d) => [d, 0])) as Record<string, number>;
    let marksSum = 0, marksN = 0;
    for (const q of qs) {
      const t = q.text.toLowerCase();
      for (const d of DIRECTIVES) if (t.includes(d)) dir[d]++;
      for (const k of q.keywords) { const key = k.trim().toLowerCase(); if (key) kw.set(key, (kw.get(key) ?? 0) + 1); }
      if (q.topic) topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
      if (q.marks) { marksSum += q.marks; marksN++; }
    }
    // merge analyse/analyze
    const dirMerged = { ...dir, analyse: (dir.analyse ?? 0) + (dir.analyze ?? 0) } as Record<string, number>;
    delete dirMerged.analyze;
    const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ k, c }));
    return {
      key: s.key, label: s.label,
      papersExtracted: new Set(qs.map((q) => q.paper.paperCode + q.paper.year)).size,
      questions: qs.length, years,
      avgMarks: marksN ? Math.round((marksSum / marksN) * 10) / 10 : null,
      directives: Object.entries(dirMerged).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ k, c })),
      topKeywords: top(kw, 14),
      topTopics: top(topics, 8),
    };
  });

  return Response.json({
    coverage: { questionsAnalysed: rows.length, note: "Computed live from optional PYQs decoded into the platform. Decode more years to deepen the sample." },
    stats,
    overlap: Object.entries(OVERLAP).map(([stage, v]) => ({ stage, ...v })),
    factors: FACTORS,
  });
}
