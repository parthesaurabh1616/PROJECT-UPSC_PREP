-- CreateTable
CREATE TABLE "class_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "nodeId" TEXT,
    "topic" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anchors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_summaries_userId_day_idx" ON "class_summaries"("userId", "day");
