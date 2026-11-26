-- Round 5 question 27: pre-work is marked entry by entry (who entered it, when) and decided by the accountable owner (Accepted / Updated / Rejected).
-- Additive and empty: nothing entered before this existed is marked, so a phase already open has no entry waiting; a phase already accepted keeps its acceptance.
CREATE TABLE "pre_work_entries" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phase" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "enteredBy" TEXT,
  "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'Pre-work',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pre_work_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pre_work_entries_projectId_phase_kind_key_key" ON "pre_work_entries"("projectId", "phase", "kind", "key");
ALTER TABLE "pre_work_entries" ADD CONSTRAINT "pre_work_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
