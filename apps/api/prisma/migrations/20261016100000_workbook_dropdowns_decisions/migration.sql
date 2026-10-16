-- Second step of the workbook-dropdown restore (project owner, 2026-10-16: data fields 1:1 with the v2 workbook).
-- Free-text Conclusion / Decision / Approval cells became the workbook's dropdowns, and a few lists changed. A value is kept
-- only when the new list has the SAME word (Y -> Yes and N/A -> NA are the same answer in the workbook's own spelling);
-- anything else is cleared so a person picks again, and a notice says how many were cleared.

DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('decision', '')
  WHERE "registerKey" = 'ingredientSubstitution' AND "data"->>'decision' IS NOT NULL AND "data"->>'decision' <> '' AND "data"->>'decision' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'ingredientSubstitution.decision: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('conclusion', '')
  WHERE "registerKey" = 'eyeSafetyEvidence' AND "data"->>'conclusion' IS NOT NULL AND "data"->>'conclusion' <> '' AND "data"->>'conclusion' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'eyeSafetyEvidence.conclusion: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('conclusion', '')
  WHERE "registerKey" = 'microPetEvidence' AND "data"->>'conclusion' IS NOT NULL AND "data"->>'conclusion' <> '' AND "data"->>'conclusion' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'microPetEvidence.conclusion: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('releaseDecision', '')
  WHERE "registerKey" = 'stabilityRelease' AND "data"->>'releaseDecision' IS NOT NULL AND "data"->>'releaseDecision' <> '' AND "data"->>'releaseDecision' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'stabilityRelease.releaseDecision: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('conclusion', '')
  WHERE "registerKey" = 'functionalEfficacy' AND "data"->>'conclusion' IS NOT NULL AND "data"->>'conclusion' <> '' AND "data"->>'conclusion' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'functionalEfficacy.conclusion: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('conclusion', '')
  WHERE "registerKey" = 'testReportIndex' AND "data"->>'conclusion' IS NOT NULL AND "data"->>'conclusion' <> '' AND "data"->>'conclusion' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'testReportIndex.conclusion: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('approval', '')
  WHERE "registerKey" = 'packagingSpecsArtwork' AND "data"->>'approval' IS NOT NULL AND "data"->>'approval' <> '' AND "data"->>'approval' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'packagingSpecsArtwork.approval: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('safetyDecision', '')
  WHERE "registerKey" = 'formulationSafetyMatrix' AND "data"->>'safetyDecision' IS NOT NULL AND "data"->>'safetyDecision' <> '' AND "data"->>'safetyDecision' NOT IN ('Not Started', 'Approved', 'Conditional', 'Rejected', 'Needs Review', 'Not Applicable');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'formulationSafetyMatrix.safetyDecision: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('decision', '')
  WHERE "registerKey" = 'productDevelopmentIterations' AND "data"->>'decision' IS NOT NULL AND "data"->>'decision' <> '' AND "data"->>'decision' NOT IN ('Iterate again', 'Adopt this version', 'Reject', 'Hold for testing', 'Escalate to Final Approver');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'productDevelopmentIterations.decision: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'productDevelopmentIterations' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Open', 'In progress', 'Superseded', 'Adopted', 'On hold', 'Closed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'productDevelopmentIterations.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'productDevelopmentFeedback' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Open', 'In progress', 'Actioned', 'Closed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'productDevelopmentFeedback.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{allowed}', CASE "data"->>'allowed' WHEN 'Y' THEN '"Yes"' WHEN 'N' THEN '"No"' END::jsonb)
WHERE "registerKey" = 'publishedInfoApproval' AND "data"->>'allowed' IN ('Y', 'N');
UPDATE "register_rows" SET "data" = jsonb_set("data", '{newLabelReleased}', '"NA"')
WHERE "registerKey" = 'releasedLabelRegister' AND "data"->>'newLabelReleased' = 'N/A';
