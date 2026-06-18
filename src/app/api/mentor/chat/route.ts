import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { streamChat, DEFAULT_MODEL, MODELS, mentorSystemFor, type ModelId } from "@/lib/ai";
import { getActiveProfile } from "@/lib/exam";
import { gatherMentorContext } from "@/lib/mentor-context";

const GROQ_FALLBACK: ModelId = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  await ensureDemoUser();

  // Resolve mentor persona from the active exam (UPSC vs MPSC/Maharashtra).
  const activeProfile = await getActiveProfile().catch(() => null);
  const examCode = activeProfile?.exam.code ?? "UPSC";
  const basePrompt = mentorSystemFor(activeProfile?.exam.code);

  const { conversationId, message, modelId } = await req.json() as {
    conversationId: string;
    message: string;
    modelId?: ModelId;
  };

  // Retrieve real platform intelligence relevant to this question and
  // graft it onto the system prompt so the model grounds its answer in
  // the student's actual NCERT/PYQ/CA/notes/progress, not model memory.
  const intel = await gatherMentorContext(message, examCode).catch(() => "");
  const systemPrompt = basePrompt + intel;

  let selectedModel: ModelId = modelId ?? DEFAULT_MODEL;
  if (!MODELS[selectedModel].available()) {
    const fallback = (Object.keys(MODELS) as ModelId[]).find(
      (id) => id !== selectedModel && MODELS[id].available(),
    );
    if (fallback) selectedModel = fallback as ModelId;
  }

  if (!MODELS[selectedModel].available()) {
    return Response.json(
      { error: "No AI provider configured. Add GOOGLE_API_KEY or GROQ_API_KEY to .env" },
      { status: 503 },
    );
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: DEMO_USER_ID },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return new Response("Conversation not found", { status: 404 });

  await prisma.message.create({
    data: { conversationId, role: "user", content: message },
  });

  const history = conv.messages.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  if (conv.messages.length === 0) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: message.slice(0, 60) + (message.length > 60 ? "…" : "") },
    });
  }

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        fullResponse += text;
        controller.enqueue(encoder.encode(text));
      };

      try {
        for await (const chunk of streamChat(history, selectedModel, systemPrompt)) {
          send(chunk);
        }
      } catch (primaryErr) {
        // If Gemini failed (quota/rate limit) — silently retry with Groq
        const isGemini = MODELS[selectedModel].provider === "google";
        const groqAvailable = MODELS[GROQ_FALLBACK].available();

        if (isGemini && groqAvailable && fullResponse.length === 0) {
          // No partial response yet — clean fallback, user won't notice
          try {
            for await (const chunk of streamChat(history, GROQ_FALLBACK, systemPrompt)) {
              send(chunk);
            }
          } catch (fallbackErr) {
            const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            send(`Sorry, both AI providers failed right now. Please try again in a moment.\n\nError: ${msg}`);
          }
        } else {
          // Groq also failed or partial response exists — show clean message
          const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
          const isQuota = msg.includes("429") || msg.includes("quota");
          if (isQuota) {
            send(fullResponse.length > 0
              ? "\n\n*(Response cut short — quota limit reached. Groq is available as Fast model.)*"
              : "The Gemini free-tier quota is currently exhausted. Please switch to **Groq (Fast)** using the model selector, or try again after midnight Pacific time when the quota resets."
            );
          } else {
            send(`Sorry, an error occurred. Please try again.\n\n*(${msg})*`);
          }
        }
      }

      if (fullResponse.trim()) {
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: fullResponse },
        }).catch(() => null);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
