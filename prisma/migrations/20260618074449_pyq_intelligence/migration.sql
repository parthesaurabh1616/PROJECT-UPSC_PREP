-- CreateTable
CREATE TABLE "pyq_papers" (
    "id" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "stage" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "paperCode" TEXT NOT NULL,
    "paperName" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pyq_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pyq_questions" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "marks" INTEGER,
    "topic" TEXT,
    "subtopic" TEXT,
    "gsMapping" TEXT[],
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pyq_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pyq_papers_examCode_stage_year_idx" ON "pyq_papers"("examCode", "stage", "year");

-- CreateIndex
CREATE INDEX "pyq_papers_paperCode_idx" ON "pyq_papers"("paperCode");

-- CreateIndex
CREATE UNIQUE INDEX "pyq_papers_examCode_stage_year_paperCode_key" ON "pyq_papers"("examCode", "stage", "year", "paperCode");

-- CreateIndex
CREATE INDEX "pyq_questions_paperId_idx" ON "pyq_questions"("paperId");

-- CreateIndex
CREATE INDEX "pyq_questions_topic_idx" ON "pyq_questions"("topic");

-- AddForeignKey
ALTER TABLE "pyq_questions" ADD CONSTRAINT "pyq_questions_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "pyq_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
