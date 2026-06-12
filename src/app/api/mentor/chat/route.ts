import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { streamChat, DEFAULT_MODEL, type ModelId } from "@/lib/ai";

export async function POST(req: NextRequest) {
  await ensureDemoUser();

  const { conversationId, message, modelId } = await req.json() as {
    conversationId: string;
    message: string;
    modelId?: ModelId;
  };
  const selectedModel: ModelId = modelId ?? DEFAULT_MODEL;

  // Ensure conversation belongs to user
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: DEMO_USER_ID },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Save user message
  await prisma.message.create({
    data: { conversationId, role: "user", content: message },
  });

  // Build message history for Anthropic (last 20 messages)
  const history = conv.messages.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  // Update conversation title from first user message
  if (conv.messages.length === 0) {
    const title = message.slice(0, 60) + (message.length > 60 ? "…" : "");
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  // Stream response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(history, selectedModel)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        // Save assistant message after streaming completes
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: fullResponse },
        });
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
