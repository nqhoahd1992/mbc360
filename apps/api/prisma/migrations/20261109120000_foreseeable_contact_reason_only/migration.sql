-- Round 5 question 1(d), project owner 2026-11-09 (second decision): the foreseeable-contact record is ONE written reason, with no
-- Yes/No. Foreseeable contact is recorded by ticking the maternal or infant user, so a Yes had nothing left to say.
--
-- A reason that explained a No stays: it is exactly what the new field holds. A reason that explained a Yes is cleared, because it
-- would now read as "why no contact is foreseeable" about a product its author said does have such contact; that project asks again
-- (it blocks until a reason is written or the user is ticked), and the old text remains in the audit trail of the earlier saves.
UPDATE "projects" SET "foreseeableContactRationale" = NULL WHERE "foreseeableContact" IS DISTINCT FROM 'No';
ALTER TABLE "projects" DROP COLUMN "foreseeableContact";
