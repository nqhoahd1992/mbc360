-- Supplier & Raw Material Evidence: "Regulatory status" is a dropdown in the workbook (the sheet's data validation gives it the same
-- six-state list as Status). A value typed before this that is not one of those states is kept, appended to the row's Notes, and the
-- cell is emptied, so nothing a person wrote is lost.
UPDATE "register_rows"
SET "data" = jsonb_set(
  "data" - 'regulatoryStatus',
  '{notes}',
  to_jsonb(
    CASE WHEN coalesce("data"->>'notes', '') = '' THEN '' ELSE ("data"->>'notes') || E'\n' END
    || 'Regulatory status (entered as text): ' || ("data"->>'regulatoryStatus')
  )
)
WHERE "registerKey" = 'supplierRmEvidence'
  AND coalesce("data"->>'regulatoryStatus', '') <> ''
  AND "data"->>'regulatoryStatus' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
