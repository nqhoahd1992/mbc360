-- Round 5 question 15: a deferred Should/Could requirement names the tracked Next Action that carries it; a changed requirement names its approved scope change.
ALTER TABLE "requirement_items" ADD COLUMN "deferralActionId" TEXT;
ALTER TABLE "requirement_items" ADD COLUMN "scopeChangeId" TEXT;
