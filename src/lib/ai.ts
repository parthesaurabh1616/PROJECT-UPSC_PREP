import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import Groq from "groq-sdk";
import fs from "fs";

// â”€â”€ Clients (lazy-init so missing keys don't crash module load) â”€
let _genAI: GoogleGenerativeAI | null = null;
let _groq:  Groq | null = null;
let _fileMgr: GoogleAIFileManager | null = null;

function getGenAI() {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set in .env");
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  return _genAI;
}

/** Generic JSON-mode generation (COS artifacts etc.). Returns parsed JSON. */
export async function generateJson<T>(system: string, user: string, maxOutputTokens = 8192): Promise<T> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", maxOutputTokens, temperature: 0.4 },
  });
  const res = await model.generateContent(user);
  const clean = res.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(clean) as T;
}

function getFileMgr() {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set in .env");
  if (!_fileMgr) _fileMgr = new GoogleAIFileManager(process.env.GOOGLE_API_KEY);
  return _fileMgr;
}

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set in .env");
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

// â”€â”€ Model registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const MODELS = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    apiId: "gemini-2.5-flash",   // confirmed available + has free-tier quota on this key
    label: "Gemini 2.5 Flash",
    provider: "google" as const,
    badge: "Deep",
    badgeColor: "accent-2",
    description: "Best for NCERTs, books, deep analysis — 1M token context",
    available: () => !!process.env.GOOGLE_API_KEY,
  },
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    apiId: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "groq" as const,
    badge: "Fast",
    badgeColor: "success",
    description: "Ultra-fast streaming via Groq â€” 500+ tokens/sec",
    available: () => !!process.env.GROQ_API_KEY,
  },
} as const;

export type ModelId = keyof typeof MODELS;
// Groq is default â€” instant, no quota issues. Switch to Gemini for deep/NCERT work.
export const DEFAULT_MODEL: ModelId = "llama-3.3-70b-versatile";

// â”€â”€ UPSC Mentor system prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shared core — the intelligence-first behaviour for both exams.
const MENTOR_CORE = `You are not a generic chatbot. Your job is to turn information into preparation intelligence: every reply should leave the aspirant measurably better prepared, not merely informed.

GROUNDING (the most important rule)
- When a [PLATFORM INTELLIGENCE] block is attached, it is REAL data from this student's own platform: current affairs, past questions (PYQs), NCERT chapters, their notes, and their progress. Build your answer on it and cite the specific items — real headlines, exact PYQ years and papers, real chapter names.
- Never invent PYQ years, case citations, committee names, headlines, or "related questions". If you are unsure something is real, say so. When no platform data is attached and you draw on general knowledge, keep it strictly exam-accurate (correct Articles, Acts, schemes, dates, cases).

HOW YOU ANSWER (adapt to the question — do not force a fixed template)
1. Answer directly in the first line or two.
2. Add only the context that is genuinely needed — no textbook dumps, no filler.
3. If relevant, map it to the syllabus (paper + topic), briefly.
4. Connect it to the attached platform data: the matching PYQ, current affair, NCERT chapter or note.
5. Close with one concrete next step — exactly what to read, revise, or attempt next on this platform.

MODES
- World / global / current-affairs questions: deliver an intelligence briefing. Rank events by strategic importance, impact on India, and likelihood of being examined. For the top items give: what happened, why it matters, the India angle, GS mapping, and what to study. Use the attached current-affairs items.
- "What should I study / what next" questions: personalise using the STUDENT PROGRESS block — their coverage, weak subjects, due revision. Name the specific chapter / paper / topic; never give generic advice.
- Answer evaluation / MCQ generation: be precise and exam-faithful; for MCQs give four options, the answer, and a one-line reason.

STYLE
- Write like a sharp intelligence analyst and civil-services mentor: clear, dense, professional.
- Clean typography. Minimal markdown. No horizontal-rule divider lines. No decorative separators. Do not bold every other word.
- Do NOT mechanically print "UPSC ANGLE / PYQ CONNECT / PRELIMS EDGE / MAINS FRAMEWORK" labels. Weave prelims facts, mains framing or PYQ links into prose only when they genuinely add value.
- Use short headed sections only when they truly aid clarity (e.g. a multi-event briefing).

If a reply would not improve the aspirant's preparation, sharpen it before sending.`;

