import { prisma } from "@/lib/db";

export async function GET() {
  const affairs = await prisma.currentAffair.findMany({
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  return Response.json(affairs);
}
