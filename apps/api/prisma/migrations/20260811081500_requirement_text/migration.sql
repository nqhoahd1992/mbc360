-- Phase 1's requirements table was missing the middle of the shape B6 asked for:
-- "a structured table with category, requirement, priority, owner and notes".
-- The 16 rows the team listed are the CATEGORIES, so the existing `requirement`
-- column holds those; the project's own requirement text had nowhere to go and
-- was being typed into `notes`, which then did double duty.
--
-- Nullable and Phase-1-only in practice: Phases 2-4 keep the engineering shape
-- (requirement / minimum / rationale) and never render this column.
ALTER TABLE "requirement_items" ADD COLUMN "requirementText" TEXT;
