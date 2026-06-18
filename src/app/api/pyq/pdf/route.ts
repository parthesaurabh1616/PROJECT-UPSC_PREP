import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";

/** GET /api/pyq/pdf?id=<paperId> — streams the paper PDF from disk (HTTP Range). */
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("id required", { status: 400 });

  const paper = await prisma.pyqPaper.findUnique({ where: { id } });
  if (!paper || !fs.existsSync(paper.pdfPath)) return new Response("Not found", { status: 404 });

  const total = fs.statSync(paper.pdfPath).size;
  const range = req.headers.get("range");
  const base: Record<string, string> = {
    "Content-Type": "application/pdf", "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400", "Content-Disposition": 'inline; filename="paper.pdf"',
  };

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    return new Response(fs.createReadStream(paper.pdfPath, { start, end }) as unknown as ReadableStream, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(fs.createReadStream(paper.pdfPath) as unknown as ReadableStream, {
    status: 200, headers: { ...base, "Content-Length": String(total) },
  });
}
