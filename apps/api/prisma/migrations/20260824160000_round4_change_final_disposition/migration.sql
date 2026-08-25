-- Round 4 question 34(c) (2026-08-24): "A closing date or short note alone is
-- insufficient." A final disposition is eight things; three columns already
-- existed (status, closureEvidence, closedDate) and these are the rest.
--
-- All nullable and starting NULL, which is the point rather than a side effect:
-- an existing change marked Completed with only a closing date now FAILS the
-- disposition test and blocks Gate 11 until someone records how it actually
-- closed. That is the behaviour the answer asks for — back-filling anything here
-- would quietly re-close changes nobody has documented.
ALTER TABLE "change_records"
  ADD COLUMN "closureOutcome" TEXT,
  ADD COLUMN "closureImplementation" TEXT,
  ADD COLUMN "closureImpactedVersions" TEXT,
  ADD COLUMN "closureVerifier" TEXT,
  ADD COLUMN "closureRemainingAction" TEXT;
