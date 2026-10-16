-- Bring the change-control sheets and the dropdowns that had become tick boxes or free text back to the v2 workbook
-- (project owner, 2026-10-16: data fields 1:1 with the workbook). Generated from the same config new projects read.
--
-- 1) Fixed registers (Formula Change Control, Artwork Change Control, Change Templates): the columns the first
--    transcription dropped are written onto existing rows, matched on each row's own first column, only for read-only
--    cells; Artwork Change Control also gains the fifth trigger row the workbook has.
-- 2) A tick box that is now a dropdown carries over as the value the workbook offers: true -> Yes, false -> No.
-- 3) A select whose list changed keeps a value only when the new list has the SAME word; any other value is cleared so a
--    person picks again (mapping between the two lists would be interpretation). A notice reports how many were cleared.

-- formulaChangeControl
UPDATE "register_rows" AS r
SET "data" = r."data" || jsonb_build_object('examples', v.c1, 'impactAreas', v.c2, 'mandatoryActions', v.c3, 'personInCharge', v.c4, 'technicalSignOff', v.c5, 'regQaSignOff', v.c6, 'salesMarketingRequired', v.c7, 'templateForm', v.c8, 'evidenceRequired', v.c9, 'closureCriteria', v.c10)
FROM (VALUES
  ('Ingredient added or removed', 'New active, preservative, fragrance or problematic ingredient removed', 'Safety, efficacy, claims, label INCI, PIF, stability, cost', 'Update Formula_BOM; screen safety lists; assess claim and label impact', 'R&I / Formulation', 'R&I', 'Regulatory + Quality', 'Yes', 'Formula Change Comparison', 'Old/new formula, rationale, safety evidence', 'Updated version controlled'),
  ('Ingredient percentage or active level changed', 'Active increase/decrease, preservative or humectant balance', 'Efficacy, irritation, preservation, stability, cost', 'Re-check claim map, potency controls and evidence need', 'R&I', 'R&I / Scientific Review', 'Quality + Regulatory where impacted', 'Yes if claim/label/customer-facing', 'Formula Change Comparison', 'Batch trial, pH, stability/micro plan', 'Evidence updated before release'),
  ('pH range or process changed', 'Heat/cool order, addition temperature, homogenisation, hold time', 'Potency, microbiology, stability, repeatability', 'Update process instructions and critical control points', 'R&I + Manufacturing', 'R&I + Manufacturing', 'Quality', 'If customer-facing', 'Process Change Control', 'Process redline, batch record, trial result', 'Manufacturing instructions updated'),
  ('Supplier/raw material/manufacturer change', 'New supplier, grade, site or manufacturer', 'Contaminants, allergens, potency, claims, cost, availability', 'Re-qualify material and compare specs', 'Procurement + R&I', 'R&I', 'Quality + Regulatory', 'If story/claim/cost/supply impacted', 'Supplier/RM Change Form', 'SDS, CoA, TDS, allergen, spec comparison', 'Supplier approved and evidence filed'),
  ('Fragrance/allergen/sensory change', 'Perfume changed/removed, essential oil level, odour/colour/texture', 'Allergen declaration, PBW caution, consumer perception, complaints', 'Update allergen and caution checks; update artwork if needed', 'R&I + Regulatory', 'R&I', 'Regulatory + Quality', 'Yes', 'Sensory/Fragrance Change Form', 'IFRA/allergen data, label impact', 'Sales/Marketing notified')
) AS v(m, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10)
WHERE r."registerKey" = 'formulaChangeControl' AND r."data"->>'trigger' = v.m;

