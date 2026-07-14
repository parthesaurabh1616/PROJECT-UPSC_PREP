/* ════════════════════════════════════════════════════════════
   LAKSHYA — seed / demo data
   Replace these with Prisma queries once the database is live.
   ════════════════════════════════════════════════════════════ */

export const user = {
  name: "Saurabh",
  initials: "SP",
  dayOfPrep: 47,
  streak: 47,
  longestStreak: 47,
  tier: "Tapasvi · Tier IV",
  xp: 12840,
};

export const exam = {
  prelims: { label: "Prelims", date: "2027-05-23T00:00:00", note: "CSE 2027 cycle" },
  mains: { label: "Mains", date: "2027-10-22T00:00:00", note: "Written examination" },
  interview: { label: "Interview", date: "2028-02-15T00:00:00", note: "Personality test" },
};

export const shloka = {
  sanskrit: "योगः कर्मसु कौशलम्",
  meaning: "Excellence in action is yoga.",
  source: "Bhagavad Gita 2.50",
};

/* ── Headline stats ── */
export const stats = [
  {
    label: "Overall Preparation",
    value: 62,
    unit: "%",
    foot: "↑ 4% this week · Polity leads at 78%",
    ring: 62,
    tone: "accent" as const,
  },
  {
    label: "Today · Study Hours",
    value: 4.2,
    unit: " / 8h",
    foot: "Deep work 3h 10m · 7 of 12 pomodoros",
    ring: 53,
    tone: "accent-2" as const,
  },
  {
    label: "Consistency Score",
    value: 87,
    unit: "/100",
    foot: "Top 6% of aspirants · no burnout signals",
    ring: 87,
    tone: "warning" as const,
  },
];

/* ── Subject mastery ── */
export const subjects = [
  { name: "Polity", paper: "GS-II", pct: 78 },
  { name: "Modern History", paper: "GS-I", pct: 71 },
  { name: "Geography", paper: "GS-I", pct: 64 },
  { name: "Economy", paper: "GS-III", pct: 58 },
  { name: "Ancient & Medieval", paper: "GS-I", pct: 52 },
  { name: "Environment", paper: "GS-III", pct: 44 },
  { name: "Science & Tech", paper: "GS-III", pct: 38 },
  { name: "Ethics", paper: "GS-IV", pct: 35 },
  { name: "PSIR (Optional)", paper: "OPT", pct: 48 },
];

/* ── Today's focus ── */
export const todayTasks = [
  { text: "Read Indian Express front page + edit-page", tag: "CURRENT AFFAIRS", time: "06:30", dur: "45m", done: true },
  { text: "Laxmikanth Ch.14 — Parliament: Functions & Powers", tag: "GS-II POLITY", time: "08:15", dur: "1h 20m", done: true },
  { text: "Flashcard review — 24 cards (Polity, History)", tag: "REVISION", time: "10:00", dur: "22m", done: true },
  { text: "Mains answer writing — Q3 from GS-II 2023", tag: "ANSWER WRITING", time: "11:00", dur: "15m", done: true },
  { text: "Spectrum Ch.18 — Quit India Movement", tag: "GS-I HISTORY", time: "14:00", dur: "55m", done: true },
  { text: "Shankar IAS Ch.6 — Biodiversity", tag: "GS-III ENV", time: "16:00", dur: "1h 15m", done: false },
  { text: "PYQ practice — 20 MCQs, Modern History", tag: "PRELIMS", time: "17:30", dur: "30m", done: false },
  { text: "PSIR — India and the nuclear question (class notes)", tag: "OPTIONAL", time: "19:00", dur: "1h 30m", done: false },
  { text: "End-of-day reflection · update revision log", tag: "SHUTDOWN", time: "21:30", dur: "10m", done: false },
];

/* ── AI insights ── */
export const insights = [
  {
    tone: "danger" as const,
    title: "Retention decay detected",
    body: "Polity → Emergency Provisions last revised 19 days ago. Predicted recall: 41%.",
    meta: "SUGGEST · Add 6 cards to today's queue",
  },
  {
    tone: "accent" as const,
    title: "Cross-link opportunity",
    body: "Three editorials this week mention UNCLOS & maritime boundaries — strong overlap with GS-II IR.",
    meta: "SUGGEST · Build one linked note",
  },
  {
    tone: "success" as const,
    title: "Momentum building",
    body: "You scored +12% above trend on Modern History MCQs last week.",
    meta: "CELEBRATE · Keep this rhythm",
  },
  {
    tone: "accent" as const,
    title: "PYQ pattern flagged",
    body: "Environment has appeared 11 times in 5 Prelims under similar framing. Schedule a 90-min block.",
    meta: "PREDICTION · 84% confidence",
  },
];

