-- Round 5 question 10: Gates 10-12 are decided market by market, so a Material triage can name the markets it reaches.
ALTER TABLE "change_records" ADD COLUMN "confirmedMarkets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
