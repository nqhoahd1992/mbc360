-- Round 5 question 30: pack requirements of a market profile can be assessed as "not applicable" with a rationale; reviewer and date are server-written.
ALTER TABLE "market_profiles" ADD COLUMN "packRequirementsNa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "market_profiles" ADD COLUMN "packRequirementsRationale" TEXT;
ALTER TABLE "market_profiles" ADD COLUMN "packRequirementsReviewedBy" TEXT;
ALTER TABLE "market_profiles" ADD COLUMN "packRequirementsReviewedAt" TIMESTAMP(3);
ALTER TABLE "market_profiles" ADD COLUMN "effectiveFrom" TEXT;
