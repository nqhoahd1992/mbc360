-- Round 5 question 6: the change signal carries the four-level criticality, an urgent flag (urgent safety issue or mandatory restriction —
-- an immediate hold) and a safety-issue flag; a proposed Critical change is confirmed by a qualified function on each project.
-- A signal already marked Critical held release at once, so it is carried over as urgent: nobody's existing hold is lifted by this change.
ALTER TABLE "reference_signals"
  ADD COLUMN "criticality" TEXT NOT NULL DEFAULT 'Medium',
  ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "safetyIssue" BOOLEAN NOT NULL DEFAULT false;
UPDATE "reference_signals" SET "criticality" = 'Critical', "urgent" = true WHERE "critical" = true;

ALTER TABLE "impact_assessments" ADD COLUMN "criticalConfirmed" JSONB;
