// Round 5 question 31 (SME answer, 2026-11-05): register-by-register applicability of the 78 registers.
//
// The SME's definitions: "Required" means a substantive assessment / record, or a valid link to approved reusable evidence. "Conditional" requires a
// documented applicability decision. "Reference" means controlled reference content; it does not require duplicate project signatures. Existing evidence
// may be reused where its version and applicability are confirmed. A claim-free product still needs safety, stability, microbiological-risk and
// manufacturing evidence ("No claims" waives only claim-specific registers and activities, after checking the label, website and other intended material).
//
// This file is the one table: what each register is (`rule`), what the SME wrote for it (`note`, verbatim where short), the gate at which the applicability
// is asked for (`gate`, the earliest gate the SME names), and what may stand in for entries (`decisions`). The rules are read by `utils/registerApplicability.ts`
// (the engine, server and screen alike) and the gate items are generated from `gate` below. Our readings are `[ASSUMPTION: R6-Q39]`.
export type ApplicabilityRule = 'Required' | 'Scope-dependent' | 'Conditional' | 'Reference' | 'Optional' | 'Event record' | 'Own rules';

// What a person may record INSTEAD of entries. 'reuse' = a link to approved reusable evidence whose version and applicability are confirmed; 'na' = a reviewed
// "not applicable" with its rationale.
export type ApplicabilityDecision = 'Reuse approved record' | 'Not applicable';
export const APPLICABILITY_DECISIONS: readonly ApplicabilityDecision[] = ['Reuse approved record', 'Not applicable'];

export interface RegisterApplicabilitySpec {
  rule: ApplicabilityRule;
  // The SME's "When / what satisfies it", as they wrote it.
  note: string;
  // The gate at which a decision or entries are needed, when this table adds an item for it. Registers already read by an existing readiness item have none.
  gate?: string;
  // What may stand in for entries. Empty = entries only.
  decisions: readonly ('reuse' | 'na')[];
  // A "not applicable" is accepted only for a verified administrative-only project (the SME's "justified administrative-only waiver"; a blank change type is not one).
  naNeedsAdministrativeOnly?: boolean;
  // The register that already carries its own applicability record, so this table adds nothing (claims → "no claims" record; the per-market registers).
  ownRecord?: string;
}

const R = (note: string, gate: string | undefined, decisions: RegisterApplicabilitySpec['decisions'], extra: Partial<RegisterApplicabilitySpec> = {}): RegisterApplicabilitySpec => ({
  rule: 'Required', note, gate, decisions, ...extra,
});
const C = (note: string, gate: string | undefined, decisions: RegisterApplicabilitySpec['decisions'] = ['reuse', 'na'], extra: Partial<RegisterApplicabilitySpec> = {}): RegisterApplicabilitySpec => ({
  rule: 'Conditional', note, gate, decisions, ...extra,
});
const REF = (note: string): RegisterApplicabilitySpec => ({ rule: 'Reference', note, decisions: [] });

