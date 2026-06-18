import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

/**
 * GET /api/ncert/progress
 * → { chapterIds: string[]; byBook: Record<bookId, count> }
 * Powers completion checkmarks on the chapter list and "N/total"
 * badges on the book covers. Real, per-user.
 */
export async function GET() {
  await ensureDemoUser();
  const rows = await prisma.chapterProgress.findMany({
    where: { userId: DEMO_USER_ID },
    select: { chapterId: true },
  });
  const chapterIds = rows.map((r) => r.chapterId);

  const byBook: Record<string, number> = {};
  if (chapterIds.length > 0) {
    const chapters = await prisma.ncertChapter.findMany({
      where: { id: { in: chapterIds } },
      select: { bookId: true },
    });
    for (const c of chapters) byBook[c.bookId] = (byBook[c.bookId] ?? 0) + 1;
  }
  return Response.json({ chapterIds, byBook });
}
