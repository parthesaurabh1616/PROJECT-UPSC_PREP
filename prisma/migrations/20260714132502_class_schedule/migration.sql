-- CreateTable
CREATE TABLE "class_overrides" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "track" TEXT NOT NULL,
    "topic" TEXT,
    "time" TEXT,
    "faculty" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_docs" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mtimeMs" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "entries" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "decodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_docs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_overrides_day_track_key" ON "class_overrides"("day", "track");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_docs_path_key" ON "schedule_docs"("path");

-- CreateIndex
CREATE INDEX "schedule_docs_status_idx" ON "schedule_docs"("status");
