-- Round 5 question 11: area-specific assessments hang off the master change record, each recorded by the function accountable for the area.
ALTER TABLE "change_records" ADD COLUMN "areaAssessments" JSONB NOT NULL DEFAULT '[]';