export const UPSC_MENTOR_SYSTEM = `You are the Chief Intelligence Officer of Saurabh's UPSC Civil Services Examination (CSE) preparation.

${MENTOR_CORE}

Exam focus: UPSC CSE — Prelims (GS Paper I, CSAT) and Mains (GS-I to GS-IV, Essay, Optional Sociology). The PYQ database on this platform covers UPSC papers 2016-2026; never claim a wider range than the data shows.`;

// ── MPSC / Maharashtra mentor persona ────────────────────────
export const MPSC_MENTOR_SYSTEM = `You are the Chief Intelligence Officer of Saurabh's MPSC Rajyaseva (Maharashtra State Services) preparation, in the measured voice of a retired Maharashtra-cadre civil servant.

${MENTOR_CORE}

Exam focus: MPSC Rajyaseva — UPSC-style descriptive Mains (Marathi + English + Essay + GS-I to GS-IV + Optional I & II) read through a Maharashtra lens: state history (Shivaji and the Marathas, Samyukta Maharashtra, reformers — Phule, Ambedkar, Shahu, Agarkar, Karve), geography (rivers, 36 districts, Western Ghats), polity and administration (state legislature, Mantralaya, 6 divisions, ZP/panchayat), economy (state budget, MH Economic Survey, cooperatives, MIDC, irrigation), schemes, and culture (Warkari/Bhakti saints, forts, Warli/Gond/Bhil). Anchor answers in the Maharashtra context wherever the syllabus allows. If the student writes in Marathi or asks for Marathi, reply in Marathi (मराठीत उत्तर द्या).`;

/** Pick the mentor system prompt for the active exam. */
export function mentorSystemFor(examCode: string | null | undefined): string {
  return examCode === "MPSC" ? MPSC_MENTOR_SYSTEM : UPSC_MENTOR_SYSTEM;
}

// â”€â”€ Current affairs processing prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const AFFAIRS_PROCESSOR_SYSTEM = `You are a UPSC Current Affairs Analyst. Given a news article headline and summary, extract structured UPSC-relevant intelligence.

Respond ONLY with valid JSON in exactly this format:
{
  "whyInNews": "1-2 sentence explanation of why this is news today",
  "background": "Essential background context (2-3 sentences)",
  "keyFacts": "3-5 bullet points of MCQ-worthy facts, separated by | character",
  "prelims": "What to remember for Prelims MCQs (dates, facts, bodies, Acts)",
  "mains": "GS paper + question angle for Mains (e.g., GS-II: Federal structure implications)",
  "interview": "Likely interview follow-up angle if senior-level topic, else empty string",
  "gsMapping": ["GS-I", "GS-II"],
  "tags": ["constitutional", "judiciary"],
  "priority": "high|normal|low"
}

