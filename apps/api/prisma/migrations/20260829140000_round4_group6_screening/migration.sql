-- Round 4, group 6 — ingredient screening and safety (questions 5 · 6 · 23(b) · 31(f)).
--
-- Only ONE of the four needs a migration, and it is the one that has caught this
-- repo out four times: a Key Gate Check row is materialised once, at project
-- creation, so adding it to config alone gives it to future projects and leaves
-- every existing one blocked by a Mandatory item with no row on screen to tick.
--
-- The other three changes need nothing here:
--   question 6   — `gate4Disposition` is a new column on two `mode:'fixed'`
--                  registers, whose rows live in a JSON column; an absent key
--                  reads as empty, which is exactly the "not dispositioned" state
--                  the new check blocks on. A backfill would be wrong: it would
--                  invent a disposition nobody made.
--   question 23b — same, for `coverageRoute` / `coverageReference` on the
--                  Ingredient-Level Safety Matrix.
--   question 31f — pure rule change (scope narrows to the current formula); no
--                  stored data means anything different.
--   question 5   — the new General Restricted & Caution register is `mode:'register'`,
--                  so it has no seeded rows to scaffold.

-- Question 5, option (b): Gate 7 needs a GENERAL restricted-and-caution assessment
-- for every product, with the maternal and infant screens as additional layers.
-- This row is the record that somebody looked and found nothing — without it an
-- empty findings register would read as a pass, and "no restricted ingredient" is
-- the common case.
--
-- Keyed on (projectId, gate, check), the same identity ProjectsService uses to
-- address a gate check, so re-running cannot duplicate a row anyone has ticked.
INSERT INTO "gate_checks" ("id", "projectId", "gate", "check", "done", "ynna")
SELECT gen_random_uuid()::text, p."id", '07', 'General restricted and caution ingredient assessment completed', false, 'NA'
FROM "projects" p
WHERE NOT EXISTS (
  SELECT 1 FROM "gate_checks" g
  WHERE g."projectId" = p."id"
    AND g."gate" = '07'
    AND g."check" = 'General restricted and caution ingredient assessment completed'
);

-- Question 5 also adds a register, and a register carries a closing act since
-- 2026-08-27 (RegisterClosure + 2 blank sign-off rows, scaffolded at project
-- creation). Same defect class as the gate-check row above, and `verify:scaffold`
-- caught it the moment the register was added — which is what that pass is for.
-- Shape copied from 20260827090000; keyed so a re-run is a no-op.
INSERT INTO "register_closures" ("id", "projectId", "registerKey")
SELECT gen_random_uuid()::text, p."id", 'generalRestrictedCaution'
FROM "projects" p
WHERE NOT EXISTS (
  SELECT 1 FROM "register_closures" rc
  WHERE rc."projectId" = p."id" AND rc."registerKey" = 'generalRestrictedCaution'
);

INSERT INTO "register_closure_sign_offs" ("id", "closureId", "role")
SELECT gen_random_uuid()::text, rc."id", role."name"
FROM "register_closures" rc
CROSS JOIN (VALUES ('Review owner'), ('Co-sign')) AS role("name")
WHERE rc."registerKey" = 'generalRestrictedCaution'
  AND NOT EXISTS (
    SELECT 1 FROM "register_closure_sign_offs" rcso
    WHERE rcso."closureId" = rc."id" AND rcso."role" = role."name"
  );