/* ── Quick access ── */
export const quickLinks = [
  { name: "Notes", meta: "247 notes · 12 drafts", icon: "FileText", href: "/notes" },
  { name: "Current Affairs", meta: "14 unread · 3 priority", icon: "Newspaper", href: "/current-affairs" },
  { name: "Revision", meta: "38 cards due today", icon: "RotateCcw", href: "/revision" },
  { name: "AI Mentor", meta: "Ready · 14 threads", icon: "Sparkles", href: "/mentor" },
  { name: "Library", meta: "23 books · 31 papers", icon: "Library", href: "/library" },
  { name: "PYQ Vault", meta: "2003–2024 · pattern AI", icon: "Target", href: "/library" },
  { name: "Test Series", meta: "Next: Polity (Sat)", icon: "ClipboardCheck", href: "/revision" },
  { name: "Answer Writing", meta: "47 answers evaluated", icon: "PenLine", href: "/mentor" },
];

/* ── AI Mentor: conversation history ── */
export const conversations = [
  { id: "c1", title: "Doctrine of basic structure", group: "Today", active: true },
  { id: "c2", title: "Writ vs. judicial review", group: "Today" },
  { id: "c3", title: "10 MCQs — Mauryan administration", group: "Today" },
  { id: "c4", title: "Summarise Economic Survey Ch.2", group: "This week" },
  { id: "c5", title: "Why-in-news: UNCLOS ruling", group: "This week" },
  { id: "c6", title: "Evaluate my GS-II answer (UCC)", group: "This week" },
  { id: "c7", title: "Ethics case study — bureaucratic dilemma", group: "This week" },
  { id: "c8", title: "Mind map: Indian monsoon system", group: "Earlier" },
  { id: "c9", title: "PYQ trends in Environment 2015–24", group: "Earlier" },
  { id: "c10", title: "Interview prep — DAF discussion", group: "Earlier" },
];

export const mentorSuggestions = [
  "Today's editorial → notes",
  "Generate 10 MCQs on this",
  "Evaluate my last answer",
  "Mind map this topic",
  "Link to my Laxmikanth notes",
  "Mock interview question",
];

/* ── Notes: workspace tree ── */
export interface TreeNode {
  label: string;
  icon?: string;
  children?: TreeNode[];
  active?: boolean;
}
export const notesTree: TreeNode[] = [
  {
    label: "GS-I — History & Geography",
    icon: "BookMarked",
    children: [
      { label: "Modern History" },
      { label: "Ancient India" },
      { label: "World Geography" },
      { label: "Indian Geography" },
    ],
  },
  {
    label: "GS-II — Polity & IR",
    icon: "Scale",
    children: [
      { label: "Constitutional Framework" },
      { label: "Basic Structure Doctrine", active: true },
      { label: "Fundamental Rights" },
      { label: "Parliament & Federalism" },
      { label: "International Relations" },
    ],
  },
  { label: "GS-III — Economy & Environment", icon: "Coins" },
  { label: "GS-IV — Ethics", icon: "Compass" },
  { label: "Optional — PSIR", icon: "GraduationCap" },
  { label: "Current Affairs", icon: "Newspaper" },
  { label: "Essays", icon: "PenLine" },
];

export const noteBacklinks = [
  { title: "Kesavananda Bharati case", excerpt: "…the doctrine was formally laid down by a 13-judge bench…" },
  { title: "Article 368 — Amendment", excerpt: "…Parliament's plenary power is subject to the basic structure…" },
  { title: "NJAC Verdict — 2015", excerpt: "…struck down for violating judicial independence…" },
  { title: "Judicial Review in India", excerpt: "…review itself was held to be a basic feature…" },
  { title: "42nd Amendment Act 1976", excerpt: "…inserted clauses later struck down in Minerva Mills…" },
  { title: "Mains GS-II Q12 (2019)", excerpt: "PYQ" },
];

