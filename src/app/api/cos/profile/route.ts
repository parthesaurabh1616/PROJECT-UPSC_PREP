import { computeProfile, maybeSnapshot } from "@/lib/cos-profile";

/** COS M1 — the learning profile (evidence-gated). Sundays also persist
    a ProfileSnapshot for trends (idempotent). */
export async function GET() {
  await maybeSnapshot().catch(() => {});
  const profile = await computeProfile();
  return Response.json(profile);
}
