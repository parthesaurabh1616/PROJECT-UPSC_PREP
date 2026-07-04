/* ════════════════════════════════════════════════════════════════
   PSIR class schedule — StudyIQ July 2026 batch (decoded from the
   official timetable PDF the user provided). Real dates, real topics.
   Used to propose CLASS tickets in the sprint planner (IAS OS FR-2/FR-4).
   Faculty: Shashank Tyagi · Live classes Mon–Sat · starts 8 Jul 2026 12:00.
   ════════════════════════════════════════════════════════════════ */

export interface PsirClass {
  from: string;              // ISO date (inclusive)
  to: string;                // ISO date (inclusive)
  paper: "1A" | "1B" | "2A" | "2B" | "ORIENTATION";
  topicNo: number | null;    // topic number within the paper section
  title: string;
}

export interface PsirTest { n: number; date: string; name: string }

export const PSIR_PAPER_LABEL: Record<string, string> = {
  "1A": "Paper 1A · Political Theory",
  "1B": "Paper 1B · Indian Government & Politics",
  "2A": "Paper 2A · Comparative & International Politics",
  "2B": "Paper 2B · India and the World",
  ORIENTATION: "Orientation",
};

export const PSIR_CLASSES: PsirClass[] = [
  { from: "2026-07-08", to: "2026-07-08", paper: "ORIENTATION", topicNo: null, title: "Orientation class" },
  // ── Paper 2 Part B: India and the World (opening block) ──
  { from: "2026-07-09", to: "2026-07-09", paper: "2B", topicNo: 7, title: "India and the Nuclear Question: changing perceptions and policy" },
  { from: "2026-07-10", to: "2026-07-14", paper: "2B", topicNo: 8, title: "Recent developments in Indian Foreign Policy: Afghanistan, Iraq & West Asia; US & Israel; new world order" },
  // ── Paper 1 Part A: Political Theory ──
  { from: "2026-07-15", to: "2026-07-28", paper: "1A", topicNo: 10, title: "Western Political Thought: Plato, Aristotle, Machiavelli, Hobbes, Locke, J.S. Mill, Marx, Gramsci, Hannah Arendt" },
  { from: "2026-07-29", to: "2026-08-08", paper: "1A", topicNo: 9, title: "Indian Political Thought: Dharamshastra, Arthashastra, Buddhist traditions; Sir Syed, Aurobindo, Gandhi, Ambedkar, M.N. Roy" },
  { from: "2026-08-09", to: "2026-08-14", paper: "1A", topicNo: 2, title: "Theories of the state: Liberal, Neo-liberal, Marxist, Pluralist, Post-colonial, Feminist" },
  { from: "2026-08-17", to: "2026-08-18", paper: "1A", topicNo: 3, title: "Justice: Rawls and communitarian critiques" },
  { from: "2026-08-19", to: "2026-08-19", paper: "1A", topicNo: 4, title: "Equality: social, political, economic; equality vs freedom; affirmative action" },
  { from: "2026-08-20", to: "2026-08-20", paper: "1A", topicNo: 5, title: "Rights: meaning, theories, kinds; Human Rights" },
  { from: "2026-08-23", to: "2026-08-23", paper: "1A", topicNo: 6, title: "Democracy: classical & contemporary theories; representative, participatory, deliberative" },
  { from: "2026-08-24", to: "2026-08-26", paper: "1A", topicNo: 7, title: "Concept of power: hegemony, ideology, legitimacy" },
  { from: "2026-08-27", to: "2026-08-31", paper: "1A", topicNo: 8, title: "Political Ideologies: Liberalism, Socialism, Marxism, Fascism, Gandhism, Feminism" },
  { from: "2026-09-01", to: "2026-09-01", paper: "1A", topicNo: 1, title: "Political theory: meaning and approaches" },
  // ── Paper 1 Part B: Indian Government and Politics ──
  { from: "2026-09-02", to: "2026-09-06", paper: "1B", topicNo: 1, title: "Indian Nationalism: strategies of the freedom struggle; perspectives on the national movement" },
  { from: "2026-09-07", to: "2026-09-10", paper: "1B", topicNo: 2, title: "Making of the Indian Constitution: British legacies; social & political perspectives" },
  { from: "2026-09-11", to: "2026-09-21", paper: "1B", topicNo: 3, title: "Salient features: Preamble, FR & FD, DPSP; parliamentary system; judicial review; Basic Structure" },
  { from: "2026-09-22", to: "2026-10-15", paper: "1B", topicNo: 4, title: "Principal organs of Union & State governments: Executive, Legislature, Supreme Court / High Courts" },
  { from: "2026-10-16", to: "2026-10-18", paper: "1B", topicNo: 5, title: "Grassroots democracy: Panchayati Raj, municipal government; 73rd & 74th Amendments" },
  { from: "2026-10-19", to: "2026-10-24", paper: "1B", topicNo: 6, title: "Statutory institutions/commissions: EC, CAG, FC, UPSC, NCSC, NCST, NCW, NHRC, NCM, NCBC" },
  { from: "2026-10-25", to: "2026-10-31", paper: "1B", topicNo: 7, title: "Federalism: constitutional provisions; centre–state relations; regional aspirations; inter-state disputes" },
  { from: "2026-11-01", to: "2026-11-09", paper: "1B", topicNo: 8, title: "Planning & economic development: Nehruvian/Gandhian; Green Revolution; land reforms; liberalization" },
  { from: "2026-11-10", to: "2026-11-15", paper: "1B", topicNo: 9, title: "Caste, religion and ethnicity in Indian politics" },
  { from: "2026-11-16", to: "2026-11-20", paper: "1B", topicNo: 10, title: "Party system: national & regional parties; coalition politics; pressure groups; electoral behaviour" },
  { from: "2026-11-21", to: "2026-11-24", paper: "1B", topicNo: 11, title: "Social movements: civil liberties & human rights; women's; environmental" },
  // ── Paper 2 Part A: Comparative Political Analysis & International Politics ──
  { from: "2026-11-25", to: "2026-12-07", paper: "2A", topicNo: 5, title: "Approaches to the study of IR: Idealist, Realist, Marxist, Functionalist, Systems theory" },
  { from: "2026-12-08", to: "2026-12-13", paper: "2A", topicNo: 6, title: "Key IR concepts: national interest, security, power; balance of power & deterrence; collective security; globalisation" },
  { from: "2026-12-14", to: "2026-12-20", paper: "2A", topicNo: 7, title: "Changing international political order: bipolarity & Cold War; NAM; Soviet collapse, unipolarity" },
  { from: "2026-12-21", to: "2026-12-24", paper: "2A", topicNo: 8, title: "International economic system: Bretton Woods → WTO; NIEO; globalisation" },
  { from: "2026-12-26", to: "2026-12-28", paper: "2A", topicNo: 9, title: "United Nations: role & record; specialized agencies; UN reforms" },
  { from: "2026-12-29", to: "2026-12-30", paper: "2A", topicNo: 11, title: "Contemporary global concerns: democracy, human rights, environment, gender justice, terrorism, nuclear proliferation" },
  { from: "2026-12-31", to: "2026-12-31", paper: "2A", topicNo: 10, title: "Regionalisation of world politics: EU, ASEAN, APEC, SAARC, NAFTA" },
  { from: "2027-01-01", to: "2027-01-05", paper: "2A", topicNo: 3, title: "Politics of representation & participation: parties, pressure groups, social movements" },
  { from: "2027-01-06", to: "2027-01-07", paper: "2A", topicNo: 4, title: "Globalization: responses from developed and developing societies" },
  { from: "2027-01-08", to: "2027-01-10", paper: "2A", topicNo: 1, title: "Comparative politics: nature & approaches; political economy / sociology perspectives; limitations" },
  { from: "2027-01-11", to: "2027-01-11", paper: "2A", topicNo: 2, title: "State in comparative perspective: capitalist & socialist economies; advanced industrial & developing societies" },
  // ── Paper 2 Part B: India and the World (main block) ──
  { from: "2027-01-12", to: "2027-01-20", paper: "2B", topicNo: 1, title: "Indian foreign policy: determinants, institutions, continuity & change" },
  { from: "2027-01-21", to: "2027-01-29", paper: "2B", topicNo: 2, title: "India and NAM: phases; current role" },
  { from: "2027-01-30", to: "2027-01-30", paper: "2B", topicNo: 3, title: "India and South Asia: SAARC, SAFTA, Look East; impediments to cooperation" },
  { from: "2027-01-31", to: "2027-01-31", paper: "2B", topicNo: 4, title: "India and the Global South: Africa & Latin America; NIEO, WTO negotiations" },
  { from: "2027-02-01", to: "2027-02-10", paper: "2B", topicNo: 5, title: "India and global centres of power: USA, EU, Japan, China, Russia" },
];

