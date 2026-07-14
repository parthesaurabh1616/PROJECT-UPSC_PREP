/* ════════════════════════════════════════════════════════════
   OFFICIAL UPSC CSE SYLLABUS — verbatim structured reference.
   Source: UPSC Civil Services Examination official syllabus
   (Prelims Paper I & II; Mains Essay, GS-I…IV) and the optional
   syllabi (PSIR — the sealed choice — plus Public Administration
   for reference). This is factual reference data — every topic
   is the Commission's own wording. Live platform connections
   (PYQ / NCERT / current affairs) are layered on at read time
   via semantic search, never invented here.
   ════════════════════════════════════════════════════════════ */

export interface SylNode { id: string; title: string; items?: string[] }
export interface SylSection { heading?: string; nodes: SylNode[] }
export interface SylPaper {
  code: string;            // GS-I, CSAT, ESSAY, GS1…GS4, OPT-SOC-I …
  name: string;
  stage: "prelims" | "mains";
  marks: number;
  counted: boolean;        // counts toward the final merit
  kind: "GS" | "CSAT" | "ESSAY" | "OPTIONAL";
  note?: string;
  sections: SylSection[];
}

const n = (id: string, title: string, items?: string[]): SylNode => ({ id, title, items });

// ── PRELIMS ───────────────────────────────────────────────────
const PRELIMS: SylPaper[] = [
  {
    code: "GS-I", name: "General Studies Paper I", stage: "prelims", marks: 200, counted: false,
    kind: "GS", note: "100 questions · 2 hours · decides the Prelims cut-off",
    sections: [{ nodes: [
      n("p1-current", "Current events of national and international importance"),
      n("p1-history", "History of India and Indian National Movement"),
      n("p1-geo", "Indian and World Geography", ["Physical, Social and Economic Geography of India and the World"]),
      n("p1-polity", "Indian Polity and Governance", ["Constitution", "Political System", "Panchayati Raj", "Public Policy", "Rights Issues"]),
      n("p1-econ", "Economic and Social Development", ["Sustainable Development", "Poverty", "Inclusion", "Demographics", "Social Sector initiatives"]),
      n("p1-env", "Environmental Ecology, Bio-diversity and Climate Change", ["General issues that do not require subject specialization"]),
      n("p1-science", "General Science"),
    ] }],
  },
  {
    code: "CSAT", name: "General Studies Paper II (CSAT)", stage: "prelims", marks: 200, counted: false,
    kind: "CSAT", note: "80 questions · 2 hours · qualifying (33% required)",
    sections: [{ nodes: [
      n("csat-comp", "Comprehension"),
      n("csat-inter", "Interpersonal skills including communication skills"),
      n("csat-logic", "Logical reasoning and analytical ability"),
      n("csat-decision", "Decision-making and problem-solving"),
      n("csat-mental", "General mental ability"),
      n("csat-numeracy", "Basic numeracy & Data interpretation", ["Numbers and their relations, orders of magnitude (Class X level)", "Charts, graphs, tables, data sufficiency (Class X level)"]),
      n("csat-english", "English Language Comprehension skills (Class X level)"),
    ] }],
  },
];

