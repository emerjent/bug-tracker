-- CreateEnum
CREATE TYPE "DecisionCardStatus" AS ENUM ('open', 'answered', 'expired');

-- CreateEnum
CREATE TYPE "AgentPresenceState" AS ENUM ('claiming', 'planning', 'working', 'waiting_on_ci', 'blocked_on_you', 'idle');

-- CreateEnum
CREATE TYPE "AutonomyStep" AS ENUM ('suggest', 'draft', 'do_with_approval', 'do_and_report', 'auto_merge');

-- CreateTable
CREATE TABLE "DecisionCard" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "bugId" TEXT,
    "question" TEXT NOT NULL,
    "options" json NOT NULL,
    "recommendation" INTEGER,
    "confidence" INTEGER,
    "tried" TEXT,
    "costSoFar" INTEGER,
    "defaultAnswer" TEXT,
    "defaultTimerMinutes" INTEGER NOT NULL DEFAULT 240,
    "expiresAt" TIMESTAMP(3),
    "status" "DecisionCardStatus" NOT NULL DEFAULT 'open',
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPresence" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "state" "AgentPresenceState" NOT NULL DEFAULT 'idle',
    "detail" TEXT,
    "bugId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerdictOutcome" (
    "id" TEXT NOT NULL,
    "testVerdictId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "heldUp" BOOLEAN NOT NULL DEFAULT true,
    "caughtRegression" BOOLEAN NOT NULL DEFAULT false,
    "regressionPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerdictOutcome_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AgentAreaPreference" ADD COLUMN "step" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentAreaPreference" ADD COLUMN "maxStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentAreaPreference" ADD COLUMN "verdictStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentAreaPreference" ADD COLUMN "streakChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "DecisionCard_agentId_idx" ON "DecisionCard"("agentId");
CREATE INDEX "DecisionCard_ownerUserId_status_idx" ON "DecisionCard"("ownerUserId", "status");
CREATE INDEX "DecisionCard_bugId_idx" ON "DecisionCard"("bugId");
CREATE INDEX "DecisionCard_expiresAt_idx" ON "DecisionCard"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPresence_agentId_key" ON "AgentPresence"("agentId");
CREATE INDEX "AgentPresence_leaseExpiresAt_idx" ON "AgentPresence"("leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerdictOutcome_testVerdictId_key" ON "VerdictOutcome"("testVerdictId");
CREATE INDEX "VerdictOutcome_userId_createdAt_idx" ON "VerdictOutcome"("userId", "createdAt");
CREATE INDEX "VerdictOutcome_bugId_idx" ON "VerdictOutcome"("bugId");
CREATE INDEX "VerdictOutcome_heldUp_idx" ON "VerdictOutcome"("heldUp");

-- AddForeignKey
ALTER TABLE "DecisionCard" ADD CONSTRAINT "DecisionCard_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DecisionCard" ADD CONSTRAINT "DecisionCard_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DecisionCard" ADD CONSTRAINT "DecisionCard_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DecisionCard" ADD CONSTRAINT "DecisionCard_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentPresence" ADD CONSTRAINT "AgentPresence_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VerdictOutcome" ADD CONSTRAINT "VerdictOutcome_testVerdictId_fkey" FOREIGN KEY ("testVerdictId") REFERENCES "TestVerdict"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerdictOutcome" ADD CONSTRAINT "VerdictOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerdictOutcome" ADD CONSTRAINT "VerdictOutcome_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
