-- A Key Gate Check and a checklist can be a market's own (project owner, 2026-11-11), so one market is not held by another's.
ALTER TABLE "gate_checks" ADD COLUMN "market" TEXT;
ALTER TABLE "checklist_items" ADD COLUMN "market" TEXT;

-- 1. "Countries/regulatory pathway matched and PIF/evidence file mapped" (Gate 10): one row per market, carrying what was recorded on the
--    single row. The ids start with "z" so the copies sort after the rows already there (gate checks are listed by id).
INSERT INTO "gate_checks" ("id", "projectId", "gate", "check", "market", "done", "ynna", "date", "evidenceRef", "methodRef", "internalLink", "initials", "notes")
SELECT
  'z' || md5(random()::text || clock_timestamp()::text || gc."id" || pm."market"),
  gc."projectId", gc."gate", gc."check", pm."market", gc."done", gc."ynna", gc."date", gc."evidenceRef", gc."methodRef", gc."internalLink", gc."initials", gc."notes"
FROM "gate_checks" gc
JOIN "project_markets" pm ON pm."projectId" = gc."projectId"
WHERE gc."gate" = '10' AND gc."check" = 'Countries/regulatory pathway matched and PIF/evidence file mapped' AND gc."market" IS NULL;

DELETE FROM "gate_checks"
WHERE "gate" = '10' AND "check" = 'Countries/regulatory pathway matched and PIF/evidence file mapped' AND "market" IS NULL;

-- 2. The three Post-Market Feedback checklists: every option once per market, a market's options together.
UPDATE "checklist_items" SET "itemOrder" = "itemOrder" + 100000
WHERE "sectionKey" IN ('postMarketSources', 'postMarketIssueType', 'postMarketAction');

INSERT INTO "checklist_items" (
  "id", "projectId", "sectionKey", "itemOrder", "market", "label", "gate", "selected", "ownerFunction", "status", "isPrimary", "evidenceLink", "notes"
)
SELECT
  md5(random()::text || clock_timestamp()::text || ci."id" || pm."market"),
  ci."projectId", ci."sectionKey",
  ci."itemOrder" * 100 + row_number() OVER (PARTITION BY ci."id" ORDER BY pm."market"),
  pm."market", ci."label", ci."gate", ci."selected", ci."ownerFunction", ci."status", ci."isPrimary", ci."evidenceLink", ci."notes"
FROM "checklist_items" ci
JOIN "project_markets" pm ON pm."projectId" = ci."projectId"
WHERE ci."sectionKey" IN ('postMarketSources', 'postMarketIssueType', 'postMarketAction') AND ci."market" IS NULL;

DELETE FROM "checklist_items"
WHERE "sectionKey" IN ('postMarketSources', 'postMarketIssueType', 'postMarketAction') AND "market" IS NULL;

UPDATE "checklist_items" t
SET "itemOrder" = s.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "projectId", "sectionKey" ORDER BY "market", "itemOrder") - 1 AS rn
  FROM "checklist_items"
  WHERE "sectionKey" IN ('postMarketSources', 'postMarketIssueType', 'postMarketAction')
) s
WHERE t."id" = s."id";
