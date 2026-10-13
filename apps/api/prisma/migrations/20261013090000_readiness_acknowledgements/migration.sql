-- Reviewer assessment of auto-generated "not applicable" reasons
-- (Round 4 question 16; who/which is our reading, R5-Q6).
--
-- One row per (project, gate, item), edited in place by the nominated reviewer; the
-- history of edits is the audit trail (before/after on every change), not extra rows.
-- Created lazily: no backfill and nothing to scaffold. An item with no row is simply
-- "not acknowledged", which is what the readiness engine reads, so every critical
-- auto-N/A item starts blocked on existing projects — the correct starting state for
-- a control that did not exist yesterday.
CREATE TABLE "readiness_acknowledgements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'Acknowledged',
    "comment" TEXT,
    "acknowledgedByUserId" TEXT,
    "acknowledgedByName" TEXT NOT NULL,
    "acknowledgedAs" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "readiness_acknowledgements_projectId_gateId_itemId_key"
  ON "readiness_acknowledgements"("projectId", "gateId", "itemId");

ALTER TABLE "readiness_acknowledgements" ADD CONSTRAINT "readiness_acknowledgements_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "readiness_acknowledgements" ADD CONSTRAINT "readiness_acknowledgements_acknowledgedByUserId_fkey"
  FOREIGN KEY ("acknowledgedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
