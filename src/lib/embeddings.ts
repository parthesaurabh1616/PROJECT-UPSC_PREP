/* ════════════════════════════════════════════════════════════
   EMBEDDINGS — semantic index over all platform content.
   Uses Gemini text-embedding-004 (768-dim, free tier) and stores
   vectors in pgvector. Written/queried via raw SQL because Prisma
   Client cannot operate on the native `vector` type.

   Every function degrades gracefully: if Gemini is unconfigured or
   throttled, embed* returns null and search returns [], so callers
   fall back to keyword retrieval instead of breaking.
   ════════════════════════════════════════════════════════════ */
import { prisma } from "@/lib/db";

// gemini-embedding-001 with Matryoshka truncation to 768 dims (cosine-safe,
// fits pgvector's HNSW limit). Called via REST so we can pass
// outputDimensionality + taskType, which the typed SDK does not expose.
export const EMBED_DIM = 768;
const EMBED_MODEL = "gemini-embedding-001";
const endpoint = () => `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${process.env.GOOGLE_API_KEY}`;

const toVec = (v: number[]) => `[${v.join(",")}]`;            // pgvector literal
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 8000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One raw embed call with light 429 backoff. taskType tunes the vector for its role. */
async function rawEmbed(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[] | null> {
  if (!process.env.GOOGLE_API_KEY || !text.trim()) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(endpoint(), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text: clean(text) }] }, taskType, outputDimensionality: EMBED_DIM }),
      });
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) { console.error("[embeddings] HTTP", res.status, (await res.text()).slice(0, 120)); return null; }
      const j = await res.json() as { embedding?: { values?: number[] } };
      return j.embedding?.values ?? null;
    } catch (e) {
      console.error("[embeddings] embed failed:", e instanceof Error ? e.message : e);
      await sleep(800);
    }
  }
  return null;
}

/** Embed a search query (RETRIEVAL_QUERY). Null on failure. */
export async function embedOne(text: string): Promise<number[] | null> {
  return rawEmbed(text, "RETRIEVAL_QUERY");
}

/** Embed many documents with bounded concurrency. Same index order; null per item on failure. */
export async function embedMany(texts: string[], concurrency = 6): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = new Array(texts.length).fill(null);
  let i = 0;
  async function worker() {
    while (i < texts.length) {
      const idx = i++;
      out[idx] = await rawEmbed(texts[idx], "RETRIEVAL_DOCUMENT");
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return out;
}

/** Upsert one content row into the semantic index (embeds as a document, then writes the vector). */
export async function indexContent(kind: string, refId: string, examCode: string, content: string): Promise<boolean> {
  const [vec] = await embedMany([content]);
  if (!vec) return false;
  await prisma.$executeRawUnsafe(
    `INSERT INTO embeddings (id, kind, "refId", "examCode", content, embedding, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, now(), now())
     ON CONFLICT (kind, "refId") DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, "updatedAt" = now()`,
    kind, refId, examCode, clean(content), toVec(vec),
  );
  return true;
}

/** Bulk upsert (kind, refId, examCode, content)[] — embeds in batches. Returns count written. */
export async function indexBatch(items: { kind: string; refId: string; examCode: string; content: string }[]): Promise<number> {
  if (items.length === 0) return 0;
  const vecs = await embedMany(items.map((i) => i.content));
  let n = 0;
  for (let i = 0; i < items.length; i++) {
    const v = vecs[i]; const it = items[i];
    if (!v) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO embeddings (id, kind, "refId", "examCode", content, embedding, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, now(), now())
       ON CONFLICT (kind, "refId") DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, "updatedAt" = now()`,
      it.kind, it.refId, it.examCode, clean(it.content), toVec(v),
    );
    n++;
  }
  return n;
}

/** Remove a row from the index (e.g. when source content is deleted). */
export async function deindex(kind: string, refId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE kind = $1 AND "refId" = $2`, kind, refId).catch(() => {});
}

export interface SemanticHit { kind: string; refId: string; content: string; score: number }

/**
 * Cosine-similarity search. Returns the most semantically similar rows.
 * `kinds` filters by content type; `examCode` keeps exam-scoped content
 * (CA/PYQ) relevant while leaving NCERT/NOTE global.
 */
export async function semanticSearch(
  query: string,
  opts: { kinds?: string[]; examCode?: string; limit?: number; minScore?: number } = {},
): Promise<SemanticHit[]> {
  const qv = await embedOne(query);
  if (!qv) return [];
  const limit = opts.limit ?? 16;
  const minScore = opts.minScore ?? 0.35;

  const params: unknown[] = [toVec(qv)];
  const where: string[] = ["embedding IS NOT NULL"];
  if (opts.kinds?.length) { params.push(opts.kinds); where.push(`kind = ANY($${params.length})`); }
  // exam-scoped kinds must match examCode (or 'ALL'); NCERT/NOTE are global
  if (opts.examCode) { params.push([opts.examCode, "ALL"]); where.push(`(kind IN ('NCERT','NOTE') OR "examCode" = ANY($${params.length}))`); }
  params.push(limit);

  const rows = await prisma.$queryRawUnsafe<{ kind: string; refId: string; content: string; score: number }[]>(
    `SELECT kind, "refId", content, 1 - (embedding <=> $1::vector) AS score
     FROM embeddings
     WHERE ${where.join(" AND ")}
     ORDER BY embedding <=> $1::vector
     LIMIT $${params.length}`,
    ...params,
  );
  return rows.filter((r) => Number(r.score) >= minScore).map((r) => ({ ...r, score: Number(r.score) }));
}

/** True when the index has at least one usable vector. */
export async function indexReady(): Promise<boolean> {
  try {
    const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM embeddings WHERE embedding IS NOT NULL`);
    return Number(r[0]?.n ?? 0) > 0;
  } catch { return false; }
}
