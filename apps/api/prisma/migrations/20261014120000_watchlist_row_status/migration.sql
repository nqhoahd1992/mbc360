-- Prohibited Ingredient Watch-list and Pregnancy / Breastfeeding Caution Limits gain a work-status column of their own (the six values
-- the V18 workbook offers on the sheet), separate from the descriptive "Status / level" text.
--
-- Fixed-register rows are materialised once at project creation, so config alone would reach new projects only (the scaffold-drift
-- family — see CLAUDE.md). This gives every existing row the same default a new project's row gets. Rows that already carry a
-- status are left alone.
UPDATE "register_rows"
SET "data" = "data" || '{"status": "Not Started"}'::jsonb
WHERE "registerKey" IN ('prohibitedIngredients', 'pbCautionLimits')
  AND NOT ("data" ? 'status');
