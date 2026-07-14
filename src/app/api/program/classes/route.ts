import { NextRequest } from "next/server";
import { upcomingClassTickets, syncClassTickets, scanScheduleDocs, decodeScheduleBatch, sessionsOn } from "@/lib/class-schedule";

/**
 * Class schedule → Sprint Board bridge (StudyIQ GS + PSIR).
 *   GET  ?days=7        → upcoming sessions + proposed tickets (preview, no writes)
 *   POST { sync, days } → create the missing CLASS/test tickets in the active sprint
 *   POST { decode }     → scan the Class Schedules folder + decode weekly PDFs
 */
export async function GET(req: NextRequest) {
  const days = Math.min(14, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
  const tickets = await upcomingClassTickets(days);
  const today = await sessionsOn(new Date());
  return Response.json({ today, tickets });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sync?: boolean; days?: number; decode?: boolean };
  if (body.decode) {
    const scan = await scanScheduleDocs();
    const dec = await decodeScheduleBatch(3);
    return Response.json({ ok: true, scan, decoded: dec });
  }
  const days = Math.min(14, Math.max(1, body.days ?? 7));
  const r = await syncClassTickets(days);
  return Response.json({ ok: true, ...r });
}
