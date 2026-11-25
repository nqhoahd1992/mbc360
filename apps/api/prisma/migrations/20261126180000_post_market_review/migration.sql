-- Round 5 question 22: a post-market record carries its own triage (category, significance, reviewer, escalation decision), the assessment of a
-- performance finding (assessment, conclusion, evidence, impact on claims and quality, Change Control decision) and how its corrective work was
-- closed (verified, or an open action accepted with a due date). Additive and empty: nothing is invented, so an existing record simply has no triage
-- until a person gives it, which the Gate 12 item then says.
ALTER TABLE "capa_records" ADD COLUMN "category" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "significance" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "reviewer" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "escalation" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "assessment" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "conclusion" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "evidenceLink" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "impactNote" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "changeDecision" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "changeId" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "verifiedBy" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "verifiedAt" DATE;
ALTER TABLE "capa_records" ADD COLUMN "acceptedOpenBy" TEXT;
ALTER TABLE "capa_records" ADD COLUMN "acceptedOpenDue" DATE;