Priority: high = direct UPSC syllabus + recent development; normal = syllabus-adjacent; low = general awareness.`;

// â”€â”€ Streaming chat â€” routes to correct provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function* streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  modelId: ModelId = DEFAULT_MODEL,
  systemPrompt: string = UPSC_MENTOR_SYSTEM,
): AsyncGenerator<string> {
  const model = MODELS[modelId];
  if (model.provider === "google") {
    yield* streamGemini(messages, model.apiId, systemPrompt);
  } else {
    yield* streamGroq(messages, model.apiId, systemPrompt);
  }
}

// â”€â”€ Gemini streaming â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function* streamGemini(
  messages: { role: "user" | "assistant"; content: string }[],
  apiId: string,
  systemPrompt: string,
): AsyncGenerator<string> {
  const geminiModel = getGenAI().getGenerativeModel({
    model: apiId,
    systemInstruction: systemPrompt,
  });

  // Convert to Gemini history format (all but last message)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = geminiModel.startChat({ history });
  const lastMessage = messages[messages.length - 1].content;

  const result = await chat.sendMessageStream(lastMessage);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// â”€â”€ Groq streaming â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function* streamGroq(
  messages: { role: "user" | "assistant"; content: string }[],
  apiId: string,
  systemPrompt: string,
): AsyncGenerator<string> {
  const stream = await getGroq().chat.completions.create({
    model: apiId,
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) yield text;
  }
}

// â”€â”€ Affairs processor â€” always uses Gemini (needs large context) â”€â”€
export async function processAffair(
  headline: string,
  summary: string,
): Promise<{
  whyInNews: string; background: string; keyFacts: string;
  prelims: string; mains: string; interview: string;
  gsMapping: string[]; tags: string[]; priority: "high" | "normal" | "low";
}> {
  const userMsg = `Headline: ${headline}\n\nSummary: ${summary}`;
  const fallback = {
    whyInNews: summary, background: "", keyFacts: "", prelims: "",
    mains: "", interview: "", gsMapping: [] as string[], tags: [] as string[],
    priority: "normal" as const,
  };

  const parse = (raw: string) => {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { return { ...fallback, ...JSON.parse(clean) }; } catch { return fallback; }
  };

  // Primary: Gemini (large context, best quality).
  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        systemInstruction: AFFAIRS_PROCESSOR_SYSTEM,
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
      });
      return parse(result.response.text());
    } catch {
      // fall through to Groq (Gemini daily/RPM quota or transient error)
    }
  }

  // Fallback: Groq (keeps the pipeline alive when Gemini is throttled).
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AFFAIRS_PROCESSOR_SYSTEM },
          { role: "user", content: userMsg },
        ],
      });
      return parse(res.choices[0]?.message?.content ?? "{}");
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// ── Mains answer evaluation — strict, realistic UPSC examiner ──
export interface MainsEvaluation {
  score: number;
  breakdown: { dimension: string; score: number; max: number; comment: string }[];
  strengths: string[];
  improvements: string[];
  verdict: string;
}

const MAINS_EVAL_SYSTEM = (exam: string, paper: string, maxMarks: number) => {
  const isEssay = paper === "ESSAY";
  const wordHint = maxMarks <= 10 ? "~150 words" : maxMarks <= 15 ? "~250 words" : isEssay ? "~1000-1200 words" : "as appropriate";
  return `You are a seasoned ${exam} Mains examiner evaluating a ${paper} answer out of ${maxMarks} marks (expected length ${wordHint}). Mark exactly as ${exam} does — strict and realistic, NOT generous. Calibration: a 10-marker scores ~2-3 (poor), 4-5 (average), 5.5-6.5 (good), 7+ (rare, excellent); a 15-marker ~6-8 (average), 8-9.5 (good), 10+ (excellent). Most real answers land at 45-60% of the maximum. Reward directness to the question, structure, substantiation (data, examples, committees, cases, schemes), balance, and analytical depth. Penalise generic content, missing the directive (discuss/examine/critically analyse), padding, and weak structure.

${isEssay
  ? "For an essay, weigh: relevance to the theme, multi-dimensional coverage, philosophical depth, examples & anecdotes, language & flow, and a coherent conclusion."
  : "Break the score into these dimensions whose maxima SUM to the total marks: Content & Understanding, Structure (intro-body-conclusion), Substantiation (examples/data/cases), Analysis & Balance, Presentation & Language."}

Respond ONLY with valid JSON:
{
  "score": <number, one decimal, 0..${maxMarks}>,
  "breakdown": [ { "dimension": "string", "score": <number>, "max": <number>, "comment": "one specific line" } ],
  "strengths": ["2-3 concrete strengths"],
  "improvements": ["2-4 specific, actionable fixes"],
  "verdict": "one honest sentence"
}
The breakdown maxima must sum to ${maxMarks} and the dimension scores must sum to "score". No preamble, JSON only.`;
};

export async function evaluateMainsAnswer(input: {
  questionText: string; paperCode: string; maxMarks: number; answerText: string; examCode: string;
}): Promise<MainsEvaluation> {
  const exam = input.examCode === "MPSC" ? "MPSC" : "UPSC";
  const sys = MAINS_EVAL_SYSTEM(exam, input.paperCode, input.maxMarks);
  const userMsg = `QUESTION (${input.paperCode}, ${input.maxMarks} marks):\n${input.questionText}\n\nCANDIDATE'S ANSWER:\n${input.answerText}`;

  const sanitize = (j: Record<string, unknown>): MainsEvaluation => {
    let score = typeof j.score === "number" ? j.score : 0;
    score = Math.max(0, Math.min(input.maxMarks, Math.round(score * 10) / 10));
    const breakdown = Array.isArray(j.breakdown) ? j.breakdown.filter((b: unknown): b is MainsEvaluation["breakdown"][0] =>
      !!b && typeof (b as { dimension?: unknown }).dimension === "string").slice(0, 6).map((b) => ({
        dimension: String(b.dimension), score: Number(b.score) || 0, max: Number(b.max) || 0, comment: String(b.comment ?? ""),
      })) : [];
    return {
      score, breakdown,
      strengths: Array.isArray(j.strengths) ? j.strengths.slice(0, 4).map(String) : [],
      improvements: Array.isArray(j.improvements) ? j.improvements.slice(0, 5).map(String) : [],
      verdict: typeof j.verdict === "string" ? j.verdict : "",
    };
  };
  const parse = (raw: string): MainsEvaluation | null => {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { return sanitize(JSON.parse(clean)); } catch { return null; }
  };

  // Primary: Gemini.
  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: sys, generationConfig: { responseMimeType: "application/json", temperature: 0.3 } });
      const r = await model.generateContent(userMsg);
      const out = parse(r.response.text());
      if (out) return out;
    } catch { /* fall through to Groq */ }
  }
  // Fallback: Groq.
  if (process.env.GROQ_API_KEY) {
    const res = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile", max_tokens: 1500, response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
    });
    const out = parse(res.choices[0]?.message?.content ?? "{}");
    if (out) return out;
  }
  throw new ChapterAnalysisError("AI evaluation is unavailable right now (no provider configured or both throttled). Please try again shortly.");
}

