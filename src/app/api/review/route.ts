import { computeWeeklyDigest } from "@/lib/digest";
import { summariseWeek } from "@/lib/ai";
import { getActiveProfile } from "@/lib/exam";

/**
 * GET /api/review — the honest weekly digest (real measurements) plus
 * a short AI coach narrative grounded strictly in those numbers.
 */
export async function GET() {
  const profile = await getActiveProfile().catch(() => null);
  const digest = await computeWeeklyDigest();
  const narrative = await summariseWeek(digest.facts, profile?.exam.shortName ?? "UPSC").catch(() => "");
  return Response.json({ ...digest, narrative, exam: profile?.exam.shortName ?? "UPSC CSE" });
}
