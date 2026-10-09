-- Software rules SW-4 / SW-5 (docs/rules/Software_Rules.md): register rows need a
-- stable identity. A register is rewritten whole on every save and rows were matched
-- by position, which cannot say "this is the same row as before" once one is deleted
-- or inserted — and that is exactly what "a row created after gate N passed does not
-- belong to gate N" and "a row a passed gate counted cannot be deleted" depend on.
--
-- Data only, no schema change: the identity is a key inside the row's JSON
-- (`__rowId`), written by the server. Every existing row gets one here.
--
-- Deliberately NOT backfilled: `__bornAtGate`. Nobody recorded which gate was open when
-- an existing row was created, and inventing one would either start excluding rows from
-- gates that were signed on them or fabricate history. A row with no stamp belongs to
-- every gate — exactly how the app treated it until now — so this migration cannot
-- make any gate's readiness stricter or looser than it was.
UPDATE "register_rows"
SET "data" = "data" || jsonb_build_object('__rowId', 'r_' || md5("id" || random()::text || clock_timestamp()::text))
WHERE NOT ("data" ? '__rowId');
