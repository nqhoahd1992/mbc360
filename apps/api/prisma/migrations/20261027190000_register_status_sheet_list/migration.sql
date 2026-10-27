-- Five registers take the Status list their workbook sheet's data validation offers (Not Started, In Progress, Needs Review, Complete,
-- Not Applicable, Blocked) instead of the generic work-status list. Existing values follow: Completed -> Complete; On Hold -> Blocked
-- and Backtracked -> Needs Review (the nearest states), the old word kept in the row's Notes so nothing a person chose is lost.
UPDATE "register_rows"
SET "data" = jsonb_set(
  jsonb_set("data", '{status}', to_jsonb(CASE "data"->>'status' WHEN 'On Hold' THEN 'Blocked' ELSE 'Needs Review' END)),
  '{notes}',
  to_jsonb(CASE WHEN coalesce("data"->>'notes', '') = '' THEN '' ELSE ("data"->>'notes') || E'\n' END || 'Status (previously): ' || ("data"->>'status'))
)
WHERE "registerKey" IN ('supplierRmEvidence', 'fragranceAllergenLog', 'twinkle5ClaimsMap', 'studyParticipantLog', 'pifEvidenceClosure')
  AND "data"->>'status' IN ('On Hold', 'Backtracked');

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{status}', to_jsonb('Complete'::text))
WHERE "registerKey" IN ('supplierRmEvidence', 'fragranceAllergenLog', 'twinkle5ClaimsMap', 'studyParticipantLog', 'pifEvidenceClosure')
  AND "data"->>'status' = 'Completed';
