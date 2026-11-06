-- An acknowledgement now records the project facts it stood on (Round 5 question 1(c): a material change to target users, formula,
-- markets or the rationale invalidates it). The facts are the Gate 02 target users and family-use age groups, the markets and the
-- major formula version, written as one string by acknowledgementBasis.
--
-- Rows from before this column hold an empty string and keep being judged by their wording, as they always were: there is no
-- honest basis to write for an acknowledgement given before it was recorded, and deleting them would discard real decisions.
ALTER TABLE "readiness_acknowledgements" ADD COLUMN "basis" TEXT NOT NULL DEFAULT '';
