-- Round 5 question 19(a): a market the product has been sold in keeps its Gate 12 obligations after withdrawal until a closure,
-- with a period and criteria set by Regulatory / Quality, is confirmed. Additive: no existing row has a closure, so every withdrawn
-- market that was launched keeps its Gate 12 lane until someone records one (nothing is removed silently).
ALTER TABLE "market_tracks" ADD COLUMN "withdrawalClosureCriteria" TEXT;
ALTER TABLE "market_tracks" ADD COLUMN "withdrawalClosureUntil" DATE;
ALTER TABLE "market_tracks" ADD COLUMN "withdrawalClosureSetBy" TEXT;
ALTER TABLE "market_tracks" ADD COLUMN "withdrawalClosedAt" DATE;
ALTER TABLE "market_tracks" ADD COLUMN "withdrawalClosedBy" TEXT;
