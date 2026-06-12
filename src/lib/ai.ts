import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// ── Clients ───────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

// ── Model registry ────────────────────────────────────────────
export const MODELS = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    apiId: "gemini-2.5-flash-preview-05-20",
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
    description: "Ultra-fast streaming via Groq — 500+ tokens/sec",
    available: () => !!process.env.GROQ_API_KEY,
  },
} as const;

export type ModelId = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelId = "gemini-2.5-flash";

// ── UPSC Mentor system prompt ──────────────────────────────────
export const UPSC_MENTOR_SYSTEM = `You are Lakshya, an elite AI mentor for UPSC Civil Services Examination (CSE) preparation. You are Saurabh's personal strategic advisor for AIR-1 level preparation.

## Your Knowledge Base
- Complete UPSC CSE Syllabus: Prelims (GS-I, CSAT) + Mains (GS-I through GS-IV, Essay, Optional Sociology)
- 22 years of PYQs (2003-2024) — Prelims and Mains patterns
- Standard references: Laxmikanth (Polity), Bipin Chandra (Modern History), Ramesh Singh (Economy), Shankar IAS (Environment), NCERTs Class 6-12
- Current affairs analysis with GS syllabus mapping

## How You Answer

### For Prelims Questions
- Give MCQ-worthy facts, dangerous distractors, tricky distinctions
- Use: "PRELIMS EDGE:" prefix for key facts to memorise
- Highlight PYQ frequency ("Asked 4 times 2015-2023")

### For Mains Questions
- Structure: Introduction → Arguments/Analysis → Examples → Conclusion
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
- "PYQ CONNECT:" — link to past exam questions
- "UPSC ANGLE:" — what specifically to remember for exam

Be a strict but encouraging coach. Every sentence helps Saurabh crack the exam.`;

// ── Current affairs processing prompt ────────────────────────
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

// ── Streaming chat — routes to correct provider ────────────────
export async function* streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  modelId: ModelId = DEFAULT_MODEL,
): AsyncGenerator<string> {
  const model = MODELS[modelId];
  if (model.provider === "google") {
    yield* streamGemini(messages, model.apiId);
  } else {
    yield* streamGroq(messages, model.apiId);
  }
}

// ── Gemini streaming ──────────────────────────────────────────
async function* streamGemini(
  messages: { role: "user" | "assistant"; content: string }[],
  apiId: string,
): AsyncGenerator<string> {
  const geminiModel = genAI.getGenerativeModel({
    model: apiId,
    systemInstruction: UPSC_MENTOR_SYSTEM,
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

// ── Groq streaming ────────────────────────────────────────────
async function* streamGroq(
  messages: { role: "user" | "assistant"; content: string }[],
  apiId: string,
): AsyncGenerator<string> {
  const stream = await groqClient.chat.completions.create({
    model: apiId,
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: UPSC_MENTOR_SYSTEM },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) yield text;
  }
}

// ── Affairs processor — always uses Gemini (needs large context) ──
export async function processAffair(
  headline: string,
  summary: string,
): Promise<{
  whyInNews: string; background: string; keyFacts: string;
  prelims: string; mains: string; interview: string;
  gsMapping: string[]; tags: string[]; priority: "high" | "normal" | "low";
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
  const result = await model.generateContent({
    systemInstruction: AFFAIRS_PROCESSOR_SYSTEM,
    contents: [{ role: "user", parts: [{ text: `Headline: ${headline}\n\nSummary: ${summary}` }] }],
  });

  const text = result.response.text();
  // Strip markdown code fences if present
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return {
      whyInNews: summary, background: "", keyFacts: "", prelims: "",
      mains: "", interview: "", gsMapping: [], tags: [], priority: "normal",
    };
  }
}

// ── NCERT / Book batch processor ─────────────────────────────
export async function processDocument(
  content: string,
  task: "summarise" | "generate_mcqs" | "generate_mains" | "extract_facts",
  context?: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

  const prompts: Record<typeof task, string> = {
    summarise: `Summarise this UPSC study material in a structured format:\n- Key concepts with definitions\n- Important facts and dates\n- UPSC relevance (which GS paper, which topics)\n- High-yield points for Prelims\n\nContent:\n${content}`,
    generate_mcqs: `Generate 20 UPSC Prelims-style MCQs from this content. Format each as:\nQ[n]. [Question]\nA) [Option] B) [Option] C) [Option] D) [Option]\nAnswer: [Letter] — [Brief explanation]\n\n${context ? `Focus on: ${context}\n\n` : ""}Content:\n${content}`,
    generate_mains: `Generate 5 UPSC Mains questions from this content with 250-word model answers. Cover GS-I, GS-II, GS-III angles.\n\n${context ? `Focus on: ${context}\n\n` : ""}Content:\n${content}`,
    extract_facts: `Extract all UPSC-important facts from this content:\n- Dates and events\n- Constitutional articles/provisions\n- Important bodies and their roles\n- Data and statistics\n- Acts and committees\n\nContent:\n${content}`,
  };

  const result = await model.generateContent(prompts[task]);
  return result.response.text();
}
