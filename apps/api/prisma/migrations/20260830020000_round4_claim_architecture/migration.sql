-- Round 4 group 5 — claim architecture (questions 19, 26, 27, 30, 36a).
--
-- Almost all of this group is register COLUMNS, and register rows live in a JSON
-- column, so an absent key reads as empty — which is the correct starting state
-- for every one of them (no claim subjects recorded, no evidence basis declared,
-- no revision approved). Backfilling any of those would assert a judgement nobody
-- made.
--
-- Two things do need SQL.

-- 1. Question 27(b) — the four Regulatory review outcomes are re-capitalised to
-- match the reply exactly, and to match question 29's mandatory-comment list which
-- names the same three strings. Two lists holding "Approved with conditions" and
-- "Approved with Conditions" is how a comment rule silently stops firing.
--
-- A recorded outcome is a real reviewer decision, so it is RE-SPELLED rather than
-- cleared: the judgement is unchanged, only the transcription was wrong.
UPDATE "register_rows"
SET "data" = jsonb_set("data", '{regulatoryReviewOutcome}', '"Approved with Conditions"')
WHERE "registerKey" = 'claimEvidenceTraceability'
  AND "data" ->> 'regulatoryReviewOutcome' = 'Approved with conditions';

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{regulatoryReviewOutcome}', '"Not Approved"')
WHERE "registerKey" = 'claimEvidenceTraceability'
  AND "data" ->> 'regulatoryReviewOutcome' = 'Not approved';

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{regulatoryReviewOutcome}', '"Further Information Required"')
WHERE "registerKey" = 'claimEvidenceTraceability'
  AND "data" ->> 'regulatoryReviewOutcome' = 'Further information required';

-- 2. Question 30(d) adds a register — the Publication / Deployment record — and a
-- register carries a closing act (RegisterClosure + 2 blank sign-off rows,
-- scaffolded at project creation since 2026-08-27). Same defect class as every
-- other scaffolded row; verify:scaffold catches it, and this is the fix.
INSERT INTO "register_closures" ("id", "projectId", "registerKey")
SELECT gen_random_uuid()::text, p."id", 'publicationRecord'
FROM "projects" p
WHERE NOT EXISTS (
  SELECT 1 FROM "register_closures" rc
  WHERE rc."projectId" = p."id" AND rc."registerKey" = 'publicationRecord'
);

INSERT INTO "register_closure_sign_offs" ("id", "closureId", "role")
SELECT gen_random_uuid()::text, rc."id", role."name"
FROM "register_closures" rc
CROSS JOIN (VALUES ('Review owner'), ('Co-sign')) AS role("name")
WHERE rc."registerKey" = 'publicationRecord'
  AND NOT EXISTS (
    SELECT 1 FROM "register_closure_sign_offs" rcso
    WHERE rcso."closureId" = rc."id" AND rcso."role" = role."name"
  );
