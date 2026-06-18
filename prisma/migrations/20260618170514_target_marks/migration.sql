-- DropIndex
DROP INDEX "embeddings_vec_hnsw";

-- AlterTable
ALTER TABLE "user_exam_profiles" ADD COLUMN     "targetMarks" INTEGER;
