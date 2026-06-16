-- AlterTable
ALTER TABLE "current_affairs" ADD COLUMN     "examScope" TEXT[] DEFAULT ARRAY['UPSC', 'MPSC']::TEXT[],
ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "current_affairs_examScope_idx" ON "current_affairs"("examScope");
