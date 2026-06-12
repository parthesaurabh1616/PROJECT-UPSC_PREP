import { prisma } from "@/lib/db";

export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error"> = {};

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // API key presence (never expose the actual key)
  checks.google_api_key = process.env.GOOGLE_API_KEY ? "ok" : "missing";
  checks.groq_api_key   = process.env.GROQ_API_KEY   ? "ok" : "missing";

  const allOk = Object.values(checks).every((v) => v === "ok");

  return Response.json({ status: allOk ? "healthy" : "degraded", checks });
}
