-- Round 5 question 20: a market's regulatory dossier is several components, each with its own ID, version and decision. Register rows are
-- JSONB, so nothing changes in the schema; the rows that already exist (one per market) get the generated component ID the new rows will
-- carry, numbered per project in their existing order. Nothing else is invented: a row has no component, version or external
-- notification status until a person records them, which is the honest state (the rows still hold what was recorded). The market's regulatory
-- status on the tracking card is derived from these rows from now on, so a project whose status was typed there reads Not Started until its
-- dossier rows exist.
UPDATE register_rows rr
SET data = rr.data || jsonb_build_object('componentId', 'RC-' || lpad(s.n::text, 3, '0'))
FROM (
  SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "rowOrder") AS n
  FROM register_rows
  WHERE "registerKey" = 'regulatoryChecklistStatus'
) s
WHERE rr.id = s.id AND COALESCE(rr.data ->> 'componentId', '') = '';
