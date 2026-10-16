-- Change Control "Affected area" is the workbook's nine-value dropdown now (project owner, 2026-10-16). Only an identical word
-- carries over ("Other"); the old ten-value list has no word in common with the rest, so any other value is cleared and the
-- record shows a blank area until a person picks one. A notice says how many were cleared.
DO $$ DECLARE n int; BEGIN
  UPDATE "change_records" SET "affectedArea" = ''
  WHERE "affectedArea" <> '' AND "affectedArea" NOT IN (
    'Artwork / label', 'Formula / ingredient', 'Formula version / pH / process', 'Packaging / component',
    'Supplier / raw material', 'Claims / marketing copy', 'Market / language / regulatory',
    'Manufacturing / GMP / process', 'Other');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'change_records.affectedArea: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
