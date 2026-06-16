import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/exam";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");        // optional category filter
  const examParam = searchParams.get("exam");           // optional explicit exam override

  // Resolve the exam scope: explicit param > active profile > UPSC
  let examCode = examParam;
  if (!examCode) {
    const profile = await getActiveProfile().catch(() => null);
    examCode = profile?.exam.code ?? "UPSC";
  }

  const affairs = await prisma.currentAffair.findMany({
    where: {
      examScope: { has: examCode },
      ...(category && category !== "all" ? { category } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 80,
  });
  return Response.json(affairs);
}
