-- Phase 1 "Project Requirements & Exclusions" (SME Round 3 B6) reached config and
-- the UI on 2026-08-09, but its 16 rows are scaffolded at project CREATION — so
-- every project opened before that date shows the table empty, and the Gate 02
-- readiness item that reads it can never be satisfied there.
--
-- Same defect class as the gate-01 checklist backfill earlier today
-- (20260810041500): adding a section to config is only half the change, the
-- other half is giving it to the projects that already exist.
--
-- Rows generated from PHASE_CONFIGS[1].requirementSections.projectRequirements,
-- in its order, so a backfilled project is indistinguishable from a new one.
INSERT INTO "requirement_items" ("id", "projectId", "sectionKey", "itemOrder", "gate", "requirement", "minimumRequirement", "rationale", "owner", "status")
SELECT gen_random_uuid()::text, p."id", 'projectRequirements', v."ord", v."gate", v."requirement", v."minimum", v."rationale", v."owner", 'Not Started'
FROM "projects" p
CROSS JOIN (VALUES
  (0, '02', 'Must-have product requirements', '', '', ''),
  (1, '02', 'Must-not-have ingredients or features', '', '', ''),
  (2, '02', 'Intended claims', '', '', ''),
  (3, '02', 'Claims not to pursue', '', '', ''),
  (4, '02', 'Target pH or physical requirements, where known', '', '', ''),
  (5, '02', 'Sensory requirements', '', '', ''),
  (6, '02', 'Packaging requirements', '', '', ''),
  (7, '02', 'Target cost or commercial boundary', '', '', ''),
  (8, '02', 'Target timeline', '', '', ''),
  (9, '02', 'Target markets', '', '', ''),
  (10, '02', 'Regulatory constraints', '', '', ''),
  (11, '02', 'User/life-stage constraints', '', '', ''),
  (12, '02', 'Benchmark or reference product', '', '', ''),
  (13, '02', 'Known technical risks', '', '', ''),
  (14, '02', 'Explicit exclusions', '', '', ''),
  (15, '02', 'Other project assumptions', '', '', '')
) AS v("ord", "gate", "requirement", "minimum", "rationale", "owner")
WHERE NOT EXISTS (
  SELECT 1 FROM "requirement_items" r
  WHERE r."projectId" = p."id" AND r."sectionKey" = 'projectRequirements' AND r."itemOrder" = v."ord"
);
