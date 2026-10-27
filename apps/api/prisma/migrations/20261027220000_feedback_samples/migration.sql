-- Panel feedback is logged per sample under evaluation (the workbook's "SAMPLE UNDER EVALUATION" block).
CREATE TABLE "feedback_samples" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sampleOrder" INTEGER NOT NULL,
  "productSku" TEXT,
  "productFamily" TEXT,
  "developmentStage" TEXT,
  "linkedChangeId" TEXT,
  "sampleBatchCode" TEXT,
  "formulaVersion" TEXT,
  "dateIssued" DATE,
  "panelCoordinator" TEXT,
  CONSTRAINT "feedback_samples_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feedback_samples_projectId_sampleOrder_key" ON "feedback_samples"("projectId", "sampleOrder");
ALTER TABLE "feedback_samples" ADD CONSTRAINT "feedback_samples_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_entries" ADD COLUMN "sampleId" TEXT;
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "feedback_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every project that already holds feedback gets one sample for it, named after the project's product; nothing else about that sample
-- was ever recorded, so the rest of its block stays empty for the team to fill in.
INSERT INTO "feedback_samples" ("id", "projectId", "sampleOrder", "productSku")
SELECT gen_random_uuid()::text, p."id", 0, p."productSku"
FROM "projects" AS p
WHERE EXISTS (SELECT 1 FROM "feedback_entries" AS e WHERE e."projectId" = p."id");

UPDATE "feedback_entries" AS e
SET "sampleId" = s."id"
FROM "feedback_samples" AS s
WHERE s."projectId" = e."projectId" AND s."sampleOrder" = 0;
