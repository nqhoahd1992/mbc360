-- Round 5 question 23(c): a formula version is proposed by its initiator and confirmed by a different authorised Technical / Quality reviewer. At most
-- one proposal waits per project. Additive and empty: versions already created keep the confirmer they recorded.
CREATE TABLE "formula_version_proposals" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "reason" TEXT,
  "majorCriteria" TEXT[],
  "documentationOnly" BOOLEAN NOT NULL DEFAULT false,
  "confirmNoRelease" BOOLEAN NOT NULL DEFAULT false,
  "proposedBy" TEXT NOT NULL,
  "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "formula_version_proposals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "formula_version_proposals_projectId_key" ON "formula_version_proposals"("projectId");
ALTER TABLE "formula_version_proposals" ADD CONSTRAINT "formula_version_proposals_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
