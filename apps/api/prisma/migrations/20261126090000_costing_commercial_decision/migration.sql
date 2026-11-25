-- Round 5 question 21: a Proceed with Conditions on a commercially dependent project can carry a costing that is not Commercially Feasible only with
-- the commercial decision its status needs (acceptance of the conditions with a tracked action, a bounded risk, an authorised revision, a scope
-- decision). Additive and empty: nothing is invented, so a costing already recorded as Feasible with Conditions, In Progress, Not Feasible or N/A has
-- none of it until the person who may give it records it.
ALTER TABLE "costing_inputs" ADD COLUMN "conditionActionId" TEXT;
ALTER TABLE "costing_inputs" ADD COLUMN "riskBound" TEXT;
ALTER TABLE "costing_inputs" ADD COLUMN "commercialDecisionBy" TEXT;
ALTER TABLE "costing_inputs" ADD COLUMN "commercialDecisionAt" DATE;
ALTER TABLE "costing_inputs" ADD COLUMN "revisionChangeId" TEXT;
