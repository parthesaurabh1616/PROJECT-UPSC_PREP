import { SYLLABUS, syllabusStats } from "@/lib/syllabus-data";

/**
 * GET /api/syllabus/official — the full official UPSC CSE syllabus as
 * structured reference data (Prelims, Mains Essay & GS, and the three
 * optionals). Static, verifiable reference; live per-topic connections
 * (PYQ / NCERT / current affairs) are fetched on demand via /api/related?q=.
 */
export async function GET() {
  return Response.json({ groups: SYLLABUS, stats: syllabusStats() });
}
