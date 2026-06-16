-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "accentColor" TEXT NOT NULL DEFAULT 'accent',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_stages" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "papers" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_nodes" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleMr" TEXT,
    "stage" TEXT,
    "paperCode" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "syllabus_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exam_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "optionalSubject" TEXT,
    "targetYear" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_exam_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exams_code_key" ON "exams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exam_stages_examId_type_key" ON "exam_stages"("examId", "type");

-- CreateIndex
CREATE INDEX "syllabus_nodes_examId_parentId_idx" ON "syllabus_nodes"("examId", "parentId");

-- CreateIndex
CREATE INDEX "syllabus_nodes_examId_paperCode_idx" ON "syllabus_nodes"("examId", "paperCode");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_nodes_examId_code_key" ON "syllabus_nodes"("examId", "code");

-- CreateIndex
CREATE INDEX "user_exam_profiles_userId_isPrimary_idx" ON "user_exam_profiles"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "user_exam_profiles_userId_examId_key" ON "user_exam_profiles"("userId", "examId");

-- AddForeignKey
ALTER TABLE "exam_stages" ADD CONSTRAINT "exam_stages_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "syllabus_nodes_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "syllabus_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exam_profiles" ADD CONSTRAINT "user_exam_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exam_profiles" ADD CONSTRAINT "user_exam_profiles_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
