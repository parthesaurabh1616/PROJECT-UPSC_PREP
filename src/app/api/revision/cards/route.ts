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
  const body = await req.json().catch(() => null) as { front?: string; back?: string; subject?: string; noteId?: string } | null;
  if (!body?.front?.trim() || !body?.back?.trim()) {
    return Response.json({ error: "A card needs both a front and a back." }, { status: 400 });
  }
  const card = await prisma.revision.create({
    data: {
      userId: DEMO_USER_ID,
      front: body.front.trim(),
      back: body.back.trim(),
      subject: body.subject?.trim() || null,
      noteId: body.noteId ?? null,
    },
  });
  return Response.json(card);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await prisma.revision.deleteMany({ where: { id, userId: DEMO_USER_ID } });
  return Response.json({ ok: true });
}
