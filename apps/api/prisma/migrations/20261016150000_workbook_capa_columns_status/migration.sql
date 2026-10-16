-- Post-Market / CAPA records follow the v2 workbook's sheet (project owner, 2026-10-16): the four columns the first
-- transcription dropped (Product/SKU, Investigation link, CAPA link, PIF/PMF impact), and the sheet's own Status list.
-- 'Completed' becomes 'Complete'; 'Not Started' and 'In Progress' are the same words; any other old value (On Hold,
-- Backtracked) has no word in the new list and is cleared so a person picks again.
ALTER TABLE "capa_records" ADD COLUMN "productSku" TEXT, ADD COLUMN "investigationLink" TEXT, ADD COLUMN "capaLink" TEXT, ADD COLUMN "pifPmfImpact" TEXT;

UPDATE "capa_records" SET "status" = 'Complete' WHERE "status" = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "capa_records" SET "status" = ''
  WHERE "status" NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'capa_records.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
