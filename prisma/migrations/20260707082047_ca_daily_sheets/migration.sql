-- CreateTable
CREATE TABLE "ca_daily_sheets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "judgedCount" INTEGER NOT NULL DEFAULT 0,
    "sourceHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ca_daily_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ca_daily_sheets_userId_day_key" ON "ca_daily_sheets"("userId", "day");