export const PSIR_TESTS: PsirTest[] = [
  { n: 1,  date: "2026-08-22", name: "Paper 1A — topics 10, 2, 3, 4" },
  { n: 2,  date: "2026-09-19", name: "Paper 1A — topics 5–9, 1" },
  { n: 3,  date: "2026-10-17", name: "Paper 1B — topics 1–5" },
  { n: 4,  date: "2026-11-14", name: "Paper 1B — topics 6–11" },
  { n: 5,  date: "2026-12-05", name: "Paper 2A — topics 6–11" },
  { n: 6,  date: "2026-12-19", name: "Paper 2A — topics 1–5" },
  { n: 7,  date: "2026-12-31", name: "Paper 2B — topics 1–4" },
  { n: 8,  date: "2027-01-30", name: "Paper 2B — topics 5–8" },
  { n: 9,  date: "2027-02-06", name: "Paper 1 — full comprehensive" },
  { n: 10, date: "2027-02-06", name: "Paper 2 — full comprehensive" },
  { n: 11, date: "2027-02-13", name: "Paper 1 — full comprehensive" },
  { n: 12, date: "2027-02-13", name: "Paper 2 — full comprehensive" },
];

/** Classes overlapping [start, end] (date-only comparison). */
export function psirClassesInRange(start: Date, end: Date): PsirClass[] {
  const s = start.getTime(), e = end.getTime();
  return PSIR_CLASSES.filter((c) => new Date(c.to).getTime() >= s && new Date(c.from).getTime() <= e);
}

/** Tests falling in [start, end]. */
export function psirTestsInRange(start: Date, end: Date): PsirTest[] {
  const s = start.getTime(), e = end.getTime();
  return PSIR_TESTS.filter((t) => { const d = new Date(t.date).getTime(); return d >= s && d <= e; });
}
