/* ════════════════════════════════════════════════════════════
   EXAM KNOWLEDGE — factual, verifiable reference data for the
   UPSC Command Center. None of this is invented: the marks scheme
   is the official UPSC CSE pattern; the topper marksheets are real
   published results. Used as educational content + benchmarks.
   User-specific numbers are NEVER here — they come from the
   activity ledger via /api/exam-center.
   ════════════════════════════════════════════════════════════ */

// ── What is UPSC / the selection funnel ───────────────────────
export const UPSC_OVERVIEW = {
  what: "The Union Public Service Commission conducts the Civil Services Examination (CSE) once a year to recruit officers for the All India Services and Central Services.",
  services: [
    { code: "IAS", name: "Indian Administrative Service", note: "District & state/central administration" },
    { code: "IPS", name: "Indian Police Service", note: "Law & order, internal security" },
    { code: "IFS", name: "Indian Foreign Service", note: "Diplomacy & external affairs" },
    { code: "IRS", name: "Indian Revenue Service", note: "Direct & indirect taxation" },
    { code: "+", name: "20+ other Group A & B services", note: "IAAS, IRTS, IDAS, IIS, etc." },
  ],
  // The three-stage funnel (illustrative scale of attrition, widely reported)
  funnel: [
    { stage: "Apply", note: "~10–11 lakh apply", kind: "apply" },
    { stage: "Prelims", note: "~5 lakh appear · objective screen", kind: "prelims" },
    { stage: "Mains", note: "~10–13k qualify · 9 descriptive papers", kind: "mains" },
    { stage: "Interview", note: "~2.5–3k shortlisted · personality test", kind: "interview" },
    { stage: "Final", note: "~1000 recommended", kind: "final" },
  ],
};

// ── Official marks scheme (UPSC CSE) ──────────────────────────
export interface PaperDef { code: string; name: string; marks: number; counted: boolean; note?: string }

export const PRELIMS_PAPERS: PaperDef[] = [
  { code: "GS-I", name: "General Studies I", marks: 200, counted: false, note: "100 Q · 2h · decides the cut-off" },
  { code: "CSAT", name: "CSAT (Paper II)", marks: 200, counted: false, note: "80 Q · 2h · qualifying (33%)" },
];

export const MAINS_PAPERS: PaperDef[] = [
  { code: "LANG", name: "Indian Language (Paper A)", marks: 300, counted: false, note: "Qualifying (25%)" },
  { code: "ENG", name: "English (Paper B)", marks: 300, counted: false, note: "Qualifying (25%)" },
  { code: "ESSAY", name: "Essay (Paper I)", marks: 250, counted: true },
  { code: "GS-I", name: "General Studies I (Paper II)", marks: 250, counted: true, note: "History · Geography · Society" },
  { code: "GS-II", name: "General Studies II (Paper III)", marks: 250, counted: true, note: "Polity · Governance · IR" },
  { code: "GS-III", name: "General Studies III (Paper IV)", marks: 250, counted: true, note: "Economy · Environment · S&T · Security" },
  { code: "GS-IV", name: "General Studies IV (Paper V)", marks: 250, counted: true, note: "Ethics, Integrity & Aptitude" },
  { code: "OPT-I", name: "Optional Paper I (Paper VI)", marks: 250, counted: true },
  { code: "OPT-II", name: "Optional Paper II (Paper VII)", marks: 250, counted: true },
];

export const MAINS_WRITTEN_TOTAL = 1750;   // 7 counted papers × 250
export const INTERVIEW_MARKS = 275;
export const GRAND_TOTAL = MAINS_WRITTEN_TOTAL + INTERVIEW_MARKS; // 2025

