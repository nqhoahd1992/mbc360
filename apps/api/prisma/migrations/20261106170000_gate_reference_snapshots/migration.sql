-- SW-52 / Round 5 question 1(d): the company reference data as it stood when each gate passed.
CREATE TABLE "gate_reference_snapshots" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "gateId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  "reference" JSONB NOT NULL,
  CONSTRAINT "gate_reference_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gate_reference_snapshots_projectId_gateId_idx" ON "gate_reference_snapshots"("projectId", "gateId");

-- One ACTIVE snapshot per (project, gate). Superseded rows are kept, so the uniqueness covers only the active one.
CREATE UNIQUE INDEX "gate_reference_snapshots_active_key" ON "gate_reference_snapshots"("projectId", "gateId") WHERE "supersededAt" IS NULL;

ALTER TABLE "gate_reference_snapshots"
  ADD CONSTRAINT "gate_reference_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- No backfill: a gate that already passed gets its snapshot the first time the project is next written, taken from the lists as they
-- stand then. That is the earliest moment the application can know, and says nothing about what the lists held before.
