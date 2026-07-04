-- AlterTable
ALTER TABLE "sprint_tasks" ADD COLUMN     "nodeId" TEXT;

-- CreateTable
CREATE TABLE "topic_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TOUCHED',
    "ladderStage" INTEGER NOT NULL DEFAULT 0,
    "lastRevisedAt" TIMESTAMP(3),
    "nextRevisionAt" TIMESTAMP(3),
    "lastGrade" INTEGER,
    "lqs" INTEGER NOT NULL DEFAULT 0,
    "lqsParts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "sleepHrs" DOUBLE PRECISION,
    "energy" INTEGER,
    "mood" INTEGER,
    "stress" INTEGER,
    "focus" INTEGER,
    "confidence" INTEGER,
    "distraction" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "alternatives" TEXT,
    "expectedOutcome" TEXT,
    "reviewAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_artifacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_states_userId_nextRevisionAt_idx" ON "topic_states"("userId", "nextRevisionAt");

-- CreateIndex
CREATE UNIQUE INDEX "topic_states_userId_nodeId_key" ON "topic_states"("userId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_userId_day_key" ON "daily_checkins"("userId", "day");

-- CreateIndex
CREATE INDEX "decision_records_userId_status_idx" ON "decision_records"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "topic_artifacts_userId_nodeId_kind_key" ON "topic_artifacts"("userId", "nodeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "profile_snapshots_userId_weekStart_key" ON "profile_snapshots"("userId", "weekStart");
