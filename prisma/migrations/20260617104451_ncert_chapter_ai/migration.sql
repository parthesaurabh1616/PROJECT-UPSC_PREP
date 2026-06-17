-- AlterTable
ALTER TABLE "ncert_chapters" ADD COLUMN     "aiConcepts" TEXT[],
ADD COLUMN     "aiFacts" TEXT[],
ADD COLUMN     "aiMcqs" JSONB,
ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiSummary" TEXT;
