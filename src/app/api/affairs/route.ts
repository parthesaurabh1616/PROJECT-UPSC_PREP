import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // optional filter

  const affairs = await prisma.currentAffair.findMany({
    where: category && category !== "all" ? { category } : undefined,
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
  return Response.json(affairs);
}
