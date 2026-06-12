import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { getPresignedUrl } from "@/lib/s3";

export async function GET() {
  await ensureDemoUser();
  const files = await prisma.libraryFile.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });

  const filesWithUrls = await Promise.all(
    files.map(async (f) => ({
      ...f,
      url: await getPresignedUrl(f.s3Key).catch(() => null),
    })),
  );

  return Response.json(filesWithUrls);
}
