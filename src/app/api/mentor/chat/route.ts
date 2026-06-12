import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { streamChat, DEFAULT_MODEL, MODELS, type ModelId } from "@/lib/ai";

export async function POST(req: NextRequest) {
  await ensureDemoUser();

  const { conversationId, message, modelId } = await req.json() as {
    conversationId: string;
    message: string;
    modelId?: ModelId;
  };

  // Validate model or fall back to whichever provider has a key configured
  let selectedModel: ModelId = modelId ?? DEFAULT_MODEL;
  if (!MODELS[selectedModel].available()) {
    // Auto-fallback: try the other model
    const fallback = (Object.keys(MODELS) as ModelId[]).find(
      (id) => id !== selectedModel && MODELS[id].available(),
    );
    if (fallback) selectedModel = fallback;
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
        for await (const chunk of streamChat(history, selectedModel)) {
          send(chunk);
        }
      } catch (err) {
        // Send the error as readable text in the stream instead of controller.error()
        // controller.error() causes ERR_EMPTY_RESPONSE in the browser
        const msg = err instanceof Error ? err.message : String(err);
        send(`\n\n⚠️ **AI Error:** ${msg}\n\nTip: Check your GOOGLE_API_KEY / GROQ_API_KEY in .env`);
      }

      if (fullResponse.trim()) {
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: fullResponse },
        }).catch(() => null); // non-fatal
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
