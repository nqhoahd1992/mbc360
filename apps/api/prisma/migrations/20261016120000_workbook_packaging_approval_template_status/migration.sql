-- Packaging BOM "Approval" is the workbook's decision dropdown now, and Template_Index "Status" its own six-value list
-- (project owner, 2026-10-16: data fields 1:1 with the v2 workbook). A value is kept only when the new list has the same
-- word ('Completed' -> 'Complete' on the Template Index); anything else is cleared so a person picks again.
DO $$ DECLARE n int; BEGIN
  UPDATE "packaging_bom_lines" SET "approval" = NULL
  WHERE "approval" IS NOT NULL AND "approval" <> ''
    AND "approval" NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'packaging_bom_lines.approval: % value(s) not in the workbook list were cleared', n; END IF;
END $$;

UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"')
WHERE "registerKey" = 'templateIndex' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'templateIndex' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> ''
    AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'templateIndex.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
