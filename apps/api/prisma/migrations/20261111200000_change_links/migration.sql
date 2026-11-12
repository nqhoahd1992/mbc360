-- Round 5 question 11: the new version belongs on the change record (not on the rulebook sheets), and a formula version names the master change it raised.
-- Additive. A version raised before this has no linked change, and the formula version history shows that rather than hiding it.
ALTER TABLE "change_records" ADD COLUMN "newVersion" TEXT;
ALTER TABLE "formula_versions" ADD COLUMN "linkedChangeId" TEXT;

-- A Major version created since Q11's first cut already raised a master change whose trigger names it; link those so the history reads correctly.
UPDATE "formula_versions" v
SET "linkedChangeId" = c."changeId"
FROM "change_records" c
WHERE v."projectId" = c."projectId" AND v."changeType" = 'Major' AND v."linkedChangeId" IS NULL
  AND c."trigger" LIKE 'Formula version % -> ' || v."version" || ' (Major)';