-- changeTemplates
UPDATE "register_rows" AS r
SET "data" = r."data" || jsonb_build_object('useWhen', v.c1, 'requiredFields', v.c2, 'approvalRecipients', v.c3, 'savedEvidence', v.c4, 'closureRule', v.c5, 'linkedSheets', v.c6)
FROM (VALUES
  ('Change Request Form', 'Any artwork, formula, label, claim, supplier, process or market change', 'Change ID; trigger; product/SKU; old version; new version; reason; risk level; owner; due date; affected areas', 'Project owner plus required technical/QA/regulatory approvers', 'Completed request, log row, attachments', 'Actions, approvals, communications and obsolete version control complete', 'Change_Control_Comm'),
  ('Artwork Change Sign-off Form', 'Artwork/label/carton/proof/pack copy change', 'Old proof; new proof; redline; affected markets/SKUs; label/PIF/claim impact', 'Artwork owner; Regulatory; QA; Marketing/Sales where customer-facing', 'Redline, final PDF, approval trail, printer release email', 'Only approved final artwork may be printed/released', 'Artwork_Change_Control'),
  ('Formula Change Comparison Summary', 'Formula, ingredient, supplier, pH, process, active, preservative or fragrance change', 'Old vs new formula; INCI impact; reason; safety/efficacy/regulatory/label/stability/cost impact', 'R&I, Quality, Regulatory, Scientific Review, Manufacturing, Sales/Marketing acknowledgement', 'Formula comparison, updated Formula_BOM, evidence and sign-offs', 'Summary sent to Sales/Marketing when commercial/customer-facing impact exists', 'Formula_Change_Control'),
  ('Sales & Marketing Change Notification', 'Formula, label, artwork, claims, sensory, benefit story or market wording changes', 'What changed; why; what remains unchanged; affected SKUs/markets; customer talking points; do/don''t say', 'Project owner sends; Sales/Marketing acknowledges; Regulatory approves wording where claim-facing', 'Email/Teams/deck link and acknowledgement record', 'No closure until acknowledgement saved or N/A rationale approved', 'Change_Control_Comm; Medical_Summary'),
  ('Closure Checklist', 'Before change is marked closed', 'Actions done; sign-offs complete; comms complete; final version linked; obsolete versions archived; linked sheets updated', 'Change owner; QA/Document Control; Project owner', 'Closed log row and closure note', 'Closed date/closed by entered in Change_Control_Comm', 'Change_Control_Comm')
) AS v(m, c1, c2, c3, c4, c5, c6)
WHERE r."registerKey" = 'changeTemplates' AND r."data"->>'templateForm' = v.m;

-- artworkChangeControl
UPDATE "register_rows" AS r
SET "data" = r."data" || jsonb_build_object('examples', v.c1, 'immediateAction', v.c2, 'personInCharge', v.c3, 'requiredSignOffs', v.c4, 'evidenceToSave', v.c5, 'communicationRequired', v.c6, 'templateForm', v.c7, 'closureCriteria', v.c8, 'gateSheetLink', v.c9)
FROM (VALUES
  ('Artwork error discovered', 'Wrong wording, typo, ingredient list, warning, barcode or country text', 'Raise Change_Control_Comm; freeze current file; create redline', 'Artwork / Packaging owner', 'Regulatory + Quality + Marketing/Sales where label-facing', 'Old proof, redline, corrected proof, approval trail', 'Notify impacted functions and distributor if affected', 'Artwork Change Sign-off Form', 'Final PDF released and obsolete file archived', '06/10/11'),
  ('Formula change affects label', 'INCI order, ingredient addition/removal, active level, allergen/fragrance', 'Link Formula_Change_Control and hold label release until formula locked', 'R&I + Artwork owner', 'R&I + Regulatory + QA', 'Formula comparison, label impact assessment', 'Sales/Marketing approved explanation', 'Formula Change Comparison', 'Label/PIF/claim materials updated', '05/06/10'),
  ('Regulatory or market update', 'New country label requirement, warning, language or symbol', 'Identify affected SKUs/materials and route to review', 'Regulatory owner', 'Regulatory + QA + market owner', 'Regulatory note, translation, final proof', 'Notify market/distributor/sales', 'Regulatory Artwork Change Form', 'Market-specific artwork and dossier updated', '10/11'),
  ('Marketing/claim copy change', 'New or revised claim/HCP/website/leaflet wording', 'Map claim to evidence; no live use until approved', 'Marketing/Claims owner', 'Regulatory + Scientific Review', 'Claim substantiation and approved copy', 'Notify Sales/Marketing and training owner', 'Claims Change Control Form', 'All collateral uses approved wording', '03/10'),
  ('Released label / market image mismatch', 'Live product image or shipped label does not match current released label (e.g. website/marketplace out-of-date)', 'Log in Released_Label_Ctrl (Block A); freeze wrong image; raise Change_Control_Comm', 'Packaging + Digital / Platforms', 'Regulatory + Quality + Marketing/Sales', 'Current vs new artwork files, platform screenshots, corrected proof, approval trail', 'Notify Sales/Marketing, distributor and affected markets', 'Released Label Control', 'All platforms and shipments carry the current released label; obsolete image archived', '06/10/11 -> Released_Label_Ctrl')
) AS v(m, c1, c2, c3, c4, c5, c6, c7, c8, c9)
WHERE r."registerKey" = 'artworkChangeControl' AND r."data"->>'trigger' = v.m;