// ── MAINS — Essay + GS-I…IV ───────────────────────────────────
const MAINS_GS: SylPaper[] = [
  {
    code: "ESSAY", name: "Paper I — Essay", stage: "mains", marks: 250, counted: true, kind: "ESSAY",
    note: "Two essays from a choice of topics; no fixed syllabus",
    sections: [{ nodes: [
      n("essay-1", "Write essays on multiple topics", ["Keep closely to the subject", "Arrange ideas in an orderly fashion", "Write concisely; credit for effective and exact expression"]),
    ] }],
  },
  {
    code: "GS-I", name: "Paper II — GS-I: Indian Heritage & Culture, History and Geography of the World and Society", stage: "mains", marks: 250, counted: true, kind: "GS",
    sections: [
      { heading: "Indian Heritage & Culture", nodes: [
        n("g1-culture", "Indian culture", ["Salient aspects of Art Forms, Literature and Architecture from ancient to modern times"]),
      ] },
      { heading: "History", nodes: [
        n("g1-modern", "Modern Indian history (mid-18th century to present)", ["Significant events, personalities, issues"]),
        n("g1-freedom", "The Freedom Struggle", ["Various stages and important contributors/contributions from different parts of the country"]),
        n("g1-postind", "Post-independence consolidation and reorganization within the country"),
        n("g1-world", "History of the world (from the 18th century)", ["Industrial revolution, world wars, redrawal of national boundaries", "Colonization, decolonization", "Political philosophies — communism, capitalism, socialism — their forms and effect on society"]),
      ] },
      { heading: "Indian Society", nodes: [
        n("g1-society", "Salient features of Indian Society, Diversity of India"),
        n("g1-women", "Role of women and women's organization", ["Population and associated issues, poverty and developmental issues, urbanization — problems and remedies"]),
        n("g1-global", "Effects of globalization on Indian society"),
        n("g1-empower", "Social empowerment, communalism, regionalism & secularism"),
      ] },
      { heading: "Geography of the World", nodes: [
        n("g1-physgeo", "Salient features of world's physical geography"),
        n("g1-resources", "Distribution of key natural resources across the world", ["Factors responsible for the location of primary, secondary and tertiary sector industries"]),
        n("g1-geophys", "Important Geophysical phenomena", ["Earthquakes, Tsunami, Volcanic activity, cyclones", "Changes in critical geographical features (water-bodies, ice-caps) and in flora and fauna"]),
      ] },
    ],
  },
  {
    code: "GS-II", name: "Paper III — GS-II: Governance, Constitution, Polity, Social Justice and International Relations", stage: "mains", marks: 250, counted: true, kind: "GS",
    sections: [
      { heading: "Constitution & Polity", nodes: [
        n("g2-const", "Indian Constitution", ["Historical underpinnings, evolution, features, amendments, significant provisions and basic structure"]),
        n("g2-fed", "Functions and responsibilities of the Union and the States", ["Issues and challenges of the federal structure; devolution of powers and finances to local levels"]),
        n("g2-sep", "Separation of powers between organs; dispute redressal mechanisms and institutions"),
        n("g2-comp", "Comparison of the Indian constitutional scheme with that of other countries"),
        n("g2-parl", "Parliament and State Legislatures", ["Structure, functioning, conduct of business, powers & privileges"]),
        n("g2-exec", "Structure, organization and functioning of the Executive and the Judiciary"),
        n("g2-rpa", "Salient features of the Representation of People's Act"),
        n("g2-bodies", "Constitutional, statutory, regulatory and quasi-judicial bodies", ["Appointments, powers, functions and responsibilities"]),
      ] },
      { heading: "Governance & Social Justice", nodes: [
        n("g2-policy", "Government policies and interventions for development", ["Issues arising out of their design and implementation"]),
        n("g2-dev", "Development processes and the development industry", ["Role of NGOs, SHGs, groups, donors, charities, stakeholders"]),
        n("g2-welfare", "Welfare schemes for vulnerable sections; mechanisms, laws, institutions and bodies for their protection"),
        n("g2-social", "Social Sector/Services — Health, Education, Human Resources; poverty and hunger"),
        n("g2-egov", "Governance, transparency and accountability", ["E-governance applications, models; citizens charters; institutional measures"]),
        n("g2-civil", "Role of civil services in a democracy"),
      ] },
      { heading: "International Relations", nodes: [
        n("g2-neigh", "India and its neighbourhood relations"),
        n("g2-group", "Bilateral, regional and global groupings and agreements involving/affecting India"),
        n("g2-diaspora", "Effect of policies and politics of developed and developing countries on India's interests; Indian diaspora"),
        n("g2-intl", "Important International institutions, agencies and fora — structure, mandate"),
      ] },
    ],
  },
  {
    code: "GS-III", name: "Paper IV — GS-III: Technology, Economic Development, Biodiversity, Environment, Security and Disaster Management", stage: "mains", marks: 250, counted: true, kind: "GS",
    sections: [
      { heading: "Economy & Agriculture", nodes: [
        n("g3-econ", "Indian Economy", ["Planning, mobilization of resources, growth, development and employment"]),
        n("g3-inclusive", "Inclusive growth and issues arising from it"),
        n("g3-budget", "Government Budgeting"),
        n("g3-crops", "Major crops, cropping patterns, irrigation; storage, transport and marketing of agricultural produce; e-technology for farmers"),
        n("g3-subsidy", "Farm subsidies and MSP; PDS — objectives, functioning, limitations; buffer stocks and food security; technology missions; animal-rearing economics"),
        n("g3-food", "Food processing and related industries — scope, location, supply chain management"),
        n("g3-land", "Land reforms in India"),
        n("g3-lib", "Effects of liberalization on the economy; industrial policy and industrial growth"),
        n("g3-infra", "Infrastructure — Energy, Ports, Roads, Airports, Railways; investment models"),
      ] },
      { heading: "Science, Technology & Environment", nodes: [
        n("g3-st", "Science and Technology — developments, applications and effects in everyday life"),
        n("g3-indi", "Achievements of Indians in S&T; indigenization and new technology"),
        n("g3-it", "Awareness in IT, Space, Computers, robotics, nano-tech, bio-tech and IPR issues"),
        n("g3-env", "Conservation, environmental pollution and degradation, environmental impact assessment"),
        n("g3-disaster", "Disaster and disaster management"),
      ] },
      { heading: "Security", nodes: [
        n("g3-extremism", "Linkages between development and spread of extremism"),
        n("g3-actors", "Role of external state and non-state actors in creating challenges to internal security"),
        n("g3-cyber", "Internal security through communication networks, media & social networking; cyber security; money-laundering"),
        n("g3-border", "Security challenges and management in border areas; linkages of organized crime with terrorism"),
        n("g3-forces", "Various Security forces and agencies and their mandate"),
      ] },
    ],
  },
  {
    code: "GS-IV", name: "Paper V — GS-IV: Ethics, Integrity and Aptitude", stage: "mains", marks: 250, counted: true, kind: "GS",
    note: "Tests attitude and approach to integrity and probity; uses the case-study approach",
    sections: [{ nodes: [
      n("g4-ethics", "Ethics and Human Interface", ["Essence, determinants and consequences of ethics; dimensions of ethics; ethics in private and public relationships", "Human Values — lessons from leaders, reformers and administrators; role of family, society and educational institutions"]),
      n("g4-attitude", "Attitude", ["Content, structure, function; influence and relation with thought and behaviour", "Moral and political attitudes; social influence and persuasion"]),
      n("g4-aptitude", "Aptitude and foundational values for Civil Service", ["Integrity, impartiality and non-partisanship, objectivity, dedication to public service, empathy, tolerance and compassion"]),
      n("g4-ei", "Emotional intelligence — concepts, utilities and application in administration and governance"),
      n("g4-thinkers", "Contributions of moral thinkers and philosophers from India and the world"),
      n("g4-pubadmin", "Public/Civil service values and Ethics in Public administration", ["Status and problems; ethical concerns and dilemmas; laws, rules, regulations and conscience as sources of guidance", "Accountability and ethical governance; ethical issues in international relations and funding; corporate governance"]),
      n("g4-probity", "Probity in Governance", ["Concept of public service; philosophical basis of governance and probity", "Information sharing and transparency; RTI, Codes of Ethics, Codes of Conduct, Citizen's Charters, work culture, quality of service delivery, challenges of corruption"]),
      n("g4-cases", "Case Studies on the above issues"),
    ] }],
  },
];

