-- The Change Control assessment of a post-market finding (Round 4 question 8) becomes a LIST,
-- one entry per finding, instead of six columns on `projects` (project owner, 2026-10-13).
--
-- Order matters: the table is created and the existing project-level answers are CARRIED OVER as
-- one entry each BEFORE the columns are dropped — a straight DROP COLUMN would discard recorded
-- answers (the same shape as 20260810041500_gate1_origin_nature_checklists).
CREATE TABLE "change_control_assessments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "finding" TEXT NOT NULL,
    "market" TEXT,
    "answer" TEXT NOT NULL,
    "linkedRecordId" TEXT,
    "reviewer" TEXT,
    "reviewDate" TEXT,
    "rationale" TEXT,
    "evidenceLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_control_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "change_control_assessments_projectId_sortOrder_idx" ON "change_control_assessments"("projectId", "sortOrder");

ALTER TABLE "change_control_assessments" ADD CONSTRAINT "change_control_assessments_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One entry per project that had recorded anything. The finding says where it came from, so nobody
-- mistakes it for a finding somebody described.
INSERT INTO "change_control_assessments"
  ("id", "projectId", "sortOrder", "finding", "answer", "linkedRecordId", "reviewer", "reviewDate", "rationale", "evidenceLink", "updatedAt")
SELECT gen_random_uuid()::text, "id", 0,
       'Post-market review (carried over from the project-level answer)',
       COALESCE("changeControlRequired", ''),
       "changeControlRecordId", "changeControlReviewer", "changeControlReviewDate", "changeControlRationale",
       "changeControlEvidenceLink", now()
FROM "projects"
WHERE "changeControlRequired" IS NOT NULL
   OR "changeControlRecordId" IS NOT NULL
   OR "changeControlReviewer" IS NOT NULL
   OR "changeControlRationale" IS NOT NULL
   OR "changeControlEvidenceLink" IS NOT NULL;

ALTER TABLE "projects"
  DROP COLUMN "changeControlRequired",
  DROP COLUMN "changeControlReviewer",
  DROP COLUMN "changeControlReviewDate",
  DROP COLUMN "changeControlRationale",
  DROP COLUMN "changeControlRecordId",
  DROP COLUMN "changeControlEvidenceLink";
