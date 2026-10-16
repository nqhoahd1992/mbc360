-- Product Development Report, "Product / Project Identification": the workbook has ten fields, the first transcription kept three.
-- Fixed-register rows are materialised once at project creation, so every existing project gets the seven missing rows and the
-- ten rows are put in the workbook's order. Existing rows keep their data; only their position changes.

-- 1. Park the existing rows out of the way (the unique key is checked per row).
UPDATE "register_rows" SET "rowOrder" = "rowOrder" + 1000 WHERE "registerKey" = 'productDevelopmentProfile';

-- 2. Put the three existing fields in their workbook positions.
UPDATE "register_rows" AS r
SET "rowOrder" = v.ord
FROM (VALUES
  ('NPD lead (formulator)', 2),
  ('Competitor benchmarks', 4),
  ('Overall status', 9)
) AS v(fld, ord)
WHERE r."registerKey" = 'productDevelopmentProfile' AND r."data"->>'field' = v.fld;

-- 3. Add the seven missing rows to every project that has this register.
INSERT INTO "register_rows" ("id", "projectId", "registerKey", "rowOrder", "data", "updatedAt")
SELECT gen_random_uuid()::text, p."projectId", 'productDevelopmentProfile', v.ord, jsonb_build_object('field', v.fld), now()
FROM (SELECT DISTINCT "projectId" FROM "register_rows" WHERE "registerKey" = 'productDevelopmentProfile') AS p
CROSS JOIN (VALUES
  ('Product / SKU', 0),
  ('Project ID', 1),
  ('Project owner', 3),
  ('Product Family', 5),
  ('Formula version (current)', 6),
  ('Target markets', 7),
  ('Report date', 8)
) AS v(fld, ord);
