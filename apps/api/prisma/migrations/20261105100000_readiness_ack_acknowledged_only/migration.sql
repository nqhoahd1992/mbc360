-- A reviewer can no longer record "Not acknowledged" on a generated "not applicable" reason (project owner, 2026-11-05):
-- an item nobody has acknowledged is simply blocked, and a reviewer who disagrees changes the facts behind the N/A.
--
-- A row recording a refusal would now read as an acknowledgement, so those rows go. Nothing is lost: every edit of an
-- acknowledgement is an audit event carrying the values before and after (action readiness_ack.recorded), and the
-- audit trail is not touched. The item they belonged to goes back to "waiting for an acknowledgement", which is what it
-- meant.
DELETE FROM "readiness_acknowledgements" WHERE "outcome" = 'Not acknowledged';

-- With the refusal gone the two columns carry nothing: every remaining row is an acknowledgement and none has a reason.
ALTER TABLE "readiness_acknowledgements" DROP COLUMN "outcome", DROP COLUMN "comment";
