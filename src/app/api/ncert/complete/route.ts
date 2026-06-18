import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { logEvent } from "@/lib/activity";

/**
 * POST /api/ncert/complete  { chapterId, undo? }
 * Marks an NCERT chapter as read for the user. Real activity →
 * ledger CHAPTER_READ (tagged with the book's subject for rollups).
 * GET  /api/ncert/complete?chapterId=… → { completed }
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const { chapterId, undo } = await req.json().catch(() => ({})) as { chapterId?: string; undo?: boolean };
  if (!chapterId) return Response.json({ error: "chapterId required" }, { status: 400 });

  const chapter = await prisma.ncertChapter.findUnique({ where: { id: chapterId }, include: { book: true } });
  if (!chapter) return Response.json({ error: "chapter not found" }, { status: 404 });

  if (undo) {
    await prisma.chapterProgress.deleteMany({ where: { userId: DEMO_USER_ID, chapterId } });
    return Response.json({ completed: false });
  }

  const existing = await prisma.chapterProgress.findUnique({
    where: { userId_chapterId: { userId: DEMO_USER_ID, chapterId } },
  });
  if (!existing) {
    await prisma.chapterProgress.create({ data: { userId: DEMO_USER_ID, chapterId, status: "completed" } });
    await logEvent({ type: "CHAPTER_READ", refId: chapterId, subject: chapter.book.subject });
  }
  return Response.json({ completed: true });
}

export async function GET(req: NextRequest) {
  await ensureDemoUser();
  const chapterId = new URL(req.url).searchParams.get("chapterId");
  if (!chapterId) return Response.json({ error: "chapterId required" }, { status: 400 });
  const row = await prisma.chapterProgress.findUnique({
    where: { userId_chapterId: { userId: DEMO_USER_ID, chapterId } },
  });
  return Response.json({ completed: !!row });
}
