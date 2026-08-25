-- Round 4 question 3 (2026-08-24): a gap carries its own criticality assessment.
--
-- Also closes Round-2 A1, the general definition of "critical" open since 21 July,
-- and makes confirmed rule F7's "critical gap -> Hold / Backtrack / Reject" branch
-- enforceable for the first time — until now nothing recorded whether a gap was
-- critical, so the branch could never fire.
--
-- All eight columns are nullable and start NULL, which is deliberate: NULL means
-- "no qualified reviewer has graded this gap", and question 3 makes that state
-- BLOCK both Proceed decisions. Back-filling a grade would assert an assessment
-- nobody made — and would silently unblock every existing gap.
ALTER TABLE "gate_records"
  ADD COLUMN "gapCriticality" TEXT,
  ADD COLUMN "gapImpactCategory" TEXT,
  ADD COLUMN "gapAssessor" TEXT,
  ADD COLUMN "gapAssessmentDate" TEXT,
  ADD COLUMN "gapRationale" TEXT,
  ADD COLUMN "gapEvidenceLink" TEXT,
  ADD COLUMN "gapRequiredAction" TEXT,
  ADD COLUMN "gapActionOwner" TEXT;
