import { NextRequest } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.conversation.delete({
    where: { id, userId: DEMO_USER_ID },
  });
  return new Response(null, { status: 204 });
}
