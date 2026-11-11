-- The Infant & Baby Safety Gate 10 table: "Approved age and use statements" and "Label warnings and directions" are about a market's own
-- statements and pack, so each becomes one row per market (project owner, 2026-11-11). Same expansion as expandRequirementRows
-- (packages/shared/src/utils/marketRequirements.ts), written out because a migration cannot read the configuration; what was recorded on
-- the single row is carried onto every copy.
UPDATE "requirement_items" SET "itemOrder" = "itemOrder" + 100000 WHERE "sectionKey" = 'infantPif';

INSERT INTO "requirement_items" (
  "id", "projectId", "sectionKey", "itemOrder", "gate", "requirement", "priority", "requirementText", "minimumRequirement",
  "rationale", "owner", "status", "naRationale", "ynna", "evidenceLink", "notes", "market"
)
SELECT
  md5(random()::text || clock_timestamp()::text || ri."id" || pm."market"),
  ri."projectId", ri."sectionKey",
  ri."itemOrder" * 100 + row_number() OVER (PARTITION BY ri."id" ORDER BY pm."market"),
  ri."gate", ri."requirement", ri."priority", ri."requirementText", ri."minimumRequirement",
  ri."rationale", ri."owner", ri."status", ri."naRationale", ri."ynna", ri."evidenceLink", ri."notes", pm."market"
FROM "requirement_items" ri
JOIN "project_markets" pm ON pm."projectId" = ri."projectId"
WHERE ri."sectionKey" = 'infantPif'
  AND ri."market" IS NULL
  AND ri."requirement" IN ('Approved age and use statements', 'Label warnings and directions');

DELETE FROM "requirement_items"
WHERE "sectionKey" = 'infantPif'
  AND "market" IS NULL
  AND "requirement" IN ('Approved age and use statements', 'Label warnings and directions');

-- renumber from zero in the configuration's order, a row's markets together
UPDATE "requirement_items" t
SET "itemOrder" = s.rn
FROM (
  SELECT "id", row_number() OVER (
    PARTITION BY "projectId"
    ORDER BY
      CASE "requirement"
        WHEN 'Infant-use safety conclusion' THEN 0
        WHEN 'Relevant ingredient and formula assessments' THEN 1
        WHEN 'Applicable test reports' THEN 2
        WHEN 'Approved age and use statements' THEN 3
        WHEN 'Evidence supporting infant-related claims' THEN 4
        WHEN 'Label warnings and directions' THEN 5
        ELSE 6
      END,
      "market" NULLS FIRST,
      "itemOrder"
  ) - 1 AS rn
  FROM "requirement_items"
  WHERE "sectionKey" = 'infantPif'
) s
WHERE t."id" = s."id";
