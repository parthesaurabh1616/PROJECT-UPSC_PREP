import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";

/* ════════════════════════════════════════════════════════════
   Civil Services Core Engine — exam resolution helpers
   The "active exam" drives syllabus, content, AI persona, and
   language across every module. UPSC is the default.
   ════════════════════════════════════════════════════════════ */

export interface ExamSummary {
  id: string;
  code: string;
  name: string;
  shortName: string;
  authority: string;
  languages: string[];
  accentColor: string;
}

/** All active exams, ordered for the switcher. */
export async function listExams() {
  return prisma.exam.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** The user's active exam profile, creating a default (UPSC primary) if none. */
export async function getActiveProfile() {
  await ensureDemoUser();

  let profile = await prisma.userExamProfile.findFirst({
    where: { userId: DEMO_USER_ID, isPrimary: true },
    include: { exam: { include: { stages: { orderBy: { sortOrder: "asc" } } } } },
  });

  if (!profile) {
    // First run — make UPSC the primary profile (fallback: first exam).
    const upsc =
      (await prisma.exam.findUnique({ where: { code: "UPSC" } })) ??
      (await prisma.exam.findFirst({ orderBy: { sortOrder: "asc" } }));
    if (!upsc) return null; // exams not seeded yet

    profile = await prisma.userExamProfile.upsert({
      where: { userId_examId: { userId: DEMO_USER_ID, examId: upsc.id } },
      update: { isPrimary: true },
      create: { userId: DEMO_USER_ID, examId: upsc.id, isPrimary: true, language: "en" },
      include: { exam: { include: { stages: { orderBy: { sortOrder: "asc" } } } } },
    });
  }

  return profile;
}

/** Switch the user's active exam by exam code (UPSC | MPSC | …). */
export async function switchActiveExam(code: string) {
  await ensureDemoUser();
  const exam = await prisma.exam.findUnique({ where: { code } });
  if (!exam) throw new Error(`Unknown exam: ${code}`);

  // Demote all, then ensure + promote the chosen one.
  await prisma.userExamProfile.updateMany({
    where: { userId: DEMO_USER_ID },
    data: { isPrimary: false },
  });

  return prisma.userExamProfile.upsert({
    where: { userId_examId: { userId: DEMO_USER_ID, examId: exam.id } },
    update: { isPrimary: true },
    create: { userId: DEMO_USER_ID, examId: exam.id, isPrimary: true, language: exam.languages[0] ?? "en" },
    include: { exam: true },
  });
}

/** Syllabus nodes for an exam, optionally filtered by paper. */
export async function getSyllabus(examId: string, paperCode?: string) {
  return prisma.syllabusNode.findMany({
    where: { examId, ...(paperCode ? { paperCode } : {}) },
    orderBy: { sortOrder: "asc" },
  });
}