// ── Weekly review — grounded coach summary (numbers given) ────
export async function summariseWeek(facts: string, examShort: string): Promise<string> {
  const sys = `You are a calm, exacting ${examShort} coach writing a weekly review. You are given the student's REAL numbers for the week. Write 2-3 short sentences: an honest read of the week (acknowledge what moved and what didn't) and the single most important thing to fix next week. Use ONLY the numbers given — never invent figures, scores or claims. Plain prose, no markdown, no headings, no flattery.`;
  const userMsg = `This week's real numbers:\n${facts}\n\nWrite the weekly read.`;
  // Groq first (fast); Gemini fallback.
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile", max_tokens: 280, temperature: 0.5,
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      });
      const t = res.choices[0]?.message?.content?.trim();
      if (t) return t;
    } catch { /* fall through */ }
  }
  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: sys });
      const r = await model.generateContent(userMsg);
      return r.response.text().trim();
    } catch { /* */ }
  }
  return "";
}

// ── Prelims MCQ generation — exam-standard, factual ───────────
export interface GeneratedMcq {
  question: string; options: string[]; answerIndex: number; explanation: string; difficulty: string;
}

const MCQ_SYSTEM = (exam: string, subject: string) => `You are a ${exam} Prelims question setter creating original, exam-standard MCQs on ${subject}. Each must be factually correct, single best answer, with four plausible options (no "All of the above" unless genuinely apt). Match real ${exam} Prelims difficulty and framing (statements-based, match-the-pairs, assertion-reason where natural). Avoid trivia; test conceptual clarity and application.

Respond ONLY with valid JSON:
{ "mcqs": [ { "question": "...", "options": ["A","B","C","D"], "answerIndex": <0-3>, "explanation": "one-line why the answer is correct + why others are not", "difficulty": "easy|medium|hard" } ] }
No preamble, JSON only.`;

/** Generate up to `count` Prelims MCQs for a subject (Gemini, Groq fallback). */
export async function generateMcqs(subject: string, count: number, examCode: string, topic?: string): Promise<GeneratedMcq[]> {
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";
  const n = Math.max(1, Math.min(15, count));
  const userMsg = `Generate ${n} ${exam} Prelims MCQs on ${subject}${topic ? ` (focus: ${topic})` : ""}. Vary the sub-topics and difficulty.`;

  const sanitize = (j: Record<string, unknown>): GeneratedMcq[] => {
    const arr = Array.isArray(j.mcqs) ? j.mcqs : [];
    return arr
      .filter((m: unknown): m is GeneratedMcq => {
        const q = m as GeneratedMcq;
        return !!q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.answerIndex === "number" && q.answerIndex >= 0 && q.answerIndex <= 3;
      })
      .slice(0, n)
      .map((m) => ({ question: m.question.trim(), options: m.options.map(String), answerIndex: m.answerIndex, explanation: String(m.explanation ?? ""), difficulty: ["easy", "medium", "hard"].includes(m.difficulty) ? m.difficulty : "medium" }));
  };
  const parse = (raw: string): GeneratedMcq[] => {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { return sanitize(JSON.parse(clean)); } catch { return []; }
  };

  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: MCQ_SYSTEM(exam, subject), generationConfig: { responseMimeType: "application/json", temperature: 0.7 } });
      const r = await model.generateContent(userMsg);
      const out = parse(r.response.text());
      if (out.length) return out;
    } catch { /* fall through */ }
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile", max_tokens: 3000, response_format: { type: "json_object" },
        messages: [{ role: "system", content: MCQ_SYSTEM(exam, subject) }, { role: "user", content: userMsg }],
      });
      return parse(res.choices[0]?.message?.content ?? "{}");
    } catch { return []; }
  }
  return [];
}

