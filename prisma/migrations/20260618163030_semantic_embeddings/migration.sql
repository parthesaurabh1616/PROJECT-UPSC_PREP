-- Enable pgvector (image: pgvector/pgvector:pg16)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "examCode" TEXT NOT NULL DEFAULT 'UPSC',
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "embeddings_kind_idx" ON "embeddings"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_kind_refId_key" ON "embeddings"("kind", "refId");

-- Approximate-nearest-neighbour index for cosine similarity search
CREATE INDEX "embeddings_vec_hnsw" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);