/* ── Knowledge graph ── */
export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  type: "center" | "concept" | "case" | "pyq";
}
export const graphNodes: GraphNode[] = [
  { id: "center", label: "Basic Structure", x: 450, y: 195, r: 15, type: "center" },
  { id: "kesav", label: "Kesavananda 1973", x: 250, y: 95, r: 11, type: "case" },
  { id: "minerva", label: "Minerva Mills 1980", x: 665, y: 95, r: 11, type: "case" },
  { id: "golak", label: "Golak Nath 1967", x: 150, y: 200, r: 10, type: "case" },
  { id: "shankari", label: "Shankari Prasad 1951", x: 215, y: 305, r: 10, type: "case" },
  { id: "njac", label: "NJAC 2015", x: 770, y: 220, r: 10, type: "case" },
  { id: "art368", label: "Article 368", x: 450, y: 58, r: 10, type: "concept" },
  { id: "art13", label: "Article 13", x: 355, y: 80, r: 9, type: "concept" },
  { id: "jr", label: "Judicial Review", x: 585, y: 65, r: 10, type: "concept" },
  { id: "fed", label: "Federalism", x: 730, y: 295, r: 10, type: "concept" },
  { id: "sec", label: "Secularism", x: 625, y: 325, r: 9, type: "concept" },
  { id: "fr", label: "Fundamental Rights", x: 315, y: 320, r: 11, type: "concept" },
  { id: "ji", label: "Judicial Independence", x: 825, y: 155, r: 10, type: "concept" },
  { id: "pyq19", label: "Mains 2019 Q12", x: 95, y: 120, r: 8, type: "pyq" },
  { id: "pyq21", label: "Prelims 2021 Q8", x: 90, y: 290, r: 8, type: "pyq" },
  { id: "pyq23", label: "Mains 2023 Q3", x: 830, y: 305, r: 8, type: "pyq" },
];
export const graphLinks: [string, string][] = [
  ["center", "kesav"], ["center", "minerva"], ["center", "golak"],
  ["center", "shankari"], ["center", "njac"], ["center", "art368"],
  ["center", "art13"], ["center", "jr"], ["center", "fed"],
  ["center", "sec"], ["center", "fr"], ["center", "ji"],
  ["kesav", "art368"], ["minerva", "art368"], ["golak", "art13"],
  ["shankari", "art13"], ["njac", "ji"], ["ji", "jr"],
  ["kesav", "pyq19"], ["golak", "pyq21"], ["njac", "pyq23"],
];

/* ── Current Affairs ── */
export interface Article {
  title: string;
  source: string;
  priority?: "high" | "normal";
  category: string;
  whyInNews: string;
  background?: string;
  keyFacts?: string;
  prelims: string;
  mains: string;
  third: { label: string; text: string };
  tags: string[];
}
export const articles: Article[] = [
  {
    title: "Supreme Court upholds sub-classification within SC/ST quotas",
    source: "The Hindu · Front Page · 20 May 2026",
    priority: "high",
    category: "POLITY",
    whyInNews:
      "A 7-judge bench, by 6:1 majority, held that states may sub-classify Scheduled Castes and Scheduled Tribes for reservations — overruling the 2004 E.V. Chinnaiah ruling.",
    background:
      "The petition arose from a Punjab law granting 50% of SC quota to Valmikis and Mazhabi Sikhs. The Court invoked Articles 14, 15(4), 16(4) and 341 to hold that SCs are not a homogeneous group and that intra-group differentiation by relative backwardness is constitutional.",
    keyFacts:
      "7-judge bench · E.V. Chinnaiah (2004) overruled · creamy layer within SC/ST endorsed by 4 judges · Art. 341 identification stays with the President; sub-classification is state legislative competence.",
    prelims: "Articles 14, 15, 16, 341 · landmark cases · creamy-layer doctrine.",
    mains: "GS-II — 'Substantive equality & constitutional morality' (15-marker).",
    third: { label: "Essay / Interview", text: "Equality of opportunity vs. equality of outcome." },
    tags: ["linked · Fundamental Rights", "linked · Reservation Policy", "+3 MCQs", "PYQ overlap · 4"],
  },
  {
    title: "RBI's Monetary Policy Committee holds repo rate at 6.25%, turns dovish",
    source: "Indian Express · Business · 20 May 2026",
    category: "ECONOMY",
    whyInNews:
      "The MPC's fourth bi-monthly review keeps the repo rate unchanged but shifts its stance to 'neutral' amid easing CPI (3.4%). Three of six members voted for a 25-bps cut.",
    background:
      "Connects to the inflation-targeting framework (RBI Act amendment, 2016), the CPI vs WPI debate, and the growth–price-stability trade-off.",
    keyFacts:
      "Repo 6.25% · CPI 3.4% · stance now 'neutral' · MPC = 6 members, 3 RBI + 3 government-appointed · tools: LAF, SDF, MSF.",
    prelims: "MPC composition · inflation-targeting band · monetary tools.",
    mains: "GS-III — 'Issues relating to growth, monetary & fiscal policy'.",
    third: { label: "Essay", text: "Stability with growth — the central-banking dilemma." },
    tags: ["linked · Monetary Policy", "+2 MCQs", "Economy"],
  },
  {
    title: "India–EU FTA enters final stretch; carbon border tax a sticking point",
    source: "The Hindu · International · 20 May 2026",
    category: "IR",
    whyInNews:
      "The 11th round of India–EU FTA talks concluded in Brussels with convergence on goods and services, but divergence persists over CBAM, data localisation and geographical indications.",
    background:
      "CBAM — the EU Carbon Border Adjustment Mechanism — would tax carbon-intensive imports, affecting Indian steel and aluminium exports.",
    keyFacts:
      "11th negotiating round · CBAM transition phase from 2026 · GI and data-localisation chapters unresolved · WTO MFN implications.",
    prelims: "FTA basics · CBAM · WTO MFN principle.",
    mains: "GS-II — 'Bilateral & global groupings affecting India's interests'.",
    third: { label: "GS-III", text: "Climate-change negotiations and trade trade-offs." },
    tags: ["IR", "Trade", "Climate", "+1 essay note"],
  },
];