-- artworkChangeControl: the fifth trigger row, for projects that do not have it yet
INSERT INTO "register_rows" ("id", "projectId", "registerKey", "rowOrder", "data", "updatedAt", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || p."projectId"), p."projectId", 'artworkChangeControl',
       p.next_order, '{"trigger":"Released label / market image mismatch","examples":"Live product image or shipped label does not match current released label (e.g. website/marketplace out-of-date)","immediateAction":"Log in Released_Label_Ctrl (Block A); freeze wrong image; raise Change_Control_Comm","personInCharge":"Packaging + Digital / Platforms","requiredSignOffs":"Regulatory + Quality + Marketing/Sales","evidenceToSave":"Current vs new artwork files, platform screenshots, corrected proof, approval trail","communicationRequired":"Notify Sales/Marketing, distributor and affected markets","templateForm":"Released Label Control","closureCriteria":"All platforms and shipments carry the current released label; obsolete image archived","gateSheetLink":"06/10/11 -> Released_Label_Ctrl","status":"Not Started"}'::jsonb, now(), now()
FROM (
  SELECT "projectId", max("rowOrder") + 1 AS next_order
  FROM "register_rows" WHERE "registerKey" = 'artworkChangeControl'
  GROUP BY "projectId"
  HAVING bool_and("data"->>'trigger' IS DISTINCT FROM 'Released label / market image mismatch')
) p;

UPDATE "register_rows" SET "data" = jsonb_set("data", '{vnRegistrationRequired}', CASE WHEN ("data"->'vnRegistrationRequired') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'formulationChangeRegister' AND jsonb_typeof("data"->'vnRegistrationRequired') = 'boolean';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{marketCommRequired}', CASE WHEN ("data"->'marketCommRequired') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'formulationChangeRegister' AND jsonb_typeof("data"->'marketCommRequired') = 'boolean';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{communicatedToMarket}', CASE WHEN ("data"->'communicatedToMarket') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'formulationChangeRegister' AND jsonb_typeof("data"->'communicatedToMarket') = 'boolean';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{closed}', CASE WHEN ("data"->'closed') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'formulationChangeRegister' AND jsonb_typeof("data"->'closed') = 'boolean';

UPDATE "register_rows" SET "data" = jsonb_set("data", '{currentMarketVersion}', CASE WHEN ("data"->'currentMarketVersion') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'productFamilyRegister' AND jsonb_typeof("data"->'currentMarketVersion') = 'boolean';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{marketCommNeeded}', CASE WHEN ("data"->'marketCommNeeded') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'productFamilyRegister' AND jsonb_typeof("data"->'marketCommNeeded') = 'boolean';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{communicatedToMarket}', CASE WHEN ("data"->'communicatedToMarket') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'productFamilyRegister' AND jsonb_typeof("data"->'communicatedToMarket') = 'boolean';

UPDATE "register_rows" SET "data" = jsonb_set("data", '{claimsApproved}', CASE WHEN ("data"->'claimsApproved') = 'true'::jsonb THEN '"Yes"' ELSE '"No"' END::jsonb)
WHERE "registerKey" = 'campaignsSocialMedia' AND jsonb_typeof("data"->'claimsApproved') = 'boolean';

-- Final Approver decision: a standing signature reads Approved (with its date); anything else starts at Pending.
UPDATE "register_rows" SET "data" = ("data" - 'approvedByNp') || jsonb_build_object(
  'approvedByNp', CASE WHEN "data"->>'npSignOff__userId' IS NOT NULL THEN 'Approved' ELSE 'Pending Final Approver decision' END)
WHERE "registerKey" = 'formulationChangeRegister';
UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('npApprovalDate', left("data"->>'npSignOff__at', 10))
WHERE "registerKey" = 'formulationChangeRegister' AND "data"->>'npSignOff__userId' IS NOT NULL AND "data"->>'npSignOff__at' IS NOT NULL;

-- campaignsSocialMedia.status
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'campaignsSocialMedia' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Planned', 'Live', 'Paused', 'Completed', 'Cancelled');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'campaignsSocialMedia.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'formulaChangeControl' AND "data"->>'status' = 'Completed';
-- formulaChangeControl.status
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'formulaChangeControl' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'formulaChangeControl.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'artworkChangeControl' AND "data"->>'status' = 'Completed';
-- artworkChangeControl.status
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'artworkChangeControl' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'artworkChangeControl.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "register_rows" SET "data" = jsonb_set("data", '{status}', '"Complete"') WHERE "registerKey" = 'changeTemplates' AND "data"->>'status' = 'Completed';
-- changeTemplates.status
DO $$ DECLARE n int; BEGIN
  UPDATE "register_rows" SET "data" = "data" || jsonb_build_object('status', '')
  WHERE "registerKey" = 'changeTemplates' AND "data"->>'status' IS NOT NULL AND "data"->>'status' <> '' AND "data"->>'status' NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'changeTemplates.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
