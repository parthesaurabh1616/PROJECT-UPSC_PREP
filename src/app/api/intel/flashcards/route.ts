import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";
import { generateFlashcards } from "@/lib/ai";
import { scoreAffair } from "@/lib/scoring";

/** Derive a revision subject from an event's GS mapping / category. */
function subjectOf(gsMapping: string[], category: string): string {
  if (gsMapping.length) return gsMapping[0];
  if (category === "maharashtra") return "Maharashtra";
  if (category === "economy") return "Economy";
  if (category === "international") return "International Relations";
  return "Current Affairs";
}

/**
 * POST /api/intel/flashcards
 *   { eventId }   → generate + store cards for one event
 *   { top: N }    → generate + store cards for the top-N scored events (active exam)
 * Cards land directly in the SM-2 revision queue.
 */
export async function POST(req: NextRequest) {
  await ensureDemoUser();
  const body = await req.json() as { eventId?: string; top?: number };

  const profile = await getActiveProfile().catch(() => null);
  const examCode = profile?.exam.code ?? "UPSC";

  // Resolve the target events.
  let events: { id: string; headline: string; whyInNews: string | null; keyFacts: string | null; prelims: string | null; gsMapping: string[]; category: string }[] = [];

  if (body.eventId) {
    const e = await prisma.currentAffair.findUnique({ where: { id: body.eventId } });
    if (!e) return Response.json({ error: "Event not found" }, { status: 404 });
    events = [e];
  } else {
    const n = Math.min(Math.max(1, body.top ?? 5), 8);
    const rows = await prisma.currentAffair.findMany({
      where: { examScope: { has: examCode } },
      orderBy: { publishedAt: "desc" },
      take: 120,
    });
    rows.sort((a, b) => {
      const sa = a.importanceScore || scoreAffair({ gsMapping: a.gsMapping, tags: a.tags, category: a.category, source: a.source, priority: a.priority, publishedAt: a.publishedAt }).score;
      const sb = b.importanceScore || scoreAffair({ gsMapping: b.gsMapping, tags: b.tags, category: b.category, source: b.source, priority: b.priority, publishedAt: b.publishedAt }).score;
      return sb - sa;
    });
    events = rows.slice(0, n);
  }

  // Generate + persist.
  let created = 0;
  for (const ev of events) {
    const cards = await generateFlashcards(ev, examCode);
    if (!cards.length) continue;
    const subject = subjectOf(ev.gsMapping, ev.category);
    await prisma.revision.createMany({
      data: cards.map((c) => ({
        userId: DEMO_USER_ID,
        front: c.front,
        back: c.back,
        subject,
      })),
    });
    created += cards.length;
  }

  return Response.json({ created, events: events.length });
}
