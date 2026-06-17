import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";

/**
 * GET /api/ncert/pdf?id=<chapterId>
 * Streams the chapter PDF from its original disk location (no duplication).
 * Supports HTTP Range so the browser PDF viewer can seek/page efficiently.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response("id required", { status: 400 });

  const ch = await prisma.ncertChapter.findUnique({ where: { id } });
  if (!ch || !fs.existsSync(ch.pdfPath)) return new Response("Not found", { status: 404 });

  const stat = fs.statSync(ch.pdfPath);
  const total = stat.size;
  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": `inline; filename="chapter.pdf"`,
  };

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    const chunk = fs.createReadStream(ch.pdfPath, { start, end });
    return new Response(chunk as unknown as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = fs.createReadStream(ch.pdfPath);
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(total) },
  });
}
