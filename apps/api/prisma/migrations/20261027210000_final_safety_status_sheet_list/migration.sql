-- Final Safety Sign-off takes the Status list its workbook sheet offers (Not Started, In Progress, Needs Review, Complete, Not Applicable,
-- Blocked). "N/A" becomes "Not Applicable" (the one row that may carry it keeps the Gate 7 rule), Completed -> Complete, and the two words
-- the sheet does not have map to the nearest state (On Hold -> Blocked, Backtracked -> Needs Review), the old word kept in Notes.
UPDATE "register_rows"
SET "data" = jsonb_set(
  jsonb_set("data", '{status}', to_jsonb(CASE "data"->>'status' WHEN 'On Hold' THEN 'Blocked' ELSE 'Needs Review' END)),
  '{notes}',
  to_jsonb(CASE WHEN coalesce("data"->>'notes', '') = '' THEN '' ELSE ("data"->>'notes') || E'
' END || 'Status (previously): ' || ("data"->>'status'))
)
WHERE "registerKey" = 'formulationSafetyFinalSignOff' AND "data"->>'status' IN ('On Hold', 'Backtracked');

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{status}', to_jsonb(CASE "data"->>'status' WHEN 'N/A' THEN 'Not Applicable' ELSE 'Complete' END))
WHERE "registerKey" = 'formulationSafetyFinalSignOff' AND "data"->>'status' IN ('N/A', 'Completed');
