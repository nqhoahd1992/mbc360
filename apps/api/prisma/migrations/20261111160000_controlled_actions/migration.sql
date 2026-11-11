-- Round 5 question 9: a gap is carried by a tracked Next Action, and a controlled action holds completion criteria, an escalation
-- trigger and closure evidence. Additive: no existing row changes. A gap recorded before this keeps its plain-text action and owner
-- (read-only history) and simply has no linked action yet, which is the correct state for a control that did not exist yesterday.
ALTER TABLE "gate_records" ADD COLUMN "gapLinkedNextActionId" TEXT;
ALTER TABLE "next_actions"
  ADD COLUMN "completionCriteria" TEXT,
  ADD COLUMN "escalationTrigger" TEXT,
  ADD COLUMN "evidenceLink" TEXT;
