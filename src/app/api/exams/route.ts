import { listExams, getActiveProfile } from "@/lib/exam";

// GET /api/exams → { exams, activeCode }
export async function GET() {
  const [exams, profile] = await Promise.all([listExams(), getActiveProfile()]);
  return Response.json({
    exams: exams.map((e) => ({
      id: e.id, code: e.code, name: e.name, shortName: e.shortName,
      authority: e.authority, languages: e.languages, accentColor: e.accentColor,
    })),
    activeCode: profile?.exam.code ?? null,
  });
}