// ── OPTIONALS ─────────────────────────────────────────────────
// (Sociology removed — the optional is decided and SEALED: PSIR.)
const PSIR: SylPaper[] = [
  {
    code: "OPT-PSIR-I", name: "PSIR — Paper I: Political Theory and Indian Politics", stage: "mains", marks: 250, counted: true, kind: "OPTIONAL",
    sections: [
      { heading: "Political Theory", nodes: [
        n("psir1-theory", "Political Theory — meaning and approaches"),
        n("psir1-state", "Theories of state", ["Liberal, Neo-liberal, Marxist, Pluralist, post-colonial and Feminist"]),
        n("psir1-justice", "Justice", ["Conceptions of justice; Rawls' theory and its communitarian critiques"]),
        n("psir1-equality", "Equality", ["Social, political, economic; equality and freedom; affirmative action"]),
        n("psir1-rights", "Rights — meaning and theories; kinds of rights; Human Rights"),
        n("psir1-democracy", "Democracy — classical and contemporary; representative, participatory, deliberative models"),
        n("psir1-power", "Concept of power — hegemony, ideology and legitimacy"),
        n("psir1-ideologies", "Political Ideologies — Liberalism, Socialism, Marxism, Fascism, Gandhism, Feminism"),
        n("psir1-indian-thought", "Indian Political Thought", ["Dharamshastra, Arthashastra, Buddhist traditions; Sir Syed Ahmed Khan, Aurobindo, Gandhi, Ambedkar, M.N. Roy"]),
        n("psir1-western-thought", "Western Political Thought", ["Plato, Aristotle, Machiavelli, Hobbes, Locke, J.S. Mill, Marx, Gramsci, Hannah Arendt"]),
      ] },
      { heading: "Indian Government and Politics", nodes: [
        n("psir1-nationalism", "Indian Nationalism", ["Strategies of the freedom struggle; perspectives — Liberal, Socialist, Marxist, Radical Humanist, Dalit"]),
        n("psir1-const", "Making & Salient Features of the Indian Constitution", ["Preamble, FR & duties, DPSP; parliamentary system; amendment; judicial review and basic structure"]),
        n("psir1-organs", "Principal Organs of the Union & State Government — role and actual working"),
        n("psir1-grassroots", "Grassroots Democracy — Panchayati Raj, Municipal Government; 73rd & 74th Amendments"),
        n("psir1-commissions", "Statutory Institutions / Commissions — EC, CAG, Finance Commission, UPSC, NCSC/NCST/NCW, NHRC"),
        n("psir1-federal", "Federalism — centre-state relations; integrationist tendencies and regional aspirations"),
        n("psir1-planning", "Planning and Economic development — Nehruvian and Gandhian perspectives; reforms"),
        n("psir1-caste", "Caste, Religion and Ethnicity in Indian Politics"),
        n("psir1-party", "Party System — national & regional parties; coalition politics; pressure groups; electoral behaviour"),
        n("psir1-movements", "Social Movements — civil liberties, women's, environmentalist movements"),
      ] },
    ],
  },
  {
    code: "OPT-PSIR-II", name: "PSIR — Paper II: Comparative Politics and International Relations", stage: "mains", marks: 250, counted: true, kind: "OPTIONAL",
    sections: [
      { heading: "Comparative Politics & International Politics", nodes: [
        n("psir2-comp", "Comparative Politics — nature, approaches; limitations of the comparative method"),
        n("psir2-state", "State in comparative perspective — capitalist & socialist, industrial & developing societies"),
        n("psir2-repr", "Politics of Representation and Participation — parties, pressure groups, social movements"),
        n("psir2-global", "Globalisation — responses from developed and developing societies"),
        n("psir2-ir-approach", "Approaches to IR — Idealist, Realist, Marxist, Functionalist, Systems theory"),
        n("psir2-concepts", "Key concepts in IR — national interest, security & power; balance of power & deterrence; collective security; world capitalist economy"),
        n("psir2-order", "Changing International Political Order — superpowers, Cold War, NAM, collapse of USSR, unipolarity"),
        n("psir2-econ", "Evolution of the International Economic System — Bretton Woods to WTO; NIEO; globalisation"),
        n("psir2-un", "United Nations — role, specialized agencies, need for reforms"),
        n("psir2-region", "Regionalisation of World Politics — EU, ASEAN, APEC, SAARC, NAFTA"),
        n("psir2-concerns", "Contemporary Global Concerns — democracy, human rights, environment, gender justice, terrorism, proliferation"),
      ] },
      { heading: "India and the World", nodes: [
        n("psir2-fp", "Indian Foreign Policy — determinants, institutions, continuity and change"),
        n("psir2-nam", "India's contribution to the Non-Alignment Movement"),
        n("psir2-southasia", "India and South Asia — SAARC, FTA, Look East, impediments to cooperation"),
        n("psir2-south", "India and the Global South — Africa, Latin America; NIEO and WTO"),
        n("psir2-powers", "India and the Global Centres of Power — USA, EU, Japan, China, Russia"),
        n("psir2-unsystem", "India and the UN System; India and the Nuclear Question"),
        n("psir2-recent", "Recent developments in Indian Foreign Policy"),
      ] },
    ],
  },
];