export const REGISTER_APPLICABILITY: Record<string, RegisterApplicabilitySpec> = {
  // ---- Group A — 13 registers --------------------------------------------------------------------------------------------------------------
  developmentBrief: R('Gate 2; include change scope for an administrative project.', undefined, []),
  needsResearchQuestions: { rule: 'Scope-dependent', note: 'Gate 2 for development or scientific changes. Administrative-only work may link the approved baseline and record no new question.', decisions: ['reuse', 'na'], naNeedsAdministrativeOnly: true },
  vulnerableUserAssessment: R('Gate 2; an explicit reviewed "none identified" is a valid conclusion.', undefined, []),
  competitorLandscape: C('Gate 3 for new/repositioned/benchmark-led work; reviewed reuse or justified administrative-only waiver allowed. Blank change type is not a waiver.', undefined, ['reuse', 'na'], { naNeedsAdministrativeOnly: true }),
  supplierRmEvidence: R('Gate 4 for selected materials; update at Gate 6. Reuse approved current records where applicable.', undefined, ['reuse']),
  evidencePlanProspective: R('Gate 5; includes safety/quality/stability even without efficacy claims. Administrative work can link the approved plan with no-new-testing rationale.', undefined, ['reuse']),
  packagingSpecsArtwork: R('Gate 6 specifications; Gate 10 approval. Link approved unchanged packaging where appropriate.', undefined, ['reuse']),
  formulationSafetyMatrix: R('Gate 7; cover the final formula and relevant exposures.', undefined, []),
  evidenceTestProtocol: { rule: 'Required', note: 'Required for applicable testing. Gate 8 before new testing; use approved linked protocols/reports for accepted existing evidence. No new claim test is needed solely because this register exists.', decisions: ['reuse'] },
  stabilityRelease: R('Gate 9 technical evidence; Gate 11 authorisation. An accepted existing baseline can be linked for an unaffected administrative change.', undefined, ['reuse']),
  publishedInfoApproval: R('Gates 10-11 for planned external material, including label/instructions. Existing approvals can be linked when unchanged.', undefined, ['reuse']),
  gmpLinks: R('Gate 11; current manufacturing/Quality release pathway and linked controlled evidence.', undefined, []),
  releasedLabelRegister: R('Gate 11 initial approved baseline; record comparison and subsequent market reconciliation. "No previous label" is valid for first launch.', undefined, []),

  // ---- Group A2 — 1 register ---------------------------------------------------------------------------------------------------------------
  regulatoryChecklistStatus: { rule: 'Required', note: 'Required per-market conclusion. Gate 10. Non-ASEAN components use this register. ASEAN can link the shared PIF checklist/map, with country-specific confirmation and local additions; no duplicate checklist solely for form.', decisions: [], ownRecord: 'regulatoryChecklistStatus' },

  // ---- Group B — 2 registers (claims) ------------------------------------------------------------------------------------------------------
  claimEvidenceTraceability: { rule: 'Conditional', note: 'Gate 3 onwards if claims proposed; explicit reviewed "no claims" permits no claim rows.', decisions: ['na'] },
  skuClaimsPifRegister: { rule: 'Conditional', note: 'Gate 10 for every active claim/use. The verified no-claims conclusion can waive claim rows, not the PIF or publication controls.', decisions: [], ownRecord: 'noClaims' },

  // ---- Group C — 2 registers ---------------------------------------------------------------------------------------------------------------
  generalRestrictedCaution: { rule: 'Required', note: 'Assessment required; findings may be empty. Gate 4 screen and Gate 7 closure. Explicit reviewed no-issues conclusion if no findings.', decisions: [], ownRecord: 'keyGateCheck' },
  criticalSafetyFindings: { rule: 'Conditional', note: 'Conditional findings log. Gate 7 and later when findings arise. The final safety assessment confirms whether any findings remain.', decisions: [], ownRecord: 'finalSafetySignOff' },

  // ---- Group D — 31 fixed-row / reference sheets -------------------------------------------------------------------------------------------
  pifChecklistAsean: { rule: 'Conditional', note: 'Conditional required. Gate 10 for ASEAN market use; common evidence plus local requirements.', decisions: [], ownRecord: 'aseanMarket' },
  formulationSafetyFinalSignOff: { rule: 'Required', note: 'Required screen. Gate 7 final formula; Gate 10 confirms current applicable approved safety version.', decisions: [], ownRecord: 'finalSafetySignOff' },
  pbCautionLimits: { rule: 'Conditional', note: 'Conditional required. Gate 4 screen and Gate 7 closure where maternal use/contact applies; otherwise reviewed N/A.', decisions: [], ownRecord: 'skincareForTwo' },
  prohibitedIngredients: { rule: 'Required', note: 'Gate 4 all relevant rows; Gate 7 closure. Not a substitute for full market screening.', decisions: [], ownRecord: 'watchlist' },
  studyProtocolSetup: { rule: 'Conditional', note: 'Conditional required. Before human-study recruitment/testing at Gate 8; no human study requires a recorded applicability decision.', decisions: [], ownRecord: 'humanStudyPlanned' },
  targetProductProfile: { rule: 'Required', note: 'Gate 3 initial scope; Gate 5 agreed specifications. Reuse baseline for an unaffected administrative change.', decisions: [], ownRecord: 'targetProductProfile' },
  aseanPifMap: C('Conditional required. Gate 10 for ASEAN use; each required section must resolve to current evidence or approved N/A.', 'SG10'),
  needsAnatomyExposureNotes: C('Required scientific basis where relevant. Gate 2 for new needs/use/exposure; link reviewed baseline for unchanged administrative work. Consider contradictory evidence.', 'SG02'),
  artworkChangeControl: REF('Reference. Trigger/approval rules; actual applicable changes recorded in CHG.'),
  backbonePlatformTechnology: C('Required for development choice. Gate 5; reference approved platform/equivalence where unchanged; administrative-only waiver allowed.', 'SG05', ['reuse', 'na'], { naNeedsAdministrativeOnly: true }),
  carrierReviewSummary: C('Conditional required. Gate 2/5 where carrier choice affects delivery, exposure or performance; reference approved baseline if unchanged.', 'SG02'),
  changeTemplates: REF('Reference. Controlled company form index.'),
  efficacyAssurance: C('Conditional required. Gate 5 planning and Gate 8 verification for efficacy/performance claims.', 'SG05'),
  evidenceHierarchyGrades: REF('Reference with enforced rules. Controlled hierarchy; checks applied at the decision gates in Question 34.'),
  templateIndex: REF('Required. Keep current company template versions; link templates used.'),
  formulaChangeControl: REF('Reference with enforced rules. Controlled trigger/approval rules; actual controlled changes use CHG.'),
  fragranceSafety: C('Required safety summary. Gate 4/7 when fragrance/aromatic materials or relevant allergen risks are present or changed.', 'SG04'),
  competitorLandscapeSummary: C('Required when scientific basis is used. Gate 3 for development/repositioning/benchmark decisions; may reuse approved administrative baseline.', 'SG03', ['reuse', 'na'], { naNeedsAdministrativeOnly: true }),
  competitorTestingProtocol: C('Conditional required. Before comparative testing used at Gates 3/8 or in claims; planned protocol initially, completed report later.', 'SG03'),
  currentSolutionsStandardOfCare: C('Conditional required. Gate 3 for the new need/positioning comparison; reviewed reuse for unchanged scope.', 'SG03', ['reuse', 'na'], { naNeedsAdministrativeOnly: true }),
  artworkLabelReviewChecklist: R('Gate 6 preliminary applicability; Gate 10 compliance; complete before Gate 11 Final proof release.', 'SG06', []),
  evidenceSearchStandard: REF('Reference. Use versioned standard; linked search completeness checked per Question 34.'),
  needsLiteratureSearchMethod: R('Gate 2/3 initial search, before Gate 5 reliance, then update for final evidence/claims at Gate 10.', 'SG02', ['reuse']),
  medicalSummary: R('Required safety summary. Gate 10; may derive from approved safety assessment, with relevant market/population conclusions.', 'SG10', ['reuse']),
  pifEvidenceClosure: R('Required applicable closure. Gate 10 dossier completeness; Gate 11 confirms the approved version remains valid.', 'SG10', []),
  productDevelopmentProfile: R('Required. From project creation; exact product/formula/sample identity before Gates 4/5/8 evidence reliance.', 'SG04', []),
  formulationSafetyProfile: R('Required. Gate 7 final assessment and Gate 10 confirmed current summary; may derive from approved evidence.', 'SG07', ['reuse']),
  publicationRules: REF('Reference with enforced rules. Apply approval rules at Gates 10-11 and whenever external content is released.'),
  systemRequirements: REF('Reference. Company system rules; no project-specific fabricated answers.'),
  evidenceTransferabilityRules: REF('Reference with enforced rules. Apply to each evidence-to-need/claim inference under Question 34.'),
  twinkle5ClaimsMap: C('Conditional required. Gates 3 and 10 when that claim framework is used; otherwise explicit N/A.', 'SG03', ['na']),

  // ---- Group E — 29 activity-dependent registers ------------------------------------------------------------------------------------------
  carrierEmollientReview: C('Conditional required. Gate 2/5 when selecting/changing a carrier or emollient system relevant to safety/performance.', 'SG02'),
  medicalReadyAnswerPack: { rule: 'Event record', note: 'Conditional. Gate 10 before issuing the corresponding approved external information; may be generated from approved evidence.', decisions: [] },
  needsTechnologyTraceability: R('Required for development linkage. By Gate 5 for new/revised needs or technology; reviewed baseline link for administrative-only scope.', 'SG05', ['reuse', 'na'], { naNeedsAdministrativeOnly: true }),
  needsExecutiveBrief: { rule: 'Optional', note: 'Optional presentation. No extra gate block if the approved Development Brief contains the decision basis.', decisions: [] },
  mechanismClaimsMap: C('Conditional required. Gate 3 planning and Gate 10 final support when mechanism-based claims are proposed.', 'SG03'),
  campaignsSocialMedia: { rule: 'Event record', note: 'Conditional required. Before each campaign/content release, normally Gate 11; record earlier approved concept planning at Gate 3 if used.', decisions: [] },
  productDevelopmentIterations: { rule: 'Event record', note: 'Conditional record. Record trials/iterations at Gates 4/5/8 when they occur.', decisions: [] },
  ingredientMonograph: C('Conditional required. Gate 4/5 for new/PI/claim-driving or otherwise flagged ingredients. Approved material evidence can satisfy routine ingredient review without a duplicate monograph.', 'SG04'),
  ingredientSubstitution: { rule: 'Event record', note: 'Conditional required. Whenever substitution occurs; assess before Gate 4/7 acceptance and before controlled implementation.', decisions: [] },
  productDevelopmentFeedback: { rule: 'Event record', note: 'Conditional record. Record feedback/benchmark activity when used in a decision at Gates 4/5/8.', decisions: [] },
  formulationChangeRegister: { rule: 'Own rules', note: 'Conditional required view. Every controlled formula change; master CHG linkage and NP decision before implementation. See Questions 11 and 32.', decisions: [], ownRecord: 'changeControl' },
  potencyProcessControl: C('Conditional required. Gate 5 planned controls and Gate 8/9 verification for potency, critical process or scale-up risk.', 'SG05'),
  productFamilyRegister: R('Required identity baseline. By Gate 5/6; even a single product has an initial controlled identity/version. May be generated from master records.', 'SG05', ['reuse']),
  labelPlatformRollout: C('Conditional required. Gate 11 for relevant channel/stock transition; actual rollout events after authorisation. No stock transition needs a reviewed N/A.', 'SG11', ['na']),
  labelShipmentVerification: { rule: 'Event record', note: 'Conditional required. Before the first affected shipment and each relevant verification event. A future shipment is not required to have occurred before initial authorisation.', decisions: [] },
  eyeSafetyEvidence: C('Conditional required. Gate 7/8 when exposure/claims/risk trigger it; document the risk-based evidence choice or waiver.', 'SG07'),
  fragranceAllergenLog: C('Conditional required. Gate 4/7 when fragrance, allergens or relevant aromatic/impurity risks apply, including formula/supplier changes.', 'SG04'),
  clinicalHumanEvidence: C('Conditional required. Gate 8/10 when human evidence is generated or relied on; link approved external reports if reused.', 'SG08'),
  efficacyStudyPlan: C('Conditional required. Before Gate 8 efficacy work where a study is needed; no new study if existing evidence is accepted with rationale.', 'SG08'),
  functionalEfficacy: C('Conditional required. Gate 8/10 for claims requiring performance evidence; trace each claim to the actual report.', 'SG08'),
  microPetEvidence: { rule: 'Required', note: 'Required risk conclusion; testing conditional. Gate 9, with testing planned at Gate 8. PET/test waivers need a reviewed microbiological-risk basis.', gate: 'SG09', decisions: ['reuse', 'na'] },
  studyParticipantLog: C('Conditional required. Before/during applicable Gate 8 work; internal laboratory samples can use a sample-only trace without participant fields.', 'SG08', ['na']),
  hcpEfficacyAnswer: { rule: 'Event record', note: 'Conditional required. Before issuing an efficacy answer, after its evidence/claim review at Gate 10/11.', decisions: [] },
  hcpTestReportPack: { rule: 'Event record', note: 'Conditional required. Before issuing a report pack; only approved, correctly scoped reports/wording.', decisions: [] },
  pifEvidenceExport: { rule: 'Event record', note: 'Conditional event record. Whenever a PIF export is produced/shared; Gate 10 still needs a complete mapped dossier even without an export.', decisions: [] },
  publicationRecord: { rule: 'Event record', note: 'Conditional mandatory event record. For every actual print release/publication/deployment; link the approved version. Not demanded before the event has occurred.', decisions: [], ownRecord: 'publicationRecord' },
  batchFormulaTrace: R('Conditional mandatory production record. For every manufactured/released batch and SKU/pack allocation before its release/shipment. Gate 11 needs the traceability pathway; future batches are added when made.', 'SG11', ['reuse']),
  systemFeedback: { rule: 'Optional', note: 'Optional. System/process improvement feedback; no product gate block merely because none is submitted.', decisions: [] },
  testReportIndex: { rule: 'Conditional', note: 'Required when reports are relied on. By the gate using the reports; may be auto-generated from unique linked reports. No duplicate manual indexing.', gate: 'SG08', decisions: ['na'] },

  // ---- Registers this application adds beyond the SME's 78: each carries its own rules (Round 5 questions 20, 22, 26, 28, 30) ----------
  registerApplicability: { rule: 'Own rules', note: 'This register: where the requirement of a register is met by reusing an approved record or recorded as not applicable.', decisions: [], ownRecord: 'self' },
  marketPackChecklist: { rule: 'Own rules', note: 'Round 5 question 30: identified and assigned at Gate 6, verified at Gates 10 and 11.', decisions: [], ownRecord: 'marketPack' },
  deviationRecords: { rule: 'Own rules', note: 'Round 5 question 26: a record of something released without approval, or no longer valid.', decisions: [], ownRecord: 'deviations' },
  releaseAuthorisation: { rule: 'Own rules', note: 'Round 5 question 28: a standing authorisation to release per market and formula version.', decisions: [], ownRecord: 'releaseAuthorisation' },
  postMarketTrends: { rule: 'Own rules', note: 'Round 5 question 22: trends recorded beside the post-market records.', decisions: [], ownRecord: 'postMarket' },
};

// The registers for which a person may record an applicability decision, in the order the Applicability Decisions register offers them.
export function registersWithDecisions(): string[] {
  return Object.entries(REGISTER_APPLICABILITY)
    .filter(([, spec]) => spec.decisions.length > 0 && !spec.ownRecord)
    .map(([key]) => key);
}

// The registers a gate item is generated for (the SME's table, where no existing item reads the register).
export function applicabilityItemRegisters(): { register: string; gate: string }[] {
  return Object.entries(REGISTER_APPLICABILITY)
    .filter(([, spec]) => !!spec.gate)
    .map(([register, spec]) => ({ register, gate: spec.gate! }));
}