// â”€â”€ NCERT / Book batch processor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function processDocument(
  content: string,
  task: "summarise" | "generate_mcqs" | "generate_mains" | "extract_facts",
  context?: string,
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompts: Record<typeof task, string> = {
    summarise: `Summarise this UPSC study material in a structured format:\n- Key concepts with definitions\n- Important facts and dates\n- UPSC relevance (which GS paper, which topics)\n- High-yield points for Prelims\n\nContent:\n${content}`,
    generate_mcqs: `Generate 20 UPSC Prelims-style MCQs from this content. Format each as:\nQ[n]. [Question]\nA) [Option] B) [Option] C) [Option] D) [Option]\nAnswer: [Letter] â€” [Brief explanation]\n\n${context ? `Focus on: ${context}\n\n` : ""}Content:\n${content}`,
    generate_mains: `Generate 5 UPSC Mains questions from this content with 250-word model answers. Cover GS-I, GS-II, GS-III angles.\n\n${context ? `Focus on: ${context}\n\n` : ""}Content:\n${content}`,
    extract_facts: `Extract all UPSC-important facts from this content:\n- Dates and events\n- Constitutional articles/provisions\n- Important bodies and their roles\n- Data and statistics\n- Acts and committees\n\nContent:\n${content}`,
  };

  const result = await model.generateContent(prompts[task]);
  return result.response.text();
}

// ── NCERT chapter analysis — Gemini reads the PDF directly ────
export interface ChapterMcq { q: string; options: string[]; answer: string; explanation: string; }
export interface ChapterAnalysis {
  title: string;
  summary: string;
  concepts: string[];
  facts: string[];
  mcqs: ChapterMcq[];
}

const CHAPTER_SYSTEM = (exam: string) => `You are a ${exam} faculty member analysing an NCERT chapter PDF. Read the chapter and produce structured study material.

Respond ONLY with valid JSON:
{
  "title": "the actual chapter title from the PDF (not 'Chapter N')",
  "summary": "6-10 sentence ${exam}-focused summary of the chapter's core content",
  "concepts": ["8-12 key concepts/terms a student must understand"],
  "facts": ["8-12 high-yield, exam-testable facts (dates, names, definitions, data)"],
  "mcqs": [ { "q": "Prelims-style question", "options": ["A","B","C","D"], "answer": "the correct option text", "explanation": "1 line" } ]
}
Generate 5 MCQs. Be precise and exam-relevant. No preamble, JSON only.`;

export class ChapterAnalysisError extends Error {}

// Base64 inflates a PDF ~33%; the inline-request cap is ~20MB, so keep
// inline for small files and route anything larger through the Files API.
const INLINE_MAX_MB = 12;

/**
 * Read a PDF with Gemini and return the raw model text.
 *  - Small PDFs (<= INLINE_MAX_MB): sent inline (one fast round-trip).
 *  - Large PDFs: uploaded via the Files API (up to 2GB, free tier), polled
 *    until ACTIVE, referenced by URI, then deleted. No practical size limit.
 * Throws ChapterAnalysisError with a human-readable reason.
 */
