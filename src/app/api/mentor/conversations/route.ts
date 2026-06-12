import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

export async function GET() {
  await ensureDemoUser();
  const conversations = await prisma.conversation.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return Response.json(conversations);
}

export async function POST() {
  await ensureDemoUser();
  const conv = await prisma.conversation.create({
    data: { userId: DEMO_USER_ID, title: "New conversation" },
    include: { messages: true },
  });
  return Response.json(conv);
}
