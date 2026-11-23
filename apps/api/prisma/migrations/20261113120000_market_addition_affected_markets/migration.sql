-- Round 5 question 12: "unless a shared issue is identified" — other markets the same finding reaches.
ALTER TABLE "market_addition_assessments" ADD COLUMN "affectedMarkets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
