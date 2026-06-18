-- CreateTable
CREATE TABLE "mains_answers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "questionId" TEXT,
    "paperCode" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "answerText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "breakdown" JSONB,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "verdict" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mains_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mains_answers_userId_paperCode_idx" ON "mains_answers"("userId", "paperCode");

-- CreateIndex
CREATE INDEX "mains_answers_userId_evaluatedAt_idx" ON "mains_answers"("userId", "evaluatedAt");

-- AddForeignKey
ALTER TABLE "mains_answers" ADD CONSTRAINT "mains_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
