-- Round 5 question 10: a change gets a controlled impact assessment (triage) by Quality, which confirms the scope and, on a material impact,
-- reopens the affected gates. Additive. Existing changes start with NO triage, which is the correct state for a control that did not exist
-- yesterday: an open one will hold the readiness of the gates it can affect until it is assessed.
ALTER TABLE "change_records"
  ADD COLUMN "impactTriage" TEXT,
  ADD COLUMN "triageReason" TEXT,
  ADD COLUMN "triageBy" TEXT,
  ADD COLUMN "triageDate" DATE,
  ADD COLUMN "confirmedGates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "restoreConfirmation" TEXT;
