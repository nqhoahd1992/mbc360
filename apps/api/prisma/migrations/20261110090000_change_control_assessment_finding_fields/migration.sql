-- Round 5 question 2(c): a finding carries a generated Finding ID, its source/category, source record link, date identified, affected
-- SKU/formula/batch, the affected market(s) (plural: one finding may affect several), review cycle, severity and disposition.
-- The old single "market" column becomes "markets" and keeps what it held. Additive otherwise, no backfill.
ALTER TABLE "change_control_assessments" RENAME COLUMN "market" TO "markets";
ALTER TABLE "change_control_assessments"
  ADD COLUMN "findingId" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "sourceRecord" TEXT,
  ADD COLUMN "dateIdentified" TEXT,
  ADD COLUMN "affected" TEXT,
  ADD COLUMN "reviewCycle" TEXT,
  ADD COLUMN "severity" TEXT,
  ADD COLUMN "disposition" TEXT;
