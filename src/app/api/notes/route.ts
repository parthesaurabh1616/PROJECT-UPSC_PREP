import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { logEvent } from "@/lib/activity";
import { indexContent } from "@/lib/embeddings";

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
  await logEvent({ type: "NOTE_CREATED", refId: note.id, subject: note.subject });
  // Best-effort: add the note to the semantic index so the mentor can find it.
  void indexContent("NOTE", note.id, "ALL", `${note.title}. ${note.subject ?? ""} ${note.tags.join(" ")} ${note.content}`).catch(() => {});
  return Response.json(note);
}
