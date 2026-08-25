-- Round 4 questions 8, 9, 11 and 12 (2026-08-24): explicit assessment answers.
-- All nullable and all starting NULL, which is deliberate: NULL means "not yet
-- assessed", the state question 7 requires to BLOCK rather than pass. Back-filling
-- a default would assert an answer nobody gave, which is the whole mistake.
ALTER TABLE "projects"
  ADD COLUMN "changeControlRequired" TEXT,
  ADD COLUMN "changeControlReviewer" TEXT,
  ADD COLUMN "changeControlReviewDate" TEXT,
  ADD COLUMN "changeControlRationale" TEXT,
  ADD COLUMN "changeControlRecordId" TEXT,
  ADD COLUMN "changeControlEvidenceLink" TEXT,
  ADD COLUMN "humanStudyPlanned" TEXT,
  ADD COLUMN "administrativeOnly" TEXT,
  ADD COLUMN "administrativeOnlyConfirmedBy" TEXT,
  ADD COLUMN "scaleUpRiskIdentified" TEXT,
  ADD COLUMN "scaleUpRiskDescription" TEXT,
  ADD COLUMN "scaleUpRiskAssessor" TEXT,
  ADD COLUMN "scaleUpRiskAssessmentDate" TEXT,
  ADD COLUMN "scaleUpRiskRationale" TEXT,
  ADD COLUMN "scaleUpRiskActivity" TEXT,
  ADD COLUMN "scaleUpRiskEvidenceLink" TEXT;
