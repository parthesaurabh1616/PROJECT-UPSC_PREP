-- AlterTable
ALTER TABLE "current_affairs" ADD COLUMN     "boardAt" TIMESTAMP(3),
ADD COLUMN     "boardVerdict" JSONB,
ADD COLUMN     "mainsProb" INTEGER,
ADD COLUMN     "prelimsProb" INTEGER,
ADD COLUMN     "revisionPriority" INTEGER,
ADD COLUMN     "verdict" TEXT,
ADD COLUMN     "worthy" BOOLEAN;
