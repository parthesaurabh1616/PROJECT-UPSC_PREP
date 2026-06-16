import { NextRequest } from "next/server";
import { getActiveProfile, switchActiveExam } from "@/lib/exam";

// GET /api/exams/active → the user's active exam profile (with stages)
export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) {
    return Response.json({ error: "No exams configured. Run npm run db:seed." }, { status: 503 });
  }
  return Response.json({
    examCode: profile.exam.code,
    examName: profile.exam.name,
    shortName: profile.exam.shortName,
    languages: profile.exam.languages,
    accentColor: profile.exam.accentColor,
    language: profile.language,
    optionalSubject: profile.optionalSubject,
    targetYear: profile.targetYear,
    stages: profile.exam.stages.map((s) => ({
      type: s.type, name: s.name, totalMarks: s.totalMarks, papers: s.papers,
    })),
  });
}

// POST /api/exams/active { code } → switch active exam
export async function POST(req: NextRequest) {
  const { code } = await req.json() as { code: string };
  if (!code) return Response.json({ error: "code required" }, { status: 400 });
  try {
    const profile = await switchActiveExam(code);
    return Response.json({ ok: true, activeCode: profile.exam.code });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "switch failed" }, { status: 400 });
  }
}
