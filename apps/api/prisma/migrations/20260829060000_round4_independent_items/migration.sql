-- Round 4, the seven "independent" answers (docs/plans/Round4_Implementation_Roadmap.md).
-- Questions 21 · 22(b)(c) · 23(a) · 24 · 25(a)(b)(d) · 36(b).
--
-- Everything that adds or renames a checklist OPTION has to reach EXISTING
-- projects too: those rows are materialised once, at project creation, so a
-- config-only change gives the option to future projects and leaves every
-- current one with a table that can never satisfy the check reading it. That has
-- happened four times in this repo; see the note in CLAUDE.md.

-- ---------------------------------------------------------------------------
-- Question 22(b) — one of several development/change types must lead.
-- ---------------------------------------------------------------------------
ALTER TABLE "checklist_items" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- A project that ticked exactly ONE development/change type has already answered
-- "which is primary" — there is nothing to choose between. Carrying that over
-- costs nothing and avoids re-asking a question with one possible answer.
-- Projects with two or more ticks are deliberately left blank: picking one for
-- them would be inventing the answer.
UPDATE "checklist_items" c
SET "isPrimary" = true
WHERE c."sectionKey" = 'projectNature'
  AND c."selected" = true
  AND (
    SELECT count(*) FROM "checklist_items" c2
    WHERE c2."projectId" = c."projectId" AND c2."sectionKey" = 'projectNature' AND c2."selected" = true
  ) = 1;

-- ---------------------------------------------------------------------------
-- Question 22(c) — the two Owner / function values the answer supplies.
-- ---------------------------------------------------------------------------
UPDATE "checklist_items" SET "ownerFunction" = 'Requesting Function / Project Owner'
WHERE "sectionKey" = 'requestOrigin';

UPDATE "checklist_items" SET "ownerFunction" = 'NPD / Project Owner'
WHERE "sectionKey" = 'projectNature';

-- ---------------------------------------------------------------------------
-- Question 23(a) — a new Product Type option, inserted BEFORE 'Other - specify'.
--
-- itemOrder is half of a unique key, so the tail cannot simply be shifted by +1
-- (Postgres checks the constraint per row, and row N+1 would collide with N).
-- Park the tail well out of the way first, insert, then bring it back.
-- ---------------------------------------------------------------------------
UPDATE "checklist_items" SET "itemOrder" = "itemOrder" + 1000
WHERE "sectionKey" = 'productType' AND "label" = 'Other - specify';

INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, t."projectId", 'productType', t."ord", 'Product form under evaluation — to be confirmed by Gate 5',
       t."gate", t."ownerFunction", false, 'NA'
FROM (
  SELECT "projectId", max("itemOrder") + 1 AS "ord", min("gate") AS "gate", min("ownerFunction") AS "ownerFunction"
  FROM "checklist_items"
  WHERE "sectionKey" = 'productType' AND "itemOrder" < 1000
  GROUP BY "projectId"
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = t."projectId" AND c."sectionKey" = 'productType'
    AND c."label" = 'Product form under evaluation — to be confirmed by Gate 5'
);

UPDATE "checklist_items" SET "itemOrder" = "itemOrder" - 999
WHERE "sectionKey" = 'productType' AND "itemOrder" >= 1000;

-- ---------------------------------------------------------------------------
-- Question 25(b) — split 'Dry / eczema-prone skin' into two options.
--
-- The existing row becomes 'Dry skin' (it keeps its itemOrder) and a new
-- 'Eczema-prone or compromised skin' is inserted immediately after it.
--
-- A tick on the COMBINED option carries over to BOTH. That is the answer's own
-- fallback for the un-split case — "treat the combined option as triggering the
-- sensitive/compromised-skin review" — and it is the only direction that cannot
-- silently downgrade a project: moving the tick to 'Dry skin' alone would drop a
-- vulnerable-user classification nobody decided to drop. A reviewer who knows the
-- project is dry-skin-only can un-tick the eczema row; the reverse mistake is
-- invisible.
-- ---------------------------------------------------------------------------
UPDATE "checklist_items" SET "itemOrder" = "itemOrder" + 1000
WHERE "sectionKey" = 'targetUsers'
  AND "itemOrder" > (
    SELECT c2."itemOrder" FROM "checklist_items" c2
    WHERE c2."projectId" = "checklist_items"."projectId"
      AND c2."sectionKey" = 'targetUsers' AND c2."label" = 'Dry / eczema-prone skin'
  );

INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status", "notes")
SELECT gen_random_uuid()::text, d."projectId", 'targetUsers', d."itemOrder" + 1,
       'Eczema-prone or compromised skin', d."gate", d."ownerFunction", d."selected",
       d."status",
       CASE WHEN d."selected" THEN
         trim(both ' ' from coalesce(d."notes", '') || ' [Carried over 2026-08-29 from the combined "Dry / eczema-prone skin" option, which was split. Un-tick if this project is dry skin only.]')
       ELSE d."notes" END
FROM "checklist_items" d
WHERE d."sectionKey" = 'targetUsers' AND d."label" = 'Dry / eczema-prone skin'
  AND NOT EXISTS (
    SELECT 1 FROM "checklist_items" c
    WHERE c."projectId" = d."projectId" AND c."sectionKey" = 'targetUsers'
      AND c."label" = 'Eczema-prone or compromised skin'
  );

UPDATE "checklist_items" SET "label" = 'Dry skin'
WHERE "sectionKey" = 'targetUsers' AND "label" = 'Dry / eczema-prone skin';

UPDATE "checklist_items" SET "itemOrder" = "itemOrder" - 999
WHERE "sectionKey" = 'targetUsers' AND "itemOrder" >= 1000;

-- ---------------------------------------------------------------------------
-- Question 21 — requirement rows gain an N/A rationale, and the priority column
-- changes vocabulary.
--
-- The old values (Low / Medium / High / Critical, borrowed from NEXT_ACTION_
-- PRIORITIES) are NOT mapped onto Must / Should / Could. The answer's reason for
-- rejecting them is that they are a different KIND of judgement — "criticality
-- remains a risk concept, not a requirements-priority value" — so any mapping
-- would be us inventing an equivalence the answer denies. Each old value is
-- preserved verbatim in the row's notes and the column cleared, so a person
-- re-picks knowing what was there before.
-- ---------------------------------------------------------------------------
ALTER TABLE "requirement_items" ADD COLUMN "naRationale" TEXT;

UPDATE "requirement_items"
SET "notes" = trim(both ' ' from coalesce("notes", '') || ' [Priority before 2026-08-29: ' || "priority" || '. The Low/Medium/High/Critical scale was replaced by Must/Should/Could (Round 4 question 21); please re-select.]'),
    "priority" = NULL
WHERE "priority" IS NOT NULL
  AND "priority" <> ''
  AND "priority" NOT IN ('Must', 'Should', 'Could');

-- ---------------------------------------------------------------------------
-- Question 36(b) — Costing / Commercial Feasibility Status.
-- ---------------------------------------------------------------------------
ALTER TABLE "costing_inputs"
  ADD COLUMN "feasibilityStatus" TEXT,
  ADD COLUMN "assessor" TEXT,
  ADD COLUMN "reviewDate" DATE,
  ADD COLUMN "assumptions" TEXT,
  ADD COLUMN "evidenceLink" TEXT;

-- ---------------------------------------------------------------------------
-- Question 24 — the duplicate initial-market field goes.
--
-- Dropped last, and only after anything recorded in it is preserved: a project
-- that somehow has no Countries / Markets rows gets one made from that text, so
-- the answer's "single source of truth" gains rather than loses information.
-- (Every project created so far has markets — the create form required them
-- until today — so this is expected to insert nothing.)
-- ---------------------------------------------------------------------------
INSERT INTO "project_markets" ("id", "projectId", "market")
SELECT gen_random_uuid()::text, p."id", trim(both ' ' from p."initialTargetMarkets")
FROM "projects" p
WHERE p."initialTargetMarkets" IS NOT NULL
  AND trim(both ' ' from p."initialTargetMarkets") <> ''
  AND NOT EXISTS (SELECT 1 FROM "project_markets" m WHERE m."projectId" = p."id");

ALTER TABLE "projects" DROP COLUMN "initialTargetMarkets";
