import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

export async function GET() {
  await ensureDemoUser();
  const notes = await prisma.note.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(notes);
}

export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      userId: DEMO_USER_ID,
      title: body.title ?? "Untitled note",
      content: body.content ?? "",
      subject: body.subject ?? null,
      tags: body.tags ?? [],
    },
  });
  return Response.json(note);
}
