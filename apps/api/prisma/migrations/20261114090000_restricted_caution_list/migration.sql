-- Round 5 question 16(a): the company's controlled restricted and caution ingredient list, approved by Regulatory and by Safety.
CREATE TABLE "restricted_caution_entries" (
  "id" TEXT NOT NULL,
  "ingredient" TEXT NOT NULL,
  "casNo" TEXT,
  "kind" TEXT NOT NULL,
  "condition" TEXT,
  "markets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceReference" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "effectiveFrom" TEXT NOT NULL,
  "effectiveTo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Proposed',
  "approvedByRegulatory" TEXT,
  "approvedByRegulatoryAt" TIMESTAMP(3),
  "approvedBySafety" TEXT,
  "approvedBySafetyAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restricted_caution_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "restricted_caution_entries_ingredient_idx" ON "restricted_caution_entries"("ingredient");
ALTER TABLE "restricted_caution_entries" ADD CONSTRAINT "restricted_caution_entries_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
