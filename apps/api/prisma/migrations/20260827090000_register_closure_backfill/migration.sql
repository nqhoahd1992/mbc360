-- Register closing (2026-08-27) scaffolds a RegisterClosure + 2
-- RegisterClosureSignOff rows ('Review owner', 'Co-sign') per register for a
-- brand-new project (project-scaffold.ts), but a project created before this
-- migration has none — verify:scaffold caught it immediately on the existing
-- demo project (68 registers, all missing). Same shape as
-- 20260810041500/20260811071500: backfill every EXISTING project from the
-- same list a new project reads, generated with `npx tsx -e` against
-- REGISTER_CONFIGS/gateRefHighestGateId rather than hand-typed, to avoid
-- transcribing 68 keys by hand and getting one wrong.
--
-- Two steps, in order, so a partially-run backfill (or a project that
-- somehow already has SOME of these) is safe to re-apply:
--   1. one RegisterClosure row per (project, register);
--   2. two blank RegisterClosureSignOff rows per closure.

INSERT INTO "register_closures" ("id", "projectId", "registerKey")
SELECT gen_random_uuid()::text, p."id", r."key"
FROM "projects" p
CROSS JOIN (VALUES
  ('formulationSafetyProfile'),
  ('formulationSafetyMatrix'),
  ('criticalSafetyFindings'),
  ('formulationSafetyFinalSignOff'),
  ('supplierRmEvidence'),
  ('prohibitedIngredients'),
  ('pbCautionLimits'),
  ('ingredientSubstitution'),
  ('eyeSafetyEvidence'),
  ('fragranceSafety'),
  ('fragranceAllergenLog'),
  ('microPetEvidence'),
  ('stabilityRelease'),
  ('potencyProcessControl'),
  ('mechanismClaimsMap'),
  ('twinkle5ClaimsMap'),
  ('efficacyAssurance'),
  ('functionalEfficacy'),
  ('clinicalHumanEvidence'),
  ('studyProtocolSetup'),
  ('studyParticipantLog'),
  ('efficacyStudyPlan'),
  ('packagingSpecsArtwork'),
  ('artworkChangeControl'),
  ('formulaChangeControl'),
  ('aseanPifMap'),
  ('regulatoryChecklistStatus'),
  ('pifChecklistAsean'),
  ('pifEvidenceExport'),
  ('skuClaimsPifRegister'),
  ('pifEvidenceClosure'),
  ('publicationRules'),
  ('publishedInfoApproval'),
  ('medicalSummary'),
  ('hcpEfficacyAnswer'),
  ('hcpTestReportPack'),
  ('batchFormulaTrace'),
  ('productFamilyRegister'),
  ('formulationChangeRegister'),
  ('developmentBrief'),
  ('vulnerableUserAssessment'),
  ('gmpLinks'),
  ('campaignsSocialMedia'),
  ('productDevelopmentProfile'),
  ('productDevelopmentIterations'),
  ('productDevelopmentFeedback'),
  ('releasedLabelRegister'),
  ('labelPlatformRollout'),
  ('labelShipmentVerification'),
  ('needsExecutiveBrief'),
  ('needsResearchQuestions'),
  ('needsLiteratureSearchMethod'),
  ('needsAnatomyExposureNotes'),
  ('needsTechnologyTraceability'),
  ('needsSignOff'),
  ('carrierEmollientReview'),
  ('carrierReviewSummary'),
  ('competitorLandscape'),
  ('competitorTestingProtocol'),
  ('currentSolutionsStandardOfCare'),
  ('competitorLandscapeSummary'),
  ('targetProductProfile'),
  ('backbonePlatformTechnology'),
  ('targetProductSignOff'),
  ('evidencePlanProspective'),
  ('evidenceTestProtocol'),
  ('claimEvidenceTraceability'),
  ('ingredientMonograph')
) AS r("key")
WHERE NOT EXISTS (
  SELECT 1 FROM "register_closures" rc
  WHERE rc."projectId" = p."id" AND rc."registerKey" = r."key"
);

INSERT INTO "register_closure_sign_offs" ("id", "closureId", "role")
SELECT gen_random_uuid()::text, rc."id", role."name"
FROM "register_closures" rc
CROSS JOIN (VALUES ('Review owner'), ('Co-sign')) AS role("name")
WHERE NOT EXISTS (
  SELECT 1 FROM "register_closure_sign_offs" rcso
  WHERE rcso."closureId" = rc."id" AND rcso."role" = role."name"
);
