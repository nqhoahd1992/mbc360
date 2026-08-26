-- Register-row signatures (2026-08-26).
--
-- The single-use step-up proof is no longer spent only on a phase SignOff: a
-- register `signature` column (first use: Formulation Change Register's
-- "NP sign-off", previously a free-text name box) spends one too, marked with a
-- `register:<project>:<registerKey>:<row>:<column>` string. The column keeps its
-- meaning — "what this proof was spent on" — so this is a rename, not a new
-- column, and existing rows carry over untouched.
ALTER TABLE "step_up_proofs" RENAME COLUMN "usedForSignOffId" TO "usedForId";
