-- CreateTable
CREATE TABLE "mcqs" (
    "id" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "answerIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'ai',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "mode" TEXT NOT NULL DEFAULT 'subject',
    "subject" TEXT,
    "totalQ" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "percent" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL,
    "bySubject" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcqs_examCode_subject_idx" ON "mcqs"("examCode", "subject");

-- CreateIndex
CREATE INDEX "test_attempts_userId_createdAt_idx" ON "test_attempts"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
