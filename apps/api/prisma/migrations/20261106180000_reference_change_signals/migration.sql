-- Round 5 question 1(d): a change to the company reference data raises an impact assessment for every project that relies on it, and a
-- change marked Critical holds the release of those projects until it is concluded.
CREATE TABLE "reference_signals" (
  "id" TEXT NOT NULL,
  "dataset" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "critical" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "dueDate" TEXT NOT NULL,
  "raisedById" TEXT,
  "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "impact_assessments" (
  "id" TEXT NOT NULL,
  "signalId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "functionKeys" TEXT[],
  "markets" TEXT[],
  "conclusions" JSONB NOT NULL DEFAULT '[]',
  "concludedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "impact_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reference_signals_dataset_entryId_idx" ON "reference_signals"("dataset", "entryId");
CREATE INDEX "impact_assessments_projectId_idx" ON "impact_assessments"("projectId");

ALTER TABLE "reference_signals"
  ADD CONSTRAINT "reference_signals_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "impact_assessments"
  ADD CONSTRAINT "impact_assessments_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "reference_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "impact_assessments"
  ADD CONSTRAINT "impact_assessments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- No backfill: no list change before this has raised anything, so every project starts with no hold.
