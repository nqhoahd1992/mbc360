-- A generated "not applicable" reason is acknowledged by the person holding the FUNCTION the review team names for the
-- item (Round 5 question 1), and several functions may have to: "where both functions are needed, both conclusions must
-- be recorded". So an acknowledgement is now one row per (gate, item, function) instead of one per (gate, item).
--
-- Every existing row was given by whoever was nominated "Reviewed by" on the phase's sign-off, which is the reading the
-- review team replaced: it names no function, so it cannot count for any. Those rows go and the items go back to waiting
-- for the right person. Nothing is lost from the record: each edit is an audit event carrying the values before and
-- after (action readiness_ack.recorded), and the audit trail is not touched. The control is a few days old, so this is
-- at most the acknowledgements of test projects.
DELETE FROM "readiness_acknowledgements";

ALTER TABLE "readiness_acknowledgements" ADD COLUMN "functionKey" TEXT NOT NULL;

DROP INDEX "readiness_acknowledgements_projectId_gateId_itemId_key";

CREATE UNIQUE INDEX "readiness_acknowledgements_projectId_gateId_itemId_functionKey_key"
  ON "readiness_acknowledgements"("projectId", "gateId", "itemId", "functionKey");