const PUB_AD: SylPaper[] = [
  {
    code: "OPT-PUBAD-I", name: "Public Administration — Paper I: Administrative Theory", stage: "mains", marks: 250, counted: true, kind: "OPTIONAL",
    sections: [{ nodes: [
      n("pa1-intro", "Introduction", ["Meaning, scope and significance; Wilson's vision; evolution; New Public Administration; Public Choice; Good Governance; New Public Management"]),
      n("pa1-thought", "Administrative Thought", ["Scientific Management; Classical Theory; Weber's bureaucratic model; Follett; Human Relations (Mayo); Barnard; Simon; participative management"]),
      n("pa1-behaviour", "Administrative Behaviour", ["Decision-making; communication; morale; motivation theories; theories of leadership"]),
      n("pa1-org", "Organisations", ["Systems, contingency theories; structure and forms; regulatory authorities; Public-Private Partnerships"]),
      n("pa1-account", "Accountability and Control", ["Legislative, executive, judicial control; citizen and administration; RTI; social audit; citizen's charters"]),
      n("pa1-law", "Administrative Law", ["Dicey; delegated legislation; administrative tribunals"]),
      n("pa1-comp", "Comparative Public Administration", ["Ecology and administration; Riggsian models and critique"]),
      n("pa1-dev", "Development Dynamics", ["Concept of development; anti-development thesis; bureaucracy and development; liberalisation; self-help group movement"]),
      n("pa1-personnel", "Personnel Administration", ["Recruitment, training, career advancement, position classification, performance appraisal; code of conduct; administrative ethics"]),
      n("pa1-policy", "Public Policy", ["Models of policy-making; conceptualisation, implementation, monitoring, evaluation; state theories and policy formulation"]),
      n("pa1-techniques", "Techniques of Administrative Improvement", ["O&M, work study; e-governance and IT; network analysis, MIS, PERT, CPM"]),
      n("pa1-finance", "Financial Administration", ["Monetary and fiscal policies; public debt; budgets — types and forms; budgetary process; accounts and audit"]),
    ] }],
  },
  {
    code: "OPT-PUBAD-II", name: "Public Administration — Paper II: Indian Administration", stage: "mains", marks: 250, counted: true, kind: "OPTIONAL",
    sections: [{ nodes: [
      n("pa2-evolution", "Evolution of Indian Administration", ["Kautilya's Arthashastra; Mughal administration; legacy of British rule"]),
      n("pa2-framework", "Philosophical and Constitutional framework of government", ["Constitutionalism; political culture; bureaucracy and democracy; bureaucracy and development"]),
      n("pa2-psu", "Public Sector Undertakings", ["Forms of PSUs; autonomy, accountability and control; impact of liberalization and privatization"]),
      n("pa2-union", "Union Government and Administration", ["Executive, Parliament, Judiciary; Cabinet Secretariat; PMO; Central Secretariat; Ministries and Departments"]),
      n("pa2-plans", "Plans and Priorities", ["Machinery of planning; Planning Commission / NITI; decentralized planning"]),
      n("pa2-state", "State Government and Administration", ["Union-State relations; Governor; CM; Chief Secretary; State Secretariat; Directorates"]),
      n("pa2-district", "District Administration since Independence", ["Changing role of the Collector; development management; democratic decentralization"]),
      n("pa2-civil", "Civil Services", ["Structure, recruitment, training; good governance initiatives; neutrality; activism"]),
      n("pa2-financial", "Financial Management", ["Budget as a political instrument; parliamentary control; CGA and CAG"]),
      n("pa2-reforms", "Administrative Reforms since Independence", ["Important committees and commissions; problems of implementation"]),
      n("pa2-rural", "Rural Development", ["Programmes; Panchayati Raj; 73rd Constitutional amendment"]),
      n("pa2-urban", "Urban Local Government", ["74th Amendment; municipal governance; city management"]),
      n("pa2-law", "Law and Order Administration", ["National Police Commission; central & state agencies; criminalisation of politics; police reforms"]),
      n("pa2-issues", "Significant issues in Indian Administration", ["Values in public service; regulatory commissions; NHRC; corruption; disaster management"]),
    ] }],
  },
];

// ── Exported registry ─────────────────────────────────────────
export interface SylGroup { key: string; label: string; stage: "prelims" | "mains"; papers: SylPaper[] }

export const SYLLABUS: SylGroup[] = [
  { key: "prelims", label: "Prelims", stage: "prelims", papers: PRELIMS },
  { key: "mains-gs", label: "Mains · Essay & GS", stage: "mains", papers: MAINS_GS },
  { key: "opt-psir", label: "Optional · Political Science & IR", stage: "mains", papers: PSIR },
  { key: "opt-pubad", label: "Optional · Public Administration", stage: "mains", papers: PUB_AD },
];

export function syllabusStats() {
  let papers = 0, topics = 0;
  for (const g of SYLLABUS) for (const p of g.papers) { papers++; for (const s of p.sections) topics += s.nodes.length; }
  return { groups: SYLLABUS.length, papers, topics };
}
