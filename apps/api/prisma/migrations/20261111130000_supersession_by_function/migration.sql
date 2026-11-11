-- Round 5 question 5: a market's supersession is confirmed fact by fact by the function accountable for each, coordinated by Quality and
-- confirmed by the authorised final approver. Additive: a decision confirmed before this keeps its single confirmation (confirmedBy) and
-- still counts as complete.
ALTER TABLE "supersession_decisions"
  ADD COLUMN "factConfirmations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "coordinatedBy" TEXT,
  ADD COLUMN "coordinatedAt" TIMESTAMP(3),
  ADD COLUMN "finalApprovedBy" TEXT,
  ADD COLUMN "finalApprovedAt" TIMESTAMP(3);

ALTER TABLE "formula_versions"
  ADD COLUMN "documentationOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noReleaseConfirmedBy" TEXT;
