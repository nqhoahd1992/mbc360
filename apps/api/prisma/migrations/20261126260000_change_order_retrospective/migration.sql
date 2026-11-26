-- Round 5 question 32: a new version of a controlled formula names its approved master change record; a change that happened before it was recorded keeps its real implementation date and approval gap.
ALTER TABLE "formula_version_proposals" ADD COLUMN "changeId" TEXT;
ALTER TABLE "change_records" ADD COLUMN "retrospective" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "change_records" ADD COLUMN "actualImplementationDate" DATE;
ALTER TABLE "change_records" ADD COLUMN "approvalGap" TEXT;
ALTER TABLE "change_records" ADD COLUMN "retrospectiveReview" TEXT;
