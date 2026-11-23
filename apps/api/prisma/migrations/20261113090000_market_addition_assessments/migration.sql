-- Round 5 question 12: a market added after Gate 1 gets a mandatory Regulatory impact assessment before it can release.
CREATE TABLE "market_addition_assessments" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "addedBy" TEXT,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "differences" TEXT[],
  "noDifference" BOOLEAN NOT NULL DEFAULT false,
  "extraGates" TEXT[],
  "inputFrom" TEXT[],
  "conclusion" TEXT,
  "equivalenceConclusion" TEXT,
  "evidenceLink" TEXT,
  "assessedBy" TEXT,
  "assessedAt" TIMESTAMP(3),
  "reopenedGateIds" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "market_addition_assessments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_addition_assessments_projectId_market_key" ON "market_addition_assessments"("projectId", "market");
ALTER TABLE "market_addition_assessments" ADD CONSTRAINT "market_addition_assessments_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- No backfill: the markets a project already has were declared at, or recorded since, Gate 1; only a market added from now on is an amendment.
