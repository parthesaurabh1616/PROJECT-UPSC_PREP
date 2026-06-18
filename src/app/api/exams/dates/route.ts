import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";

/**
 * GET  /api/exams/dates → the active profile's target year + exact exam dates.
 * POST /api/exams/dates → set them (null clears a date back to estimate).
 */
export async function GET() {
  const p = await getActiveProfile().catch(() => null);
  if (!p) return Response.json({ error: "no active exam" }, { status: 503 });
  return Response.json({
    examCode: p.exam.code, shortName: p.exam.shortName,
    targetYear: p.targetYear, targetMarks: p.targetMarks,
    prelimsDate: p.prelimsDate, mainsDate: p.mainsDate, interviewDate: p.interviewDate,
  });
}

function parseDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;     // not provided → leave unchanged
  if (v === null || v === "") return null;    // explicitly cleared
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}

export async function POST(req: NextRequest) {
  const p = await getActiveProfile().catch(() => null);
  if (!p) return Response.json({ error: "no active exam" }, { status: 503 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (body.targetYear !== undefined) {
    const y = Number(body.targetYear);
    data.targetYear = Number.isInteger(y) && y >= 2024 && y <= 2035 ? y : null;
  }
  if (body.targetMarks !== undefined) {
    const t = Number(body.targetMarks);
    data.targetMarks = Number.isFinite(t) && t >= 700 && t <= 2025 ? Math.round(t) : null;
  }
  const pre = parseDate(body.prelimsDate); if (pre !== undefined) data.prelimsDate = pre;
  const mns = parseDate(body.mainsDate); if (mns !== undefined) data.mainsDate = mns;
  const intv = parseDate(body.interviewDate); if (intv !== undefined) data.interviewDate = intv;

  const updated = await prisma.userExamProfile.update({ where: { id: p.id }, data });
  return Response.json({
    ok: true, targetYear: updated.targetYear, targetMarks: updated.targetMarks,
    prelimsDate: updated.prelimsDate, mainsDate: updated.mainsDate, interviewDate: updated.interviewDate,
  });
}
