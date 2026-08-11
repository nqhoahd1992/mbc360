-- Align the two gate-01 checklist sections' `ownerFunction` with the revised
-- config (packages/shared/src/config/phases.ts): two functions, not the
-- three-name gate owner copied from `Stage_Map!F8`.
--
-- Why a migration at all: `ownerFunction` is stored per row (it is a column on
-- `checklist_items`, seeded from config when a project is scaffolded), so
-- changing the config alone leaves every existing project reading the old value.
--
-- Only `requestOrigin` actually changes value; `projectNature` is restated so the
-- migration is self-describing and safe to re-run.
UPDATE "checklist_items" SET "ownerFunction" = 'Project owner / Sales'
WHERE "sectionKey" = 'requestOrigin';

UPDATE "checklist_items" SET "ownerFunction" = 'Project owner / NPD'
WHERE "sectionKey" = 'projectNature';
