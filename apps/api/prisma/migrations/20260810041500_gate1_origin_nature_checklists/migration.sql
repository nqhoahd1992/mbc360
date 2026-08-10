-- Gate 1: request origin and project nature move from single-valued Project
-- columns (added 2026-08-09) to gate-01 checklist sections, matching the shape
-- the source workbook uses for every pick-from-a-list question. See the comment
-- on those sections in packages/shared/src/config/phases.ts.
--
-- Three steps, in this order, so no recorded answer is lost:
--   1. create the checklist rows for every EXISTING project (a new project gets
--      them from project-scaffold.ts, which reads the same config);
--   2. carry each project's old single value over as a ticked row, and its
--      "Other - specify" free text into that row's notes;
--   3. only then drop the columns.

-- 1. Scaffold the two sections for existing projects. Labels and order must
-- match REQUEST_ORIGIN_OPTIONS / PROJECT_NATURE_OPTIONS exactly — the readiness
-- checks and the newOrRepositionedProject trigger match on the label.
INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, p."id", 'requestOrigin', o."ord", o."label", '01', 'Project owner / Sales / NPD', false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  (0, 'Internal product-development proposal'),
  (1, 'Management request'),
  (2, 'Sales request'),
  (3, 'Marketing request'),
  (4, 'Customer request'),
  (5, 'Distributor request'),
  (6, 'Healthcare-professional request'),
  (7, 'Consumer feedback'),
  (8, 'Complaint or post-market signal'),
  (9, 'Market research or identified opportunity'),
  (10, 'Competitor or benchmark response'),
  (11, 'Regulatory change'),
  (12, 'Supplier or ingredient opportunity'),
  (13, 'Manufacturing or quality improvement'),
  (14, 'Reformulation or lifecycle improvement'),
  (15, 'Other — specify')
) AS o("ord", "label")
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = p."id" AND c."sectionKey" = 'requestOrigin' AND c."itemOrder" = o."ord"
);

INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, p."id", 'projectNature', n."ord", n."label", '01', 'Project owner / NPD', false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  (0, 'New development'),
  (1, 'Reformulation'),
  (2, 'Claim change'),
  (3, 'Packaging change'),
  (4, 'Market extension'),
  (5, 'Lifecycle improvement')
) AS n("ord", "label")
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = p."id" AND c."sectionKey" = 'projectNature' AND c."itemOrder" = n."ord"
);

-- 2. Carry over what was already recorded. Ticking sets status 'Y' because that
-- is what ChecklistSection does for a manual tick, and what
-- `checklistHasSelection` reads.
UPDATE "checklist_items" c
SET "selected" = true, "status" = 'Y', "notes" = p."requestOriginOther"
FROM "projects" p
WHERE c."projectId" = p."id"
  AND c."sectionKey" = 'requestOrigin'
  AND p."requestOrigin" IS NOT NULL
  AND c."label" = p."requestOrigin";

UPDATE "checklist_items" c
SET "selected" = true, "status" = 'Y'
FROM "projects" p
WHERE c."projectId" = p."id"
  AND c."sectionKey" = 'projectNature'
  AND p."projectNature" IS NOT NULL
  AND c."label" = p."projectNature";

-- 3. Drop the superseded columns.
ALTER TABLE "projects" DROP COLUMN "requestOrigin",
                       DROP COLUMN "requestOriginOther",
                       DROP COLUMN "projectNature";
