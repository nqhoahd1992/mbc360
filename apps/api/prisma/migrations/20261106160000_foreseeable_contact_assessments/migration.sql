-- Answers a person gives instead of the engine inferring "not applicable" (Round 5 question 1(d)):
--   foreseeableMaternalContact / foreseeableInfantContact — "Maternal/infant exclusions must consider intended and reasonably
--     foreseeable contact, not only marketing ticks";
--   pmsNewActive / pmsComplaintTrend / pmsRecurringIssue / pmsSurveillancePlan — "Enhanced-surveillance N/A must assess all
--     applicable triggers, including those not yet structured in the app": the four conditions of Round 4 question 4 that the
--     application has no data source for, one question each.
-- Each answer is Yes or No, and a No carries its reason in the matching *Rationale column. Every existing project starts with all of
-- them blank, which reads as "not yet assessed": the items they decide wait until somebody answers. That is the intended state for a
-- control that did not exist yesterday; nothing is guessed on anyone's behalf.
ALTER TABLE "projects"
  ADD COLUMN "foreseeableMaternalContact" TEXT,
  ADD COLUMN "foreseeableMaternalRationale" TEXT,
  ADD COLUMN "foreseeableInfantContact" TEXT,
  ADD COLUMN "foreseeableInfantRationale" TEXT,
  ADD COLUMN "pmsNewActive" TEXT,
  ADD COLUMN "pmsNewActiveRationale" TEXT,
  ADD COLUMN "pmsComplaintTrend" TEXT,
  ADD COLUMN "pmsComplaintTrendRationale" TEXT,
  ADD COLUMN "pmsRecurringIssue" TEXT,
  ADD COLUMN "pmsRecurringIssueRationale" TEXT,
  ADD COLUMN "pmsSurveillancePlan" TEXT,
  ADD COLUMN "pmsSurveillancePlanRationale" TEXT;
