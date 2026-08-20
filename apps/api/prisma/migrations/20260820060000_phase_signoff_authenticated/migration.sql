-- D1 (2026-08-07): a sign-off must record an authenticated user, the role that
-- user held, date/time, decision, the record version signed, and a comment
-- where required. The phase-level block held `name` + `initials` as FREE TEXT,
-- so a row could name one person while `signedByUserId` (already taken from the
-- session) recorded another — and nothing in the app ever showed the mismatch.
--
-- Three columns close that gap:
--   assignedToUserId — whom the project's Lead nominated to sign this row; only
--                      that person may sign it (current state, reassignable)
--   roleAtSigning    — the signer's role label(s) AT SIGNING, snapshotted so a
--                      later role change cannot rewrite a past signature
--   recordVersion    — projects.version the signature attests to
--
-- Nothing is backfilled and nothing is dropped. `name`/`initials` stay (they are
-- the workbook's own two columns) but are written by the server from the
-- signer's account from now on. Signatures already recorded keep whatever text
-- was typed; they carry no roleAtSigning/recordVersion, which is honest —
-- those facts were never captured for them.
ALTER TABLE "sign_offs" ADD COLUMN "assignedToUserId" TEXT;
ALTER TABLE "sign_offs" ADD COLUMN "roleAtSigning" TEXT;
ALTER TABLE "sign_offs" ADD COLUMN "recordVersion" INTEGER;

ALTER TABLE "sign_offs"
  ADD CONSTRAINT "sign_offs_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
