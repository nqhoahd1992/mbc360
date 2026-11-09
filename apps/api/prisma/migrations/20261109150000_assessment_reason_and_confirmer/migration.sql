-- Administrative-only and foreseeable-contact share one shape (project owner, 2026-11-09): the answer or reason, and the person who
-- confirmed it. Additive, no backfill: the application is still in development and existing answers are simply unconfirmed.
ALTER TABLE "projects"
  ADD COLUMN "administrativeOnlyRationale" TEXT,
  ADD COLUMN "foreseeableContactConfirmedBy" TEXT;
