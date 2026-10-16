-- The phase sheets' requirement tables take the v2 workbook's own Status lists (project owner, 2026-10-16: data fields
-- 1:1 with the workbook; the review team's own tables — project requirements and the infant pathway — keep theirs).
--   Stage-status tables:  Not Started · In Progress · Complete · Gap · Hold · N/A
--   Compartment tables:   Not Started · In Progress · On Hold · Complete   (plus their own Y/N/NA column)
-- Old words with the same meaning carry over ('Completed' -> 'Complete'; 'On Hold' -> 'Hold' on the stage list). 'Backtracked'
-- has no word in either list, so that row goes back to 'Not Started'; a notice says how many rows were reset.
ALTER TABLE "requirement_items" ADD COLUMN "ynna" TEXT;

UPDATE "requirement_items" SET "status" = 'Complete' WHERE "status" = 'Completed'
  AND "sectionKey" IN ('formulationDesign','efficacyProcess','skincareForTwo','humanStudy','stabilityRelease','dossierEvidence','changeControlClosure',
                       'pregnancySafety','breastfeedingSafety','infantSafety','swimmerSafety');
UPDATE "requirement_items" SET "status" = 'Hold' WHERE "status" = 'On Hold'
  AND "sectionKey" IN ('formulationDesign','efficacyProcess','skincareForTwo','humanStudy','stabilityRelease','dossierEvidence','changeControlClosure');
DO $$ DECLARE n int; BEGIN
  UPDATE "requirement_items" SET "status" = 'Not Started' WHERE "status" = 'Backtracked'
    AND "sectionKey" IN ('formulationDesign','efficacyProcess','skincareForTwo','humanStudy','stabilityRelease','dossierEvidence','changeControlClosure',
                         'pregnancySafety','breastfeedingSafety','infantSafety','swimmerSafety');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'requirement_items: % row(s) set to Backtracked were reset to Not Started', n; END IF;
END $$;
