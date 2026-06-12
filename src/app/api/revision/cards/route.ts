import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

export async function GET(req: NextRequest) {
  await ensureDemoUser();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const cards = await prisma.revision.findMany({
    where: {
      userId: DEMO_USER_ID,
      ...(all ? {} : { dueAt: { lte: new Date() } }),
    },
    orderBy: { dueAt: "asc" },
  });
  return Response.json(cards);
}

export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const body = await req.json();
  const card = await prisma.revision.create({
    data: {
      userId: DEMO_USER_ID,
      front: body.front,
      back: body.back,
      subject: body.subject ?? null,
      noteId: body.noteId ?? null,
    },
  });
  return Response.json(card);
}
