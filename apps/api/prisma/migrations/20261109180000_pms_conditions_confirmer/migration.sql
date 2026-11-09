-- The four surveillance conditions carry the person who confirmed a No, like Administrative-only and foreseeable contact (project
-- owner, 2026-11-09). Additive, no backfill: existing answers are simply unconfirmed.
ALTER TABLE "projects"
  ADD COLUMN "pmsNewActiveConfirmedBy" TEXT,
  ADD COLUMN "pmsComplaintTrendConfirmedBy" TEXT,
  ADD COLUMN "pmsRecurringIssueConfirmedBy" TEXT,
  ADD COLUMN "pmsSurveillancePlanConfirmedBy" TEXT;
