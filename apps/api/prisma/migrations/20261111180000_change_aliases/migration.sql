-- Round 5 question 11: one master controlled-change record (the CHG) with the numbers other books used for it kept as aliases.
-- Additive: existing changes start with no alias, and an existing FC- row simply has no master yet, which the readers flag rather than hide.
ALTER TABLE "change_records" ADD COLUMN "aliasIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
