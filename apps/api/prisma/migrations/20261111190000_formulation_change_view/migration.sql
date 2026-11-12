-- Round 5 question 11: the Formulation Change Register becomes a VIEW of the Change Control log. Its base data (title, SKU, who asked for the change and
-- when, why, who made it, the communication to the market, whether it is closed) lives on the master change record and is read from there; the register's
-- own row keeps only what the master record has no place for (the action of each department, the re-registration question, the Final Approver's decision
-- and signature). This migration (1) gives the master record the base columns, (2) gives every existing register row a master record, (3) moves the base
-- values across, and (4) removes them from the register row so there is no second copy to go stale.
ALTER TABLE "change_records"
  ADD COLUMN "requestedBy" TEXT,
  ADD COLUMN "dateRequested" DATE,
  ADD COLUMN "reasons" TEXT,
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "changedBy" TEXT,
  ADD COLUMN "communicatedToMarket" TEXT,
  ADD COLUMN "communicationAcknowledgedBy" TEXT;

DO $$
DECLARE
  r RECORD;
  n INT;
  new_id TEXT;
  base_keys TEXT[] := ARRAY['changeTitle','productFamilySku','requestedByNpd','dateRequested','explanation','reasons','changedBy','communicatedToMarket','communicationAcknowledgedBy','closed'];
BEGIN
  SELECT COALESCE(MAX(substring("changeId" FROM '^CHG-([0-9]+)$')::int), 0) INTO n FROM "change_records" WHERE "changeId" ~ '^CHG-[0-9]+$';

  -- (2)+(3) a register row with no master record gets one, built from the row's own base values. A row recorded as closed becomes Completed WITHOUT a final
  -- disposition, which keeps it blocking until someone records how it closed (the same stance as any older completed change); an open one becomes Under Review.
  FOR r IN
    SELECT id, "projectId", data FROM "register_rows"
    WHERE "registerKey" = 'formulationChangeRegister' AND COALESCE(data->>'masterChangeId', '') = ''
    ORDER BY "projectId", "rowOrder"
  LOOP
    n := n + 1;
    new_id := 'CHG-' || lpad(n::text, 3, '0');
    INSERT INTO "change_records" (
      "id", "changeId", "projectId", "trigger", "productSku", "affectedArea", "riskLevel", "impactAreas", "markets", "communicationRequired", "status", "owner",
      "aliasIds", "requestedBy", "dateRequested", "reasons", "explanation", "changedBy", "communicatedToMarket", "communicationAcknowledgedBy", "notes", "updatedAt"
    ) VALUES (
      'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
      new_id,
      r."projectId",
      COALESCE(NULLIF(r.data->>'changeTitle', ''), 'Formulation change ' || COALESCE(r.data->>'changeId', '')),
      COALESCE(NULLIF(r.data->>'productFamilySku', ''), '(not recorded)'),
      'Formula / ingredient',
      'High',
      ARRAY['Formula']::TEXT[],
      ARRAY[]::TEXT[],
      false,
      CASE WHEN r.data->>'closed' = 'Yes' THEN 'Completed' ELSE 'Under Review' END,
      COALESCE(NULLIF(r.data->>'requestedByNpd', ''), 'Unassigned'),
      CASE WHEN COALESCE(r.data->>'changeId', '') = '' THEN ARRAY[]::TEXT[] ELSE ARRAY[r.data->>'changeId'] END,
      NULLIF(r.data->>'requestedByNpd', ''),
      CASE WHEN r.data->>'dateRequested' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (r.data->>'dateRequested')::date END,
      NULLIF(r.data->>'reasons', ''),
      NULLIF(r.data->>'explanation', ''),
      NULLIF(r.data->>'changedBy', ''),
      CASE WHEN r.data->>'communicatedToMarket' IN ('Yes','No','NA','In progress') THEN r.data->>'communicatedToMarket' END,
      NULLIF(r.data->>'communicationAcknowledgedBy', ''),
      'Imported from the Formulation Change Register row ' || COALESCE(r.data->>'changeId', '') || '.',
      now()
    );
    -- (4) the register row keeps its overlay and names its master; the base values are no longer stored on it
    UPDATE "register_rows" SET data = (data - base_keys) || jsonb_build_object('masterChangeId', new_id) WHERE id = r.id;
  END LOOP;

  -- (3) a row that already named its master (raised by a Major version) carried its base values on the row while the master record had none: copy them across
  -- where the master has no value yet, then drop them from the row.
  FOR r IN
    SELECT id, "projectId", data FROM "register_rows"
    WHERE "registerKey" = 'formulationChangeRegister' AND COALESCE(data->>'masterChangeId', '') <> ''
  LOOP
    UPDATE "change_records" c SET
      "requestedBy" = COALESCE(c."requestedBy", NULLIF(r.data->>'requestedByNpd', '')),
      "dateRequested" = COALESCE(c."dateRequested", CASE WHEN r.data->>'dateRequested' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (r.data->>'dateRequested')::date END),
      "reasons" = COALESCE(c."reasons", NULLIF(r.data->>'reasons', '')),
      "explanation" = COALESCE(c."explanation", NULLIF(r.data->>'explanation', '')),
      "changedBy" = COALESCE(c."changedBy", NULLIF(r.data->>'changedBy', '')),
      "communicatedToMarket" = COALESCE(c."communicatedToMarket", CASE WHEN r.data->>'communicatedToMarket' IN ('Yes','No','NA','In progress') THEN r.data->>'communicatedToMarket' END),
      "communicationAcknowledgedBy" = COALESCE(c."communicationAcknowledgedBy", NULLIF(r.data->>'communicationAcknowledgedBy', ''))
    WHERE c."changeId" = r.data->>'masterChangeId';
    UPDATE "register_rows" SET data = data - base_keys WHERE id = r.id;
  END LOOP;
END $$;
