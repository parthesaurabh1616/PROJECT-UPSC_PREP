import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/ncert            → full tree: classes → subjects → books
 * GET /api/ncert?book=<id>  → one book with its chapters
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("book");

  if (bookId) {
    const book = await prisma.ncertBook.findUnique({
      where: { id: bookId },
      include: { chapters: { orderBy: { order: "asc" } } },
    });
    if (!book) return Response.json({ error: "Book not found" }, { status: 404 });
    return Response.json({
      ...book,
      chapters: book.chapters.map((c) => ({
        id: c.id, order: c.order, title: c.title, kind: c.kind,
        chapterNo: c.chapterNo, sizeBytes: c.sizeBytes,
      })),
    });
  }

  const books = await prisma.ncertBook.findMany({
    orderBy: [{ klass: "asc" }, { subject: "asc" }, { sortOrder: "asc" }],
    select: { id: true, klass: true, subject: true, title: true, coverStyle: true, chapterCount: true },
  });

  // Group classes → subjects → books
  const classes = new Map<number, Map<string, typeof books>>();
  for (const b of books) {
    if (!classes.has(b.klass)) classes.set(b.klass, new Map());
    const subj = classes.get(b.klass)!;
    if (!subj.has(b.subject)) subj.set(b.subject, []);
    subj.get(b.subject)!.push(b);
  }

  const tree = [...classes.entries()].map(([klass, subjMap]) => ({
    klass,
    subjects: [...subjMap.entries()].map(([subject, bks]) => ({ subject, books: bks })),
  }));

  return Response.json({ totalBooks: books.length, classes: tree });
}