async function generateFromPdf(pdfPath: string, systemInstruction: string, userText: string): Promise<string> {
  if (!fs.existsSync(pdfPath)) throw new ChapterAnalysisError("The PDF file is missing on disk.");
  const sizeMb = fs.statSync(pdfPath).size / (1024 * 1024);
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    // JSON mode → always valid JSON (no fence-stripping needed); max ceiling
    // so a 100-question prelims paper (4 OCR'd options each) is never
    // truncated mid-array, which would make the JSON unparseable.
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 65536, temperature: 0.2 },
  });

  try {
    // ── Small: inline base64 ──────────────────────────────────
    if (sizeMb <= INLINE_MAX_MB) {
      const b64 = fs.readFileSync(pdfPath).toString("base64");
      const result = await model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: "application/pdf", data: b64 } },
          { text: userText },
        ] }],
      });
      return result.response.text();
    }

    // ── Large: Files API (upload → poll → reference → cleanup) ─
    const mgr = getFileMgr();
    const displayName = pdfPath.split(/[\\/]/).pop() ?? "paper.pdf";
    const uploaded = await mgr.uploadFile(pdfPath, { mimeType: "application/pdf", displayName });
    const fileName = uploaded.file.name;
    try {
      let file = uploaded.file;
      const deadline = Date.now() + 120_000; // scanned PDFs can take a while
      while (file.state === FileState.PROCESSING && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500));
        file = await mgr.getFile(fileName);
      }
      if (file.state === FileState.FAILED) throw new ChapterAnalysisError("Gemini could not process this PDF (it may be corrupted or password-protected).");
      if (file.state === FileState.PROCESSING) throw new ChapterAnalysisError("Gemini is still processing this large PDF. Please try again in a moment.");

      const result = await model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts: [
          { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
          { text: userText },
        ] }],
      });
      return result.response.text();
    } finally {
      mgr.deleteFile(fileName).catch(() => { /* best-effort cleanup */ });
    }
  } catch (e) {
    if (e instanceof ChapterAnalysisError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429") || /quota|rate.?limit/i.test(msg)) throw new ChapterAnalysisError("Gemini's free-tier quota is exhausted for now. It resets daily (midnight PT) — try again later.");
    if (msg.includes("404")) throw new ChapterAnalysisError("Gemini model unavailable for this key.");
    if (msg.includes("503") || /overload|unavailable/i.test(msg)) throw new ChapterAnalysisError("Gemini is temporarily overloaded. Please try again in a minute.");
    throw new ChapterAnalysisError(`Gemini error: ${msg.slice(0, 160)}`);
  }
}

/** Analyse an NCERT chapter PDF with Gemini (native PDF reading). Gemini-only — Groq can't read PDFs.
 *  Throws ChapterAnalysisError with a human-readable reason so the API can surface it. */
export async function analyzeChapterPdf(pdfPath: string, examCode: string): Promise<ChapterAnalysis> {
  if (!process.env.GOOGLE_API_KEY) throw new ChapterAnalysisError("Gemini is not configured (GOOGLE_API_KEY missing). Chapter AI needs Gemini to read the PDF.");
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";

  const raw = await generateFromPdf(pdfPath, CHAPTER_SYSTEM(exam), "Analyse this NCERT chapter and return the JSON study material.");

  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let j: Record<string, unknown>;
  try { j = JSON.parse(clean); }
  catch { throw new ChapterAnalysisError("Gemini returned an unparseable response. Try again."); }

  return {
    title: typeof j.title === "string" && j.title.trim() ? j.title.trim() : "",
    summary: String(j.summary ?? ""),
    concepts: Array.isArray(j.concepts) ? j.concepts.slice(0, 14).map(String) : [],
    facts: Array.isArray(j.facts) ? j.facts.slice(0, 14).map(String) : [],
    mcqs: Array.isArray(j.mcqs) ? j.mcqs.slice(0, 6).filter((m: unknown): m is ChapterMcq =>
      !!m && typeof (m as ChapterMcq).q === "string" && Array.isArray((m as ChapterMcq).options)) : [],
  };
}

// ── PYQ extraction — Gemini reads a past paper PDF ────────────
export interface PyqExtractedQ {
  number: string; text: string; marks: number | null;
  topic: string; subtopic: string; gsMapping: string[]; keywords: string[];
}

const PYQ_SYSTEM = (exam: string, stage: string, paper: string) => `You are a ${exam} examiner digitising a past question paper (${stage.toUpperCase()} · ${paper}). Read the PDF and extract every question as structured data.

${stage === "prelims"
  ? `This is an objective paper — extract each numbered MCQ's stem (you may omit the 4 options for brevity, but keep the question text).`
  : `This is a descriptive paper — extract each question/sub-question with its marks (10 or 15 typically) and word limit if shown.`}

