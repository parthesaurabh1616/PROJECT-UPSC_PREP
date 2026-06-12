import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { sm2 } from "@/lib/sm2";

export async function POST(req: NextRequest) {
  const { cardId, quality } = await req.json() as { cardId: string; quality: 0 | 1 | 2 | 3 | 4 | 5 };

  const card = await prisma.revision.findFirst({
    where: { id: cardId, userId: DEMO_USER_ID },
  });
  if (!card) return new Response("Card not found", { status: 404 });

  const result = sm2(quality, card.repetitions, card.interval, card.easeFactor);

  const updated = await prisma.revision.update({
    where: { id: cardId },
    data: {
      interval: result.interval,
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      dueAt: result.dueAt,
      reviewCount: { increment: 1 },
    },
  });

  return Response.json(updated);
}
