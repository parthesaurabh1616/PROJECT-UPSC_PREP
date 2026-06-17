import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

interface Mcq { q: string; options: string[]; answer: string; explanation: string; }

/**
 * POST /api/ncert/to-revision { chapterId }
 * Pushes an analysed chapter's MCQs + key facts into the SM-2 revision queue.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const { chapterId } = await req.json() as { chapterId: string };
  if (!chapterId) return Response.json({ error: "chapterId required" }, { status: 400 });

  const ch = await prisma.ncertChapter.findUnique({
    where: { id: chapterId },
    include: { book: true },
  });
  if (!ch) return Response.json({ error: "not found" }, { status: 404 });
  if (!ch.aiProcessedAt) return Response.json({ error: "Generate AI study material first." }, { status: 400 });

  const subject = `${ch.book.subject} · NCERT`;
  const cards: { front: string; back: string }[] = [];

  // MCQs → cards (Q → answer + explanation)
  const mcqs = (ch.aiMcqs as unknown as Mcq[]) ?? [];
  for (const m of mcqs) {
    if (m?.q && m?.answer) cards.push({ front: m.q, back: `${m.answer}${m.explanation ? ` — ${m.explanation}` : ""}` });
  }
  // Key facts → cards (concept prompt → fact). Pair concepts with facts where possible.
  for (const f of ch.aiFacts.slice(0, 8)) {
    cards.push({ front: `${ch.title}: recall this fact`, back: f });
  }

  if (!cards.length) return Response.json({ error: "Nothing to add — analyse the chapter first." }, { status: 400 });

  await prisma.revision.createMany({
    data: cards.map((c) => ({ userId: DEMO_USER_ID, front: c.front, back: c.back, subject })),
  });

  return Response.json({ created: cards.length });
}
