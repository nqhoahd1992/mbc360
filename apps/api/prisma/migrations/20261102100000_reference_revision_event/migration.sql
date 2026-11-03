-- The kind of act a reference revision records, so a history reads "Withdrawn" or
-- "Technical approval" rather than whatever free text was typed as the reason.
ALTER TABLE "reference_revisions" ADD COLUMN "event" TEXT;

-- Backfill the Claims Library's existing revisions from what they already say.
-- Only claims-library rows are touched; other datasets keep a null event.
UPDATE "reference_revisions" SET "event" = CASE
  WHEN "snapshot"->>'status' = 'Withdrawn' THEN 'Withdrawn'
  WHEN "reason" = 'technical approval recorded' THEN 'Technical approval'
  WHEN "reason" = 'regulatory approval recorded' THEN 'Regulatory approval'
  WHEN "reason" = 'Proposed for Claims Library' THEN 'Proposed'
  WHEN "revision" = 1 THEN 'Created'
  WHEN "reason" LIKE '%both approvals retracted)' THEN 'Edited — approvals retracted'
  ELSE 'Edited'
END
WHERE "dataset" = 'claims-library' AND "event" IS NULL;
