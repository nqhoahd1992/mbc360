-- Comparative Testing Protocol and Current Solutions & Standard of Care: the workbook prints six fixed rows in each
-- (sheet "2. Competitor Landscape", sections 3 and 4), so both registers are now mode 'fixed' with their first column read-only.
-- Fixed-register rows are materialised once at project creation, so every existing project gets the six rows of each.
-- Rows a person already typed keep their data; one whose first-column text equals a workbook label takes that label's
-- position, and any other stays after the six (its data is never discarded).

-- 1. Park the existing rows out of the way (the unique key is checked per row).
UPDATE "register_rows" SET "rowOrder" = "rowOrder" + 1000
WHERE "registerKey" IN ('competitorTestingProtocol', 'currentSolutionsStandardOfCare');

-- 2. A row already carrying a workbook label moves to that label's position.
UPDATE "register_rows" AS r
SET "rowOrder" = v.ord
FROM (VALUES
  ('competitorTestingProtocol', 'attributeTested', 'Sensory (skin feel/absorption)', 0),
  ('competitorTestingProtocol', 'attributeTested', 'Fragrance liking', 1),
  ('competitorTestingProtocol', 'attributeTested', 'Spreadability / rub-in', 2),
  ('competitorTestingProtocol', 'attributeTested', 'Analytical (pH / viscosity)', 3),
  ('competitorTestingProtocol', 'attributeTested', 'Performance endpoint', 4),
  ('competitorTestingProtocol', 'attributeTested', 'Packaging dose accuracy', 5),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Water-only / basic wash', 0),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'OTC lotion / cream / oil', 1),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Home remedy', 2),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Chelating / specialist product', 3),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Professional / clinic advice', 4),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Do nothing', 5)
) AS v(reg, col, label, ord)
WHERE r."registerKey" = v.reg AND r."data"->>v.col = v.label;

-- 3. Add every missing workbook row to every project.
INSERT INTO "register_rows" ("id", "projectId", "registerKey", "rowOrder", "data", "updatedAt")
SELECT gen_random_uuid()::text, p."id", v.reg, v.ord, jsonb_build_object(v.col, v.label), now()
FROM "projects" AS p
CROSS JOIN (VALUES
  ('competitorTestingProtocol', 'attributeTested', 'Sensory (skin feel/absorption)', 0),
  ('competitorTestingProtocol', 'attributeTested', 'Fragrance liking', 1),
  ('competitorTestingProtocol', 'attributeTested', 'Spreadability / rub-in', 2),
  ('competitorTestingProtocol', 'attributeTested', 'Analytical (pH / viscosity)', 3),
  ('competitorTestingProtocol', 'attributeTested', 'Performance endpoint', 4),
  ('competitorTestingProtocol', 'attributeTested', 'Packaging dose accuracy', 5),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Water-only / basic wash', 0),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'OTC lotion / cream / oil', 1),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Home remedy', 2),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Chelating / specialist product', 3),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Professional / clinic advice', 4),
  ('currentSolutionsStandardOfCare', 'currentBehaviour', 'Do nothing', 5)
) AS v(reg, col, label, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "register_rows" AS e
  WHERE e."projectId" = p."id" AND e."registerKey" = v.reg AND e."rowOrder" = v.ord
);