// ── Real published topper marksheets (verifiable) ─────────────
export interface TopperSheet {
  name: string; year: number; air?: number; optional: string;
  essay: number; gs1: number; gs2: number; gs3: number; gs4: number;
  opt1: number; opt2: number; written: number; interview: number; final: number;
}
export const TOPPERS: TopperSheet[] = [
  { name: "Durishetty Anudeep", year: 2017, air: 1, optional: "Anthropology", essay: 155, gs1: 123, gs2: 123, gs3: 136, gs4: 95, opt1: 171, opt2: 147, written: 950, interview: 176, final: 1126 },
  { name: "Shubham Kumar", year: 2020, air: 1, optional: "Anthropology", essay: 134, gs1: 115, gs2: 111, gs3: 92, gs4: 106, opt1: 170, opt2: 150, written: 878, interview: 176, final: 1054 },
  { name: "Aditya Srivastava", year: 2023, air: 1, optional: "Electrical Engg.", essay: 117, gs1: 104, gs2: 132, gs3: 95, gs4: 143, opt1: 148, opt2: 160, written: 899, interview: 200, final: 1099 },
  { name: "Donuru Ananya Reddy", year: 2023, air: 3, optional: "Anthropology", essay: 136, gs1: 109, gs2: 121, gs3: 98, gs4: 136, opt1: 138, opt2: 137, written: 875, interview: 190, final: 1065 },
  { name: "P K Sidharth Ramkumar", year: 2023, optional: "Anthropology", essay: 129, gs1: 83, gs2: 119, gs3: 90, gs4: 127, opt1: 169, opt2: 157, written: 874, interview: 185, final: 1059 },
  { name: "Nausheen", year: 2023, optional: "History", essay: 137, gs1: 101, gs2: 111, gs3: 88, gs4: 118, opt1: 166, opt2: 142, written: 863, interview: 182, final: 1045 },
  { name: "Anuj Agnihotri", year: 2025, optional: "Medical Science", essay: 108, gs1: 111, gs2: 127, gs3: 103, gs4: 126, opt1: 142, opt2: 150, written: 867, interview: 204, final: 1071 },
];

// Benchmark band per counted component, computed from the real sheets above.
export interface Band { key: string; label: string; max: number; min: number; avg: number; top: number }
export function benchmarkBands(): Band[] {
  const agg = (pick: (t: TopperSheet) => number, label: string, key: string, max: number): Band => {
    const v = TOPPERS.map(pick);
    return { key, label, max, min: Math.min(...v), top: Math.max(...v), avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) };
  };
  return [
    agg((t) => t.essay, "Essay", "essay", 250),
    agg((t) => t.gs1, "GS-I", "gs1", 250),
    agg((t) => t.gs2, "GS-II", "gs2", 250),
    agg((t) => t.gs3, "GS-III", "gs3", 250),
    agg((t) => t.gs4, "GS-IV", "gs4", 250),
    agg((t) => t.opt1 + t.opt2, "Optional (both papers)", "optional", 500),
    agg((t) => t.interview, "Interview", "interview", 275),
    agg((t) => t.final, "Final total", "final", GRAND_TOTAL),
  ];
}

/**
 * A realistic blueprint to reach a target final score (default 1100),
 * anchored to topper averages. Educational target-setting, not a claim
 * about the user. Distributes the target across components in the
 * proportions toppers actually achieve.
 */
export function targetBlueprint(target = 1100): { key: string; label: string; target: number; max: number }[] {
  const bands = benchmarkBands().filter((b) => b.key !== "final");
  const baseTotal = bands.reduce((s, b) => s + b.avg, 0); // avg topper final ≈ this
  const scale = target / baseTotal;
  return bands.map((b) => ({ key: b.key, label: b.label, target: Math.round(b.avg * scale), max: b.max }));
}

