-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "type" TEXT NOT NULL,
    "refId" TEXT,
    "subject" TEXT,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pyq_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "paperId" TEXT,
    "subject" TEXT,
    "selfRating" TEXT NOT NULL DEFAULT 'attempted',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pyq_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ca_reads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "affairId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ca_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_userId_createdAt_idx" ON "activity_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_userId_type_idx" ON "activity_events"("userId", "type");

-- CreateIndex
CREATE INDEX "activity_events_userId_subject_idx" ON "activity_events"("userId", "subject");

-- CreateIndex
CREATE INDEX "chapter_progress_userId_idx" ON "chapter_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_progress_userId_chapterId_key" ON "chapter_progress"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "pyq_attempts_userId_idx" ON "pyq_attempts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pyq_attempts_userId_questionId_key" ON "pyq_attempts"("userId", "questionId");

-- CreateIndex
CREATE INDEX "ca_reads_userId_idx" ON "ca_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ca_reads_userId_affairId_key" ON "ca_reads"("userId", "affairId");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pyq_attempts" ADD CONSTRAINT "pyq_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ca_reads" ADD CONSTRAINT "ca_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
