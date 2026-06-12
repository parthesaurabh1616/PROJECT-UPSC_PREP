import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Hardcoded demo user — replaced by real auth later
export const DEMO_USER_ID = "demo-saurabh";

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      name: "Saurabh",
      email: "saurabh.parthe.1@gmail.com",
    },
  });
}