// ── Subject intelligence (sources are standard, widely-used refs) ─
export interface SubjectDef { name: string; paper: string; gsCode: string; sources: string[]; note: string }
export const SUBJECTS: SubjectDef[] = [
  { name: "History", paper: "GS-I", gsCode: "GS-I", sources: ["NCERT 6–12", "Spectrum (Modern)", "Bipan Chandra", "Nitin Singhania (Art & Culture)"], note: "Ancient, Medieval, Modern, World, Post-Independence, Art & Culture" },
  { name: "Geography", paper: "GS-I", gsCode: "GS-I", sources: ["NCERT 11–12", "G.C. Leong", "Majid Husain", "Atlas"], note: "Physical, Indian, World, Human geography, mapping" },
  { name: "Polity", paper: "GS-II", gsCode: "GS-II", sources: ["Laxmikanth", "NCERT", "PRS / The Hindu"], note: "Constitution, Parliament, Judiciary, Governance, Social Justice" },
  { name: "Economy", paper: "GS-III", gsCode: "GS-III", sources: ["NCERT", "Ramesh Singh", "Economic Survey", "Budget"], note: "Macro, fiscal/monetary, agriculture, infrastructure" },
  { name: "Environment", paper: "GS-III", gsCode: "GS-III", sources: ["Shankar IAS", "current affairs"], note: "Ecology, biodiversity, climate, conservation" },
  { name: "Science & Tech", paper: "GS-III", gsCode: "GS-III", sources: ["NCERT", "current affairs", "PIB"], note: "Space, defence, biotech, IT, emerging tech" },
  { name: "Ethics", paper: "GS-IV", gsCode: "GS-IV", sources: ["Lexicon / Subba Rao", "case studies", "thinkers"], note: "Aptitude, integrity, case studies, governance ethics" },
  { name: "Essay", paper: "ESSAY", gsCode: "ESSAY", sources: ["wide reading", "practice + feedback"], note: "Philosophical & contemporary themes; structure & balance" },
];

// ── Roadmap phases (standard, well-tested preparation sequence) ─
export interface RoadmapPhase { when: string; title: string; items: string[] }
export const ROADMAP: RoadmapPhase[] = [
  { when: "Day 1", title: "Orient yourself", items: ["Read the full UPSC syllabus once", "Choose your optional subject", "Start NCERTs (Polity & Modern History)", "Begin a daily newspaper habit"] },
  { when: "Month 1", title: "Foundation", items: ["Finish core NCERTs (6–12) by subject", "Polity via Laxmikanth alongside NCERT", "Note-making system set up", "Current affairs: 30 min/day"] },
  { when: "Month 3", title: "Standard books", items: ["Spectrum, Shankar IAS, Ramesh Singh", "Start optional preparation", "First answer-writing attempts", "PYQ analysis begins"] },
  { when: "Month 6", title: "Consolidate", items: ["Complete standard sources + optional", "Join a test series (Prelims + Mains)", "Revision cycles via spaced repetition", "Essay practice fortnightly"] },
  { when: "Prelims phase (T-3 mo)", title: "Objective sprint", items: ["Daily MCQ practice + mocks", "CSAT practice if needed", "Rapid revision of factual areas", "Previous-year Prelims papers"] },
  { when: "Mains phase (post-Prelims)", title: "Writing engine", items: ["Daily answer writing (GS + optional)", "Essay every week", "Ethics case studies", "Map current affairs to GS papers"] },
  { when: "Interview phase", title: "Personality test", items: ["Build your DAF deeply", "Mock interviews + feedback", "Current affairs & opinion-building", "Know your home state & optional"] },
];

// Educational insights distilled from the real topper sheets.
export function marksInsights(): string[] {
  const b = benchmarkBands();
  const opt = b.find((x) => x.key === "optional")!;
  const gs3 = b.find((x) => x.key === "gs3")!;
  const essay = b.find((x) => x.key === "essay")!;
  const intv = b.find((x) => x.key === "interview")!;
  return [
    `Optional decides ranks: these toppers scored ${opt.min}–${opt.top}/500 (avg ${opt.avg}). A strong optional (~300+) is the single biggest lever.`,
    `GS-III is the great equaliser — even AIR-1 holders scored only ${gs3.min}–${gs3.top}/250 (avg ${gs3.avg}). Don't over-invest chasing marginal GS-III marks.`,
    `Essay is high-leverage and under-practised: ${essay.min}–${essay.top}/250 (avg ${essay.avg}). One disciplined essay a week compounds.`,
    `Interview swings ${intv.top - intv.min} marks (${intv.min}–${intv.top}/275). It is scored on personality, not knowledge — start mocks early.`,
    `Totals cluster tightly (1045–1126 here): the final rank turns on Optional + Essay + Interview, not on memorising more GS.`,
  ];
}
