import { NextRequest } from "next/server";
import fs from "fs";
import { listCrux, resolveCruxFile } from "@/lib/crux";

/**
 * Crux — institute notes shelf.
 *   GET            → grouped listing (subfolder = subject)
 *   GET ?file=rel  → stream the note itself (PDF opens in the browser)
 */
export async function GET(req: NextRequest) {
  const rel = new URL(req.url).searchParams.get("file");
  if (rel) {
    const f = resolveCruxFile(rel);
    if (!f) return Response.json({ error: "not found" }, { status: 404 });
    const buf = fs.readFileSync(f.abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(rel.split("/").pop() ?? "note")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  }
  return Response.json(listCrux());
}
