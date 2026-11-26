-- Round 5 question 25: updating the PIF of a market on sale is a separate draft revision under a Change Control record (the approved PIF and the
-- launch decision stay in force), and when new information undermines the version on sale Regulatory / Quality suspend its approval and record why.
-- Additive and empty: nothing is invented for markets already on sale.
CREATE TABLE "pif_revisions" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "changeId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "evidenceLink" TEXT,
  "openedBy" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pif_revisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pif_revisions_projectId_market_idx" ON "pif_revisions"("projectId", "market");
ALTER TABLE "pif_revisions" ADD CONSTRAINT "pif_revisions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_tracks" ADD COLUMN "approvalSuspendedBy" TEXT;
ALTER TABLE "market_tracks" ADD COLUMN "approvalSuspendedAt" DATE;
ALTER TABLE "market_tracks" ADD COLUMN "approvalSuspendedReason" TEXT;
