-- AlterTable
ALTER TABLE "current_affairs" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'news';

-- CreateIndex
CREATE INDEX "current_affairs_category_idx" ON "current_affairs"("category");

-- CreateIndex
CREATE INDEX "current_affairs_publishedAt_idx" ON "current_affairs"("publishedAt");
