-- Third step of the workbook-dropdown restore (project owner, 2026-10-16): the Status lists the v2 workbook gives each sheet,
-- replacing the one generic list. A value is kept when the new list has the SAME word; 'Completed' becomes 'Complete' where
-- the list has it (same meaning, the workbook's spelling); every other old value (On Hold, Backtracked, ...) is cleared so a
-- person picks again — mapping between lists would be interpretation. A notice says how many were cleared.

UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'batchFormulaTrace' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'batchFormulaTrace' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'batchFormulaTrace.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'microPetEvidence' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'microPetEvidence' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'microPetEvidence.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'stabilityRelease' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'stabilityRelease' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'stabilityRelease.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'testReportIndex' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'testReportIndex' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'testReportIndex.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'eyeSafetyEvidence' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'eyeSafetyEvidence' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'eyeSafetyEvidence.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'formulationSafetyProfile' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'formulationSafetyProfile' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'formulationSafetyProfile.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'mechanismClaimsMap' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'mechanismClaimsMap' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'mechanismClaimsMap.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'efficacyAssurance' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'efficacyAssurance' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'efficacyAssurance.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'functionalEfficacy' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'functionalEfficacy' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'functionalEfficacy.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'clinicalHumanEvidence' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'clinicalHumanEvidence' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'clinicalHumanEvidence.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'studyProtocolSetup' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'studyProtocolSetup' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'studyProtocolSetup.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'efficacyStudyPlan' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'efficacyStudyPlan' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'efficacyStudyPlan.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'potencyProcessControl' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'potencyProcessControl' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'potencyProcessControl.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'medicalSummary' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'medicalSummary' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'medicalSummary.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'fragranceSafety' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'fragranceSafety' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'fragranceSafety.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'pifEvidenceExport' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'pifEvidenceExport' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'pifEvidenceExport.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'skuClaimsPifRegister' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'skuClaimsPifRegister' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'skuClaimsPifRegister.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'packagingSpecsArtwork' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'packagingSpecsArtwork' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'packagingSpecsArtwork.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'ingredientSubstitution' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'ingredientSubstitution' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'ingredientSubstitution.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'hcpEfficacyAnswer' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'hcpEfficacyAnswer' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'hcpEfficacyAnswer.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'hcpTestReportPack' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'hcpTestReportPack' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'hcpTestReportPack.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'pifChecklistAsean' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'pifChecklistAsean' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'pifChecklistAsean.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'releasedLabelRegister' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'releasedLabelRegister' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'On Hold', 'Complete');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'releasedLabelRegister.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'On Hold', 'Complete');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'labelPlatformRollout.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'labelShipmentVerification' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'labelShipmentVerification' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'On Hold', 'Complete');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'labelShipmentVerification.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'gmpLinks' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Awaiting Guideline', 'Awaiting Evidence', 'Under Review', 'Approved', 'Approved with Limits', 'Rejected', 'Superseded', 'Closed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'gmpLinks.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'publishedInfoApproval' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Awaiting Guideline', 'Awaiting Evidence', 'Under Review', 'Approved', 'Approved with Limits', 'Rejected', 'Superseded', 'Closed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'publishedInfoApproval.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'aseanPifMap' AND "data"->>'status' = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'aseanPifMap' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Complete', 'Missing', 'N/A', 'Needs Regulatory Review');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'aseanPifMap.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
