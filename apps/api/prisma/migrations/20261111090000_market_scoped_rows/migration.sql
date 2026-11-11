-- Rows that belong to one market (project owner, 2026-11-11): so a market is not held by another's. A requirement row and a next action
-- can name a market; null means the product / every market.
ALTER TABLE "requirement_items" ADD COLUMN "market" TEXT;
ALTER TABLE "next_actions" ADD COLUMN "market" TEXT;

-- An existing project's Dossier / HCP Evidence Checks table has ONE row each for "ASEAN PIF mapped" and "Country-specific restrictions";
-- they become one row per market (per ASEAN market for the first), carrying what was recorded on the single row. The same expansion as
-- expandRequirementRows (packages/shared/src/utils/marketRequirements.ts), written out because a migration cannot read the config.
-- 1. park the section's rows out of the way of the final order
UPDATE "requirement_items" SET "itemOrder" = "itemOrder" + 100000 WHERE "sectionKey" = 'dossierEvidence';

-- 2. a copy of each market row for every market it applies to
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
WHERE ri."sectionKey" = 'dossierEvidence'
  AND ri."market" IS NULL
  AND (
    ri."requirement" = 'Country-specific restrictions'
    OR (
      ri."requirement" = 'ASEAN PIF mapped'
      AND pm."market" IN ('Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore', 'Thailand', 'Vietnam')
    )
  );

-- 3. the single rows give way to their copies
DELETE FROM "requirement_items"
WHERE "sectionKey" = 'dossierEvidence'
  AND "market" IS NULL
  AND "requirement" IN ('Country-specific restrictions', 'ASEAN PIF mapped');

-- 4. renumber the section from zero, in order
UPDATE "requirement_items" t
SET "itemOrder" = s.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "projectId" ORDER BY "itemOrder") - 1 AS rn
  FROM "requirement_items"
  WHERE "sectionKey" = 'dossierEvidence'
) s
WHERE t."id" = s."id";
