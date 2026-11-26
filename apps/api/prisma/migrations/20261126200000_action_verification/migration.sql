-- Round 5 question 23(b): a Next Action carries its kind (which decides whether its closure needs independent verification), the verifier nominated for
-- it, and — when a substantive action is cancelled — the justification and the impact review. Additive and empty: nothing is invented, so an existing
-- action has no type (read as substantive) and no verifier until a person gives one.
ALTER TABLE "next_actions" ADD COLUMN "actionType" TEXT;
ALTER TABLE "next_actions" ADD COLUMN "verifier" TEXT;
ALTER TABLE "next_actions" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "next_actions" ADD COLUMN "cancellationImpact" TEXT;