/* ── Revision ── */
export const revStats = [
  { value: "1,420", label: "Total cards" },
  { value: "38", label: "Due today" },
  { value: "94%", label: "7-day retention" },
  { value: "12.4d", label: "Avg. interval" },
];

export interface Flashcard {
  front: string;
  back: string;
  source: string;
  difficulty: number;
  lastSeen: string;
  interval: string;
}
export const flashcards: Flashcard[] = [
  {
    front:
      "In Minerva Mills v. Union of India (1980), which two clauses of Article 368 were struck down, and on what reasoning?",
    back:
      "Clauses (4) and (5) of Article 368, inserted by the 42nd Amendment (1976), were struck down. Clause (4) barred judicial review of amendments; clause (5) declared Parliament's amending power unlimited. The Court held that the limited nature of the amending power is itself a basic feature — an unlimited power would let Parliament abolish the Constitution.",
    source: "Note → Basic Structure Doctrine",
    difficulty: 3,
    lastSeen: "11 days ago",
    interval: "14d",
  },
  {
    front: "Name any four features the Supreme Court has identified as part of the 'basic structure'.",
    back:
      "Supremacy of the Constitution, rule of law, judicial review, separation of powers, federalism, secularism, free and fair elections, and the dignity of the individual. The list is illustrative, never exhaustive.",
    source: "Note → Basic Structure Doctrine",
    difficulty: 2,
    lastSeen: "6 days ago",
    interval: "9d",
  },
  {
    front: "What did the Kesavananda Bharati (1973) verdict decide, and by what margin?",
    back:
      "A 13-judge bench, by a 7:6 majority, held that Parliament can amend any part of the Constitution under Article 368 but cannot alter or destroy its 'basic structure'. It overruled Golak Nath (1967).",
    source: "Note → Basic Structure Doctrine",
    difficulty: 2,
    lastSeen: "8 days ago",
    interval: "16d",
  },
];

export const retentionWatch = [
  { tone: "danger" as const, title: "Emergency Provisions (Art. 352–360)", meta: "Last seen 19d · predicted 41%" },
  { tone: "accent" as const, title: "Bhakti & Sufi movements", meta: "Last seen 14d · predicted 58%" },
  { tone: "accent" as const, title: "Monetary policy instruments", meta: "In news today · predicted 64%" },
];

export const revisionModes = [
  "7-day rolling revision",
  "30-day deep cycle",
  "Prelims crash (45-day)",
  "Mains enrichment mode",
  "Rapid flashcard sprint",
];

/* ── Library ── */
export interface Book {
  title: string;
  author: string;
  kind: string;
  completion: number;
  revisions: number;
  pages: number;
  accent: string;
}
export const library: Book[] = [
  { title: "Indian Polity", author: "M. Laxmikanth", kind: "Standard", completion: 88, revisions: 3, pages: 912, accent: "accent" },
  { title: "A Brief History of Modern India", author: "Spectrum", kind: "Standard", completion: 74, revisions: 2, pages: 560, accent: "accent-2" },
  { title: "Environment", author: "Shankar IAS", kind: "Standard", completion: 44, revisions: 1, pages: 480, accent: "success" },
  { title: "Indian Economy", author: "Ramesh Singh", kind: "Standard", completion: 58, revisions: 1, pages: 720, accent: "warning" },
  { title: "Geography of India", author: "Majid Husain", kind: "Standard", completion: 51, revisions: 0, pages: 640, accent: "accent" },
  { title: "Certificate Physical & Human Geography", author: "G.C. Leong", kind: "Standard", completion: 92, revisions: 4, pages: 420, accent: "accent-2" },
  { title: "NCERT — History (Class VI–XII)", author: "NCERT", kind: "NCERT", completion: 100, revisions: 2, pages: 1840, accent: "success" },
  { title: "NCERT — Geography (Class VI–XII)", author: "NCERT", kind: "NCERT", completion: 100, revisions: 2, pages: 1620, accent: "success" },
  { title: "Economic Survey 2025–26", author: "Ministry of Finance", kind: "Govt Report", completion: 30, revisions: 0, pages: 540, accent: "warning" },
  { title: "Global Politics (PSIR)", author: "Andrew Heywood", kind: "Optional", completion: 0, revisions: 0, pages: 560, accent: "accent" },
];

export const libraryStats = [
  { value: "23", label: "Books tracked" },
  { value: "31", label: "Newspapers stored" },
  { value: "14", label: "Books completed" },
  { value: "9.4 GB", label: "In your library" },
];
