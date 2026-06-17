-- CreateTable
CREATE TABLE "ncert_books" (
    "id" TEXT NOT NULL,
    "klass" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "coverStyle" INTEGER NOT NULL DEFAULT 0,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncert_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncert_chapters" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'chapter',
    "chapterNo" INTEGER,
    "pdfPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ncert_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ncert_books_klass_subject_idx" ON "ncert_books"("klass", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "ncert_books_klass_subject_title_key" ON "ncert_books"("klass", "subject", "title");

-- CreateIndex
CREATE INDEX "ncert_chapters_bookId_order_idx" ON "ncert_chapters"("bookId", "order");

-- AddForeignKey
ALTER TABLE "ncert_chapters" ADD CONSTRAINT "ncert_chapters_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ncert_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