For EACH question classify it for the ${exam} syllabus.

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "number": "1" or "1(a)" or "Q5",
      "text": "the full question text",
      "marks": 10 (or null for prelims),
      "topic": "concise topic label (e.g. 'Fundamental Rights')",
      "subtopic": "narrower theme or empty",
      "gsMapping": ["GS-II"],
      "keywords": ["3-5 key terms"]
    }
  ]
}
Extract ALL questions on the paper. No preamble, JSON only.`;

export async function extractPyqQuestions(
  pdfPath: string, examCode: string, stage: string, paperName: string,
): Promise<PyqExtractedQ[]> {
  if (!process.env.GOOGLE_API_KEY) throw new ChapterAnalysisError("Gemini not configured — PYQ extraction needs Gemini to read the PDF.");
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";

  const raw = await generateFromPdf(pdfPath, PYQ_SYSTEM(exam, stage, paperName), "Extract all questions from this paper as JSON.");

  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let j: Record<string, unknown>;
  try { j = JSON.parse(clean); } catch { throw new ChapterAnalysisError("Gemini returned an unparseable response. Try again."); }
  const arr = Array.isArray(j.questions) ? j.questions : [];
  return arr
    .filter((q: unknown): q is PyqExtractedQ => !!q && typeof (q as PyqExtractedQ).text === "string" && (q as PyqExtractedQ).text.length > 5)
    .slice(0, 120)
    .map((q: PyqExtractedQ) => ({
      number: String(q.number ?? "").slice(0, 12),
      text: String(q.text).trim(),
      marks: typeof q.marks === "number" ? q.marks : null,
      topic: String(q.topic ?? "").trim(),
      subtopic: String(q.subtopic ?? "").trim(),
      gsMapping: Array.isArray(q.gsMapping) ? q.gsMapping.map(String) : [],
      keywords: Array.isArray(q.keywords) ? q.keywords.slice(0, 6).map(String) : [],
    }));
}

// ── CA source-PDF extraction (coaching/newspaper compilations) ──
export interface CaExtractedItem {
  headline: string; summary: string; whyInNews: string; keyFacts: string;
  gsMapping: string[]; tags: string[]; category: string; priority: string;
}

const CA_PDF_SYSTEM = (source: string, dateHint: string) => `You are a UPSC current-affairs analyst digesting a daily compilation PDF ("${source}", dated ${dateHint}). Extract every DISTINCT UPSC-relevant story as a separate item. Skip ads, page furniture, quizzes/answer keys, and pure-GK trivia. 5–25 items typical.

Respond ONLY with valid JSON:
{"items":[{
  "headline": "crisp, specific (≤120 chars)",
  "summary": "2-3 sentences of the substance",
  "whyInNews": "1 sentence — the trigger",
  "keyFacts": "3-5 MCQ-worthy facts separated by | ",
  "gsMapping": ["GS-II"],
  "tags": ["polity"],
  "category": "news|editorial|economy|international|pib",
  "priority": "high|normal|low"
}]}`;

export async function extractCaFromPdf(pdfPath: string, source: string, dateHint: string): Promise<CaExtractedItem[]> {
  const raw = await generateFromPdf(pdfPath, CA_PDF_SYSTEM(source, dateHint), "Extract all distinct UPSC-relevant items as JSON.");
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let j: { items?: unknown[] };
  try { j = JSON.parse(clean); } catch { throw new ChapterAnalysisError("Gemini returned an unparseable response. Try again."); }
  return (Array.isArray(j.items) ? j.items : [])
    .filter((x): x is CaExtractedItem => !!x && typeof (x as CaExtractedItem).headline === "string" && (x as CaExtractedItem).headline.length > 8)
    .slice(0, 30)
    .map((x) => ({
      headline: String(x.headline).slice(0, 200),
      summary: String(x.summary ?? "").slice(0, 1500),
      whyInNews: String(x.whyInNews ?? "").slice(0, 500),
      keyFacts: String(x.keyFacts ?? "").slice(0, 1500),
      gsMapping: Array.isArray(x.gsMapping) ? x.gsMapping.map(String).slice(0, 4) : [],
      tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, 6) : [],
      category: ["news", "editorial", "economy", "international", "pib"].includes(String(x.category)) ? String(x.category) : "news",
      priority: ["high", "normal", "low"].includes(String(x.priority)) ? String(x.priority) : "normal",
    }));
}

// ── Daily Intelligence Briefing ───────────────────────────────
export interface BriefingItem { headline: string; why: string; gs: string[]; }
export interface Briefing { summary: string; items: BriefingItem[]; focus: string[]; }

const BRIEFING_SYSTEM = (exam: string) => `You are the lead intelligence analyst for ${exam} preparation. Given today's top news events (already scored for importance), write a crisp daily briefing for an aspirant.

