import { NextRequest } from "next/server";
import { prisma, ensureDemoUser, DEMO_USER_ID } from "@/lib/db";
import { uploadFile } from "@/lib/s3";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  await ensureDemoUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string) ?? "Standard";
  const subject = (formData.get("subject") as string) ?? null;
  const description = (formData.get("description") as string) ?? null;

  if (!file) return new Response("No file", { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "bin";
  const s3Key = `library/${DEMO_USER_ID}/${randomUUID()}.${ext}`;

  await uploadFile(s3Key, buffer, file.type);

  const record = await prisma.libraryFile.create({
    data: {
      userId: DEMO_USER_ID,
      name: file.name,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      s3Key,
      kind,
      subject,
      description,
    },
  });

  return Response.json(record, { status: 201 });
}
