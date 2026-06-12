import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const note = await prisma.note.update({
    where: { id, userId: DEMO_USER_ID },
    data: {
      title: body.title,
      content: body.content,
      subject: body.subject,
      tags: body.tags,
    },
  });
  return Response.json(note);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id, userId: DEMO_USER_ID } });
  return new Response(null, { status: 204 });
}
