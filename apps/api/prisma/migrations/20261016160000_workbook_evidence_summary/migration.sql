-- Product Evidence Summary: the sixteen areas of the v2 workbook, with its Secondary inputs and PIF / PMF section columns, a
-- "Required?" that is the workbook's own dropdown (Y / N / N/A / Conditional) and the sheet's own six-value Status list
-- (project owner, 2026-10-16: data fields 1:1 with the workbook).
--
-- Three areas only changed spelling ("Packaging specs & artwork", "Micro / PET evidence", "Stability & release"), so they are
-- renamed and keep what was entered. Areas the workbook does not have are removed, and areas it has that a project lacks are
-- added; a notice says how many removed rows held anything a person had entered. 'Completed' becomes 'Complete'; any other
-- old status with no word in the new list is cleared.
ALTER TABLE "evidence_items" ADD COLUMN "secondaryInputs" TEXT, ADD COLUMN "pifPmfSection" TEXT;

UPDATE "evidence_items" SET "area" = 'Packaging specs and artwork' WHERE "area" = 'Packaging specs & artwork';
UPDATE "evidence_items" SET "area" = 'Micro / PET' WHERE "area" = 'Micro / PET evidence';
UPDATE "evidence_items" SET "area" = 'Stability / release' WHERE "area" = 'Stability & release';

CREATE TEMP TABLE _areas (area text, required text, trigger text, template text, secondary text, owner text, gate text, pif text);
INSERT INTO _areas VALUES
  ('Project / SKU identity', 'Y', 'Project opened or SKU added', 'PHASE 1; GATE 1-3 (MARKETING)', 'Stage_Map / project folder', 'Project owner', '01-03', 'Product summary'),
  ('Formula BOM / costing', 'Y', 'Formula route or cost decision', 'Formula_BOM; Costing_Calc', 'Packaging_BOM', 'R&I / Finance', '05', 'Formula / composition'),
  ('Raw material supplier evidence', 'Y', 'Any raw material used', 'Supplier_RM_Evidence', 'Formula_BOM', 'Procurement / Quality', '04/05', 'Raw material docs'),
  ('Full formulation safety', 'Y', 'Formula version locked', 'Formulation_Safety', 'Prohibited_Ingredients; PB_Caution_Limits; Fragrance_Safety', 'Safety / Regulatory', '07/10', 'Safety assessment'),
  ('Fragrance / allergen safety', 'Conditional', 'Fragrance, essential oil or allergen present', 'Fragrance_Safety', 'PB_Caution_Limits', 'R&I / Regulatory', '07/10', 'Label / IFRA'),
  ('Packaging specs and artwork', 'Y', 'Pack selected or market artwork needed', 'Packaging_Specs_Artwork', 'Packaging_BOM; Artwork_Change_Control', 'Packaging / Regulatory', '06/10/11', 'Artwork / specs'),
  ('Micro / PET', 'Conditional', 'Aqueous/preserved product or micro spec required', 'Micro_PET_Evidence', 'Test_Report_Index', 'Quality', '08', 'Micro / PET'),
  ('Stability / release', 'Y', 'Formula/pack ready for testing or launch', 'Stability_Release', 'Test_Report_Index; GMP_Links', 'Quality', '09/11', 'Stability / release'),
  ('Eye safety', 'Conditional', 'Eye-area, baby-contact or irritation-safe claim', 'Eye_Safety_Evidence', 'Formulation_Safety', 'Safety / Quality', '07/08', 'Safety / report'),
  ('Functional efficacy', 'Conditional', 'Functional or performance claim', 'Functional_Efficacy', 'Mechanism_Claims_Map; Efficacy_Assurance', 'R&I / Quality', '08/10', 'Claim support'),
  ('Clinical / human evidence', 'Conditional', 'Human claim or HCP-facing proof required', 'Clinical_Human_Evidence', 'Study_Protocol; Efficacy_Study_Plan', 'Clinical / R&I', '08/10', 'Human evidence'),
  ('PIF / dossier', 'Y', 'Market launch or external product file', 'PIF_Checklist_ASEAN', 'ASEAN_PIF_Map; PIF_Evidence_Export', 'Regulatory', '10/11', 'PIF'),
  ('Public information approval', 'Y', 'Any public/HCP/distributor material', 'Published_Info_Approval', 'SKU_Claims_PIF_Register; Medical_Summary', 'Content owner / Regulatory', '10/11', 'Approved wording'),
  ('GMP / batch trace', 'Y', 'Manufacture, validation or launch release', 'GMP_Links; Batch_Formula_Trace', 'Stability_Release', 'Quality / Manufacturing', '11', 'Batch / GMP'),
  ('Change control', 'Conditional', 'Formula, artwork, claim, supplier, market or process changes', 'Change_Control_Comm', 'Artwork_Change_Control; Formula_Change_Control', 'Project owner / QA', 'ALL', 'Change file'),
  ('Post-market / CAPA', 'Y', 'After launch or complaint/adverse event', 'PostMarket_CAPA', 'GMP_Links; PIF_Evidence_Closure', 'Quality / PV-PMS', '12', 'Post-market');

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM "evidence_items" e
   WHERE e."area" NOT IN (SELECT area FROM _areas)
     AND (e."status" <> 'Not Started' OR COALESCE(e."evidenceLink", '') <> '' OR COALESCE(e."notes", '') <> '');
  IF n > 0 THEN RAISE NOTICE 'evidence_items: % removed row(s) held entered data (status, link or notes)', n; END IF;
END $$;
DELETE FROM "evidence_items" WHERE "area" NOT IN (SELECT area FROM _areas);

UPDATE "evidence_items" e SET "trigger" = a.trigger, "primaryTemplate" = a.template, "secondaryInputs" = a.secondary,
       "owner" = a.owner, "gate" = a.gate, "pifPmfSection" = a.pif
FROM _areas a WHERE e."area" = a.area;

INSERT INTO "evidence_items" ("id", "projectId", "area", "required", "trigger", "primaryTemplate", "secondaryInputs", "owner", "status", "gate", "pifPmfSection")
SELECT md5(random()::text || clock_timestamp()::text || p."id" || a.area), p."id", a.area, a.required, a.trigger, a.template, a.secondary, a.owner, 'Not Started', a.gate, a.pif
FROM "projects" p CROSS JOIN _areas a
WHERE NOT EXISTS (SELECT 1 FROM "evidence_items" e WHERE e."projectId" = p."id" AND e."area" = a.area);

UPDATE "evidence_items" SET "status" = 'Complete' WHERE "status" = 'Completed';
DO $$ DECLARE n int; BEGIN
  UPDATE "evidence_items" SET "status" = ''
  WHERE "status" NOT IN ('Not Started', 'In Progress', 'Needs Review', 'Complete', 'Not Applicable', 'Blocked');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RAISE NOTICE 'evidence_items.status: % value(s) not in the workbook list were cleared', n; END IF;
END $$;
UPDATE "evidence_items" SET "required" = 'Y' WHERE "required" NOT IN ('Y', 'N', 'N/A', 'Conditional');
DROP TABLE _areas;
