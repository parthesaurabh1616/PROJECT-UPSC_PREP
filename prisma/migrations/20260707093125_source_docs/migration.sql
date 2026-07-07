-- CreateTable
CREATE TABLE "source_docs" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "day" TIMESTAMP(3),
    "size" INTEGER NOT NULL,
    "mtimeMs" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "items" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "decodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_docs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_docs_path_key" ON "source_docs"("path");

-- CreateIndex
CREATE INDEX "source_docs_status_idx" ON "source_docs"("status");
