-- AlterTable
ALTER TABLE "current_affairs" ADD COLUMN     "importanceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "layer" TEXT NOT NULL DEFAULT 'india';

-- CreateIndex
CREATE INDEX "current_affairs_importanceScore_idx" ON "current_affairs"("importanceScore");
