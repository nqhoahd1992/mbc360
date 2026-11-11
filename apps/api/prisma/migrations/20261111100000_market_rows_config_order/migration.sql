-- The copies the previous migration made of the two market rows sorted after every other row of Dossier / HCP Evidence Checks. A new
-- project (expandRequirementRows) lists them where the configuration puts them: each market row in place, its markets together, then
-- the next row. This puts an existing project's table in that same order.
UPDATE "requirement_items" SET "itemOrder" = "itemOrder" + 100000 WHERE "sectionKey" = 'dossierEvidence';

UPDATE "requirement_items" t
SET "itemOrder" = s.rn
FROM (
  SELECT "id", row_number() OVER (
    PARTITION BY "projectId"
    ORDER BY
      CASE "requirement"
        WHEN 'ASEAN PIF mapped' THEN 0
        WHEN 'Product Safety Summary' THEN 1
        WHEN 'Ingredient Risk Table' THEN 2
        WHEN 'Substitution Table' THEN 3
        WHEN 'Efficacy evidence summary' THEN 4
        WHEN 'Approved HCP wording' THEN 5
        WHEN 'PIF/CPSR export-ready' THEN 6
        WHEN 'Country-specific restrictions' THEN 7
        ELSE 8
      END,
      "market" NULLS FIRST,
      "itemOrder"
  ) - 1 AS rn
  FROM "requirement_items"
  WHERE "sectionKey" = 'dossierEvidence'
) s
WHERE t."id" = s."id";
