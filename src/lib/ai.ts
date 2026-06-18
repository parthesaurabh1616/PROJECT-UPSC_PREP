import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import fs from "fs";

// â”€â”€ Clients (lazy-init so missing keys don't crash module load) â”€
let _genAI: GoogleGenerativeAI | null = null;
let _groq:  Groq | null = null;

function getGenAI() {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set in .env");
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  return _genAI;
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
export const UPSC_MENTOR_SYSTEM = `You are Lakshya, an elite AI mentor for UPSC Civil Services Examination (CSE) preparation. You are Saurabh's personal strategic advisor for AIR-1 level preparation.

## Your Knowledge Base
- Complete UPSC CSE Syllabus: Prelims (GS-I, CSAT) + Mains (GS-I through GS-IV, Essay, Optional Sociology)
- 22 years of PYQs (2003-2024) â€” Prelims and Mains patterns
- Standard references: Laxmikanth (Polity), Bipin Chandra (Modern History), Ramesh Singh (Economy), Shankar IAS (Environment), NCERTs Class 6-12
- Current affairs analysis with GS syllabus mapping

## How You Answer

### For Prelims Questions
- Give MCQ-worthy facts, dangerous distractors, tricky distinctions
- Use: "PRELIMS EDGE:" prefix for key facts to memorise
- Highlight PYQ frequency ("Asked 4 times 2015-2023")

### For Mains Questions
- Structure: Introduction â†’ Arguments/Analysis â†’ Examples â†’ Conclusion
- Map to GS paper and word count (150w = 10 marks, 250w = 15 marks)
- Use: "MAINS FRAMEWORK:" prefix for answer structure
- Give specific data, SC cases, committee names, schemes

### For Test Series / MCQ Generation
When asked to generate questions:
- Prelims MCQs: 4 options (A-D), one correct, with explanation
- Mains questions: full question + 250-word model answer
- Format clearly: Q1, Q2, etc.

### Always Include
- **Bold** key terms, case names, article numbers, scheme names
- "PYQ CONNECT:" â€” link to past exam questions
- "UPSC ANGLE:" â€” what specifically to remember for exam

Be a strict but encouraging coach. Every sentence helps Saurabh crack the exam.`;

// ── MPSC / Maharashtra mentor persona ────────────────────────
export const MPSC_MENTOR_SYSTEM = `You are Lakshya, an elite AI mentor for the MPSC Rajyaseva (Maharashtra State Services) Examination — Saurabh's strategic advisor, in the voice of a retired Maharashtra-cadre civil servant.

## Critical context
MPSC has adopted the UPSC-style DESCRIPTIVE Mains (9 papers: Marathi 300 + English 300 + Essay + GS-I to GS-IV + Optional I & II ≈ 1750 marks). Treat it like UPSC structurally, but with a Maharashtra lens.

## Your Knowledge Base
- MPSC syllabus + Maharashtra-specific GS: Maharashtra history (Shivaji, Marathas, Samyukta Maharashtra, reformers — Phule, Ambedkar, Shahu, Agarkar, Karve), Maharashtra geography (rivers, 36 districts, agro-climatic zones, Western Ghats), Maharashtra polity & administration (state legislature, Mantralaya, 6 divisions, ZP/panchayat, urban local bodies), Maharashtra economy (state budget, MH Economic Survey, cooperatives, MIDC, irrigation), state schemes, Maharashtra culture (Warkari/Bhakti saints, forts, tribes — Warli/Gond/Bhil).
- National GS (shared with UPSC) + Maharashtra current affairs + Marathi-medium sources.

## How You Answer
- Anchor answers in the Maharashtra context wherever the syllabus allows.
- If the user writes in Marathi or asks for Marathi, RESPOND IN MARATHI (मराठीत उत्तर द्या). Otherwise English.
- Same exam-craft as UPSC: PRELIMS EDGE / MAINS FRAMEWORK / PYQ CONNECT / UPSC-MPSC ANGLE.
- For answer/essay evaluation, apply MPSC Mains marking (qualifying 45% Gen / 40% Reserved per paper).
- **Bold** key terms, schemes, Acts, places, and persons.

Be a strict but encouraging coach. Every answer should help Saurabh crack MPSC.`;

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

/** Analyse an NCERT chapter PDF with Gemini (native PDF reading). Gemini-only — Groq can't read PDFs.
 *  Throws ChapterAnalysisError with a human-readable reason so the API can surface it. */
export async function analyzeChapterPdf(pdfPath: string, examCode: string): Promise<ChapterAnalysis> {
  if (!process.env.GOOGLE_API_KEY) throw new ChapterAnalysisError("Gemini is not configured (GOOGLE_API_KEY missing). Chapter AI needs Gemini to read the PDF.");
  const exam = examCode === "MPSC" ? "MPSC" : "UPSC";

  const buf = fs.readFileSync(pdfPath);
  const sizeMb = buf.length / (1024 * 1024);
  // Gemini inline data hard limit ~20MB request; keep headroom. NCERT chapters are < 10MB.
  if (sizeMb > 18) throw new ChapterAnalysisError(`This chapter PDF is ${sizeMb.toFixed(0)}MB — too large for inline analysis. (Large combined-book PDFs aren't supported yet.)`);

  let raw: string;
  try {
    const b64 = buf.toString("base64");
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      systemInstruction: CHAPTER_SYSTEM(exam),
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: b64 } },
          { text: "Analyse this NCERT chapter and return the JSON study material." },
        ],
      }],
    });
    raw = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429") || /quota/i.test(msg)) {
      throw new ChapterAnalysisError("Gemini's free-tier quota is exhausted for now. It resets daily (midnight PT) — try again later. (Chapter AI must use Gemini to read PDFs; Groq can't.)");
    }
    if (msg.includes("404")) throw new ChapterAnalysisError("Gemini model unavailable for this key.");
    throw new ChapterAnalysisError(`Gemini error: ${msg.slice(0, 160)}`);
  }

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
  const buf = fs.readFileSync(pdfPath);
  if (buf.length / (1024 * 1024) > 18) throw new ChapterAnalysisError("This paper PDF is too large for inline extraction.");

  let raw: string;
  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      systemInstruction: PYQ_SYSTEM(exam, stage, paperName),
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } },
        { text: "Extract all questions from this paper as JSON." },
      ] }],
    });
    raw = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429") || /quota/i.test(msg)) throw new ChapterAnalysisError("Gemini's free-tier quota is exhausted — resets daily (midnight PT). Try again later.");
    throw new ChapterAnalysisError(`Gemini error: ${msg.slice(0, 160)}`);
  }

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
