-- Round 5 question 9: a Low or Medium gap resolved before signing records its resolution and evidence (the evidence is the existing gapEvidenceLink).
-- Additive; an existing gap simply has no resolution recorded, which is the correct state for a control that did not exist yesterday.
ALTER TABLE "gate_records" ADD COLUMN "gapResolution" TEXT;
