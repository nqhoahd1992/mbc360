-- Round 5 question 7: the scale-up / pilot assessment is a LIST, one entry per affected area, instead of one answer for the project.
CREATE TABLE "scale_up_assessments" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "area" TEXT NOT NULL,
  "description" TEXT,
  "before" TEXT,
  "after" TEXT,
  "answer" TEXT NOT NULL,
  "rationale" TEXT,
  "verification" TEXT,
  "evidenceLink" TEXT,
  "assessor" TEXT,
  "assessedDate" TEXT,
  "timing" TEXT,
  "linkedChangeId" TEXT,
  "linkedIteration" TEXT,
  "waiverJustification" TEXT,
  "waiverEvidenceLink" TEXT,
  "waiverQualityBy" TEXT,
  "waiverManufacturingBy" TEXT,
  "waiverRiBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scale_up_assessments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scale_up_assessments_projectId_sortOrder_idx" ON "scale_up_assessments"("projectId", "sortOrder");
ALTER TABLE "scale_up_assessments" ADD CONSTRAINT "scale_up_assessments_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The single answer a project already gave becomes one entry, so nothing recorded is lost. The old answer named no area, so it is filed
-- under the open-ended area (which asks for a description) and its own description is carried across; a project that had given none stays
-- empty, which is what "not yet assessed" now means.
INSERT INTO "scale_up_assessments" (
  "id", "projectId", "sortOrder", "area", "description", "answer", "rationale", "verification", "evidenceLink", "assessor", "assessedDate", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || "id"), "id", 0,
  'Any change identified by Manufacturing, Quality or R&I as potentially affecting product performance',
  COALESCE(NULLIF("scaleUpRiskDescription", ''), 'Carried over from the single scale-up answer given before assessments were listed per area'),
  COALESCE("scaleUpRiskIdentified", ''), "scaleUpRiskRationale", "scaleUpRiskActivity", "scaleUpRiskEvidenceLink", "scaleUpRiskAssessor",
  "scaleUpRiskAssessmentDate", now()
FROM "projects"
WHERE "scaleUpRiskIdentified" IS NOT NULL AND "scaleUpRiskIdentified" <> '';

ALTER TABLE "projects"
  DROP COLUMN "scaleUpRiskIdentified",
  DROP COLUMN "scaleUpRiskDescription",
  DROP COLUMN "scaleUpRiskAssessor",
  DROP COLUMN "scaleUpRiskAssessmentDate",
  DROP COLUMN "scaleUpRiskRationale",
  DROP COLUMN "scaleUpRiskActivity",
  DROP COLUMN "scaleUpRiskEvidenceLink";