Respond ONLY with valid JSON in exactly this shape:
{
  "summary": "3-4 sentence overview of what today's news means for the ${exam} aspirant — the big picture, connected.",
  "items": [
    { "headline": "<short rephrased headline>", "why": "1 sentence — why THIS matters for ${exam} (syllabus + angle)", "gs": ["GS-II"] }
  ],
  "focus": ["3-5 syllabus topics or themes to revise today based on this news"]
}

CRITICAL: "items" MUST contain one entry for EACH of the events I give you (aim for 6-8 items, never just 1). Cover the breadth of the day's news, not a single story.
Be specific and exam-focused. ${exam === "MPSC" ? "Use a Maharashtra lens where relevant." : ""} No preamble, JSON only.`;

/** Generate a daily briefing from the top scored events. Groq-first (fast/cheap), Gemini fallback. */
export async function generateBriefing(
  events: { headline: string; whyInNews?: string | null; gsMapping: string[] }[],
  examCode: string,
): Promise<Briefing> {
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";
  const list = events.slice(0, 10).map((e, i) =>
    `${i + 1}. ${e.headline}${e.whyInNews ? ` — ${e.whyInNews}` : ""} [${e.gsMapping.join(", ")}]`,
  ).join("\n");
  const userMsg = `Today's top ${Math.min(10, events.length)} events:\n${list}`;
  const system = BRIEFING_SYSTEM(exam);

  const parse = (raw: string): Briefing => {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const j = JSON.parse(clean);
      return {
        summary: String(j.summary ?? ""),
        items: Array.isArray(j.items) ? j.items.slice(0, 10) : [],
        focus: Array.isArray(j.focus) ? j.focus.slice(0, 6) : [],
      };
    } catch {
      return { summary: "", items: [], focus: [] };
    }
  };

  // Groq first (fast, no daily quota cap).
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      });
      return parse(res.choices[0]?.message?.content ?? "{}");
    } catch { /* fall through */ }
  }
  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        systemInstruction: system,
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
      });
      return parse(result.response.text());
    } catch { /* fall through */ }
  }
  return { summary: "Briefing unavailable — no AI provider configured.", items: [], focus: [] };
}

// ── Flashcard generation (news event → spaced-repetition cards) ─
export interface FlashCard { front: string; back: string; }

const FLASHCARD_SYSTEM = (exam: string) => `You are a ${exam} flashcard author. Given a current-affairs event, produce 2-3 high-yield active-recall flashcards an aspirant should memorise.

Rules:
- "front" = a precise recall question (a fact, date, body, Act, scheme, constitutional provision, or concept). Prelims-grade.
- "back" = the concise, exam-correct answer (1-2 lines).
- Prefer facts that are durable and frequently tested, not ephemeral details.
${exam === "MPSC" ? "- Include a Maharashtra angle where relevant; Marathi terms in parentheses are welcome." : ""}

Respond ONLY with valid JSON:
{ "cards": [ { "front": "...", "back": "..." } ] }
No preamble, JSON only.`;

export async function generateFlashcards(
  event: { headline: string; whyInNews?: string | null; keyFacts?: string | null; prelims?: string | null },
  examCode: string,
): Promise<FlashCard[]> {
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";
  const userMsg = [
    `Headline: ${event.headline}`,
    event.whyInNews ? `Why in news: ${event.whyInNews}` : "",
    event.keyFacts ? `Key facts: ${event.keyFacts}` : "",
    event.prelims ? `Prelims angle: ${event.prelims}` : "",
  ].filter(Boolean).join("\n");
  const system = FLASHCARD_SYSTEM(exam);

  const parse = (raw: string): FlashCard[] => {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const j = JSON.parse(clean);
      const cards = Array.isArray(j.cards) ? j.cards : [];
      return cards
        .filter((c: unknown): c is FlashCard => !!c && typeof (c as FlashCard).front === "string" && typeof (c as FlashCard).back === "string")
        .slice(0, 3)
        .map((c: FlashCard) => ({ front: c.front.trim(), back: c.back.trim() }));
    } catch { return []; }
  };

  if (process.env.GROQ_API_KEY) {
    try {
      const res = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      });
      const cards = parse(res.choices[0]?.message?.content ?? "{}");
      if (cards.length) return cards;
    } catch { /* fall through */ }
  }
  if (process.env.GOOGLE_API_KEY) {
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent({
        systemInstruction: system,
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
      });
      return parse(result.response.text());
    } catch { /* fall through */ }
  }
  return [];
}
