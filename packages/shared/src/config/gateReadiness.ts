// Per-gate mandatory evidence & sign-offs (confirmed rule F1 / C7, 2026-07-21 —
// see docs/Business_Rules_Confirmation_EN.md appendix and docs/Response.txt).
//
// The team confirmed a RISK-BASED, 3-tier model instead of "all 37 registers
// must be complete for every project":
//   - Mandatory  — hard-blocks gate passage.
//   - Conditional — becomes mandatory (and hard-blocks) only when its trigger
//                   applies (product type, user, market, claim, change).
//   - Supporting  — may be incomplete without blocking; surfaces as a warning.
//
// Each requirement declares HOW the app evaluates it (`check`):
//   - Auto-evaluable checks (registerNoBadRows / skincareForTwo / nextActionsClosed)
//     read live project data. A Mandatory auto-check that fails is a HARD BLOCK
//     (fed into gateBlockers()); a Conditional one blocks only when its trigger
//     is active; a Supporting one only warns.
//   - `manual` checks have no linked data source yet — the exact register/field
//     mapping is the input we're confirming with the team (Round 2, docs/
//     Business_Rules_Followup_Round2.md §B). They are SHOWN on the Gate
//     Readiness panel for owner confirmation but do NOT hard-block until a data
//     source is wired, so we never invent enforcement we can't actually verify.
//
// The item text is transcribed verbatim from the team's per-gate answer; the
// tiering follows their "hard blocks for mandatory safety/regulatory/PIF/claim/
// release evidence; supporting information warns" instruction.

export type ReadinessTier = 'Mandatory' | 'Conditional' | 'Supporting';

// Named triggers that turn a Conditional requirement on for a given project.
export type ReadinessTrigger = 'skincareForTwo';

export type ReadinessCheck =
  // No linked data source yet — displayed for confirmation, never hard-blocks.
  | { kind: 'manual' }
  // No row of `register` may hold a `column` value in `badValues`
  // (e.g. Prohibited_Ingredients with no "REVIEW"/"Prohibited - remove" rows).
  | { kind: 'registerNoBadRows'; register: string; column: string; badValues: string[] }
  // Reuses the maternal + infant-contact safety completion logic (rule C1).
  | { kind: 'skincareForTwo' }
  // Reuses the open-next-actions logic (rule B2).
  | { kind: 'nextActionsClosed' }
  // F14: every Formula BOM line is either from Cosmetri or a manual line that
  // has been reconciled to a controlled Cosmetri formula (no "Draft - Not
  // Reconciled" lines remain).
  | { kind: 'bomReconciled' }
  // Reads a specific `ProjectData.gateChecks` row (Key Gate Checks table) by
  // its exact (gate, check) pair — satisfied when that row is done+Y, or
  // NA+justified (same rule already used for phase-level keyChecksDone).
  // Mapping confirmed 2026-07-22: see docs/F1_Gate_Readiness_Mapping_Proposal.md.
  | { kind: 'gateCheckDone'; gate: string; check: string }
  // Minimum-bar guard on a Phase checklist section (`ProjectData.checklists[section]`,
  // e.g. targetUsers/targetMarkets/targetArea): satisfied once at least one row
  // has `status === 'Y'` — i.e. the section has actually been engaged with, not
  // left at its seeded/empty state. Deliberately NOT a "section is fully
  // complete" check (that would require inventing cardinality rules nobody has
  // confirmed) — this only catches the case where a coarse Key Gate Check row
  // was marked done without ever touching the underlying detail section.
  | { kind: 'checklistHasSelection'; section: string }
  // Same minimum-bar idea as checklistHasSelection, but for a `mode:'register'`
  // register (user-added rows, e.g. Supplier_RM_Evidence) instead of a
  // checklist section: satisfied once at least one row has been added.
  | { kind: 'registerHasRows'; register: string }
  // Formula BOM has at least one line — the minimum bar for "an ingredient
  // set exists", regardless of Cosmetri reconciliation (that's a separate,
  // later F14 requirement at Gate 7/10/11 via `bomReconciled`).
  | { kind: 'bomHasLines' }
  // Every existing BOM line has an ingredient identity (`inciName`) recorded.
  // Deliberately does NOT require a Cosmetri reference — F14 confirmed manual
  // BOM lines are allowed during development, reconciliation is only
  // mandatory before Gate 7.
  | { kind: 'bomIdentityComplete' }
  // Every row of a `mode:'register'` register has a non-empty value in the
  // given column — generalized version of bomIdentityComplete for any
  // register/column, e.g. Supplier_RM_Evidence's `inciName` at Gate 4 (the
  // register that actually owns per-ingredient identity there — Formula_BOM
  // belongs to Gate 5, see the Prohibited_Ingredients/ASEAN_PIF_Map
  // linkedGate tags in registers.ts).
  | { kind: 'registerColumnFilled'; register: string; column: string }
  // A specific `ProjectData.requirements[section]` row (fixed rows from
  // phases.ts's requirementSections, e.g. Phase 2's "Target pH / pH range")
  // has status === 'Completed'. Unlike ChecklistItem/GateCheck, RequirementItem
  // has no Y/N/NA — WorkStatus has no "not applicable, justified" escape — so
  // only use this for rows that are universally applicable at that gate.
  | { kind: 'requirementDone'; section: string; requirement: string };

export interface ReadinessRequirement {
  id: string;
  label: string;
  tier: ReadinessTier;
  check: ReadinessCheck;
  // Conditional requirements are only active (and only able to block) when this
  // trigger applies to the project.
  trigger?: ReadinessTrigger;
}

// Keyed by gate id (SG01..SG12). Every gate additionally requires a
// Prepared / Reviewed / Approved sign-off — that is enforced at PHASE-closure
// level (see phaseCompletionChecklist in utils/gateProgress.ts), so it is not
// duplicated as a per-gate row here.
export const GATE_READINESS: Record<string, ReadinessRequirement[]> = {
  SG01: [
    {
      id: 'sg01-request',
      label: 'Product request record',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Product request, opportunity and requester captured' },
    },
    {
      id: 'sg01-owner',
      label: 'Project owner',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Initial project record opened and owner assigned' },
    },
    {
      id: 'sg01-source',
      label: 'Request source',
      tier: 'Mandatory',
      // Reuses the same Key Gate Check as sg01-request — "...requester
      // captured" already covers where the request came from. No separate
      // data source exists for this item alone (see the mapping doc).
      check: { kind: 'gateCheckDone', gate: '01', check: 'Product request, opportunity and requester captured' },
    },
    {
      // Not one of the 5 named items in the F1 Appendix, but this row was
      // ALREADY mandatory before F1 existed — rule B3 requires every Key Gate
      // Check done/justified before its phase can close. Wiring it here only
      // moves that same already-confirmed requirement earlier (gate-level
      // instead of phase-level); it does not invent a new rule, so this did
      // not need a separate SME question the way sg01-scope/sg01-market-user
      // did.
      id: 'sg01-constraints',
      label: 'Initial constraints, known deadlines and risk flags recorded',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Initial constraints, known deadlines and risk flags recorded' },
    },
    // sg01-scope / sg01-market-user: still `manual` — no matching field exists
    // yet (the closest Key Gate Check row is semantically different, and the
    // only market/user checklist is tagged Gate 02, not Gate 01). Open
    // questions for the subject-matter team — see
    // docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg01-scope', label: 'Initial product scope', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg01-market-user', label: 'Initial target market and user', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG02: [
    // sg02-brief: still `manual` — no field represents "the brief" anywhere
    // (not a Key Gate Check, not a checklist section, not on Project
    // Identification). Open question — see docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg02-brief', label: 'Approved development brief', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg02-user',
      label: 'Target user and life stage',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '02', check: 'Target user / life stage / use context selected' },
    },
    {
      // Extra guard alongside sg02-user: the coarse Key Gate Check row could be
      // marked done without the detailed Target Users checklist ever being
      // touched. This does not replace sg02-user — both must be satisfied.
      id: 'sg02-user-detail',
      label: 'Target user and life stage — detailed selection recorded',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'targetUsers' },
    },
    {
      id: 'sg02-use',
      label: 'Intended use and body area',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg02-user — "...use context
      // selected" already covers this; no separate signal exists.
      check: { kind: 'gateCheckDone', gate: '02', check: 'Target user / life stage / use context selected' },
    },
    {
      id: 'sg02-use-detail',
      label: 'Intended use and body area — detailed selection recorded',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'targetArea' },
    },
    {
      id: 'sg02-markets',
      label: 'Selected markets',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '02', check: 'Target markets and success criteria linked' },
    },
    {
      id: 'sg02-markets-detail',
      label: 'Selected markets — detailed selection recorded',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'targetMarkets' },
    },
    // sg02-vulnerable: still `manual` — genuinely ambiguous whether this means
    // "the target-user checklist has been reviewed at all" (same signal as
    // sg02-user, which would make this a 3rd reuse of the same evidence) or a
    // distinct, per-item check against `checklists['targetUsers']`. Open
    // question — see docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg02-vulnerable', label: 'Vulnerable-user flags', tier: 'Mandatory', check: { kind: 'manual' } },
    // sg02-requirements: still `manual` — PHASE_1.requirementSections is
    // empty (config/phases.ts), so there is no requirement-table data at all
    // for Phase 1, unlike Phases 2-4. Open question — see
    // docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg02-requirements', label: 'Project requirements and exclusions', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints:
      // this Key Gate Check row was already mandatory-in-effect via B3
      // (phase close), just not yet enforced at its own gate.
      id: 'sg02-commercial',
      label: 'Commercial planning inputs entered or marked N/A',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '02', check: 'Commercial planning inputs entered or marked N/A' },
    },
  ],
  SG03: [
    {
      id: 'sg03-concept',
      label: 'Product concept',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '03', check: 'Concept direction and benchmark/competitor review recorded' },
    },
    {
      id: 'sg03-claims',
      label: 'Proposed claims list',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '03', check: 'Claim/benefit areas selected and evidence route identified' },
    },
    {
      id: 'sg03-claims-detail',
      label: 'Proposed claims list — detailed selection recorded',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'claimAreas' },
    },
    // sg03-classification: still `manual` — no field represents a claim's
    // classification (e.g. cosmetic / functional / medical-adjacent) anywhere;
    // `claimAreas` only lists benefit wording, not a risk/classification tier.
    // Open question — see docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg03-classification', label: 'Preliminary claim classification', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg03-evidence-reqs',
      label: 'Evidence requirements identified for each proposed claim',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg03-claims — "...evidence route
      // identified" already covers this.
      check: { kind: 'gateCheckDone', gate: '03', check: 'Claim/benefit areas selected and evidence route identified' },
    },
    {
      id: 'sg03-evidence-reqs-detail',
      label: 'Evidence requirements identified for each proposed claim — detailed selection recorded',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'evidenceRoute' },
    },
    {
      id: 'sg03-benchmark',
      label: 'Competitor or benchmark review where applicable',
      tier: 'Conditional',
      // Shares the same Key Gate Check as sg03-concept — the row's own
      // wording already bundles "benchmark/competitor review". Conditional
      // tier means this only ever warns, never hard-blocks, so reusing the
      // same evidence carries no extra risk.
      check: { kind: 'gateCheckDone', gate: '03', check: 'Concept direction and benchmark/competitor review recorded' },
    },
    // sg03-reg-claims: still `manual` — depends on a "high-risk/borderline
    // claim" flag that doesn't exist yet (same open question as Round 2's A1
    // "critical" definition). Low priority: Conditional tier means this can
    // never hard-block even once wired. Open question — see
    // docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg03-reg-claims', label: 'Regulatory review of high-risk or borderline claims', tier: 'Conditional', check: { kind: 'manual' } },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints /
      // sg02-commercial.
      id: 'sg03-decision',
      label: 'Gate 1-3 decision and open actions recorded',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '03', check: 'Gate 1-3 decision and open actions recorded' },
    },
  ],
  SG04: [
    {
      // Formula_BOM is NOT the right source at Gate 4 — registers.ts tags it
      // `linkedGate: '05_Formula_BOM_Costing'` ("Formula_BOM must be
      // current"), and every Prohibited_Ingredients row is tagged
      // '04_Ingredient_Screening'. At Gate 4 the ingredient set lives in
      // Supplier_RM_Evidence (candidate materials being screened), not the
      // locked formula recipe — that only exists from Gate 5 onward.
      id: 'sg04-ingredients',
      label: 'Formula ingredients or intended ingredient set',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '04', check: 'Ingredient functions identified and RM document pack requested' },
    },
    // No separate detail check for sg04-ingredients — it would be identical
    // to sg04-supplier-detail below (both read Supplier_RM_Evidence), since
    // this app has no separate "candidate ingredient list" data structure.
    {
      id: 'sg04-identity',
      label: 'Ingredient identity and Cosmetri reference where available',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg04-ingredients — no separate
      // signal for "identity" specifically exists.
      check: { kind: 'gateCheckDone', gate: '04', check: 'Ingredient functions identified and RM document pack requested' },
    },
    {
      id: 'sg04-identity-detail',
      label: 'Ingredient identity — every Supplier/RM Evidence row has an identity recorded',
      tier: 'Mandatory',
      // Cosmetri reference deliberately NOT required here — F14 allows manual
      // reconciliation pre-Gate 7. Just checks an identity (inciName) exists
      // per candidate ingredient row.
      check: { kind: 'registerColumnFilled', register: 'supplierRmEvidence', column: 'inciName' },
    },
    {
      id: 'sg04-supplier',
      label: 'Supplier and raw-material evidence status',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '04', check: 'Ingredient evidence / registry links added or gap actions opened' },
    },
    {
      id: 'sg04-supplier-detail',
      label: 'Supplier and raw-material evidence — at least one record added',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'supplierRmEvidence' },
    },
    {
      // Second detail guard on the same F1 item — Raw Material Document Pack
      // (phases.ts, gate '04') is a separate checklist from Supplier_RM_Evidence
      // (which document TYPES exist, e.g. Specification/CoA/SDS/TDS) and was
      // missed when Gate 4 was first wired; both must show real engagement.
      id: 'sg04-supplier-detail-docs',
      label: 'Supplier and raw-material evidence — Raw Material Document Pack has at least one selection',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'rmDocPack' },
    },
    {
      id: 'sg04-prohibited-screen',
      label: 'Prohibited and restricted ingredient screen',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '04', check: 'Restrictions, exclusions and supplier risks screened' },
    },
    {
      id: 'sg04-no-remove',
      label: 'No unresolved "Prohibited - remove" findings',
      tier: 'Mandatory',
      // Auto-evaluated hard block: the confirmed C7 example (Gate 04 side).
      check: { kind: 'registerNoBadRows', register: 'prohibitedIngredients', column: 'productStatus', badValues: ['Prohibited - remove'] },
    },
    {
      id: 'sg04-pb-screen',
      label: 'Pregnancy/breastfeeding caution screen',
      tier: 'Conditional',
      trigger: 'skincareForTwo',
      // Conditional tier — only ever warns, never hard-blocks, so reusing the
      // same registerNoBadRows pattern as sg04-no-remove carries low risk.
      check: {
        kind: 'registerNoBadRows',
        register: 'pbCautionLimits',
        column: 'productStatus',
        badValues: ['Needs Safety Review', 'Needs Regulatory Review'],
      },
    },
    // sg04-allergen: still `manual` — Supplier_RM_Evidence's allergen/impurity
    // columns are free text, no status enum to check against; defining "has
    // this been reviewed" would mean inventing a rule nobody confirmed. Low
    // priority: Conditional tier never hard-blocks. Open question — see
    // docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg04-allergen', label: 'Allergen, impurity and contaminant review where relevant', tier: 'Conditional', check: { kind: 'manual' } },
  ],
  SG05: [
    {
      id: 'sg05-version',
      label: 'Current formula version',
      tier: 'Mandatory',
      // project.formulaVersion is always non-empty from project creation
      // (factory seeds "F1.0"), so a field-present check would be vacuously
      // true — the real "work has started" signal is this Key Gate Check.
      check: { kind: 'gateCheckDone', gate: '05', check: 'Formula route, BOM and costing started' },
    },
    {
      // Relocated here from Gate 4 (2026-07-22) — Formula_BOM is tagged
      // `linkedGate: '05_Formula_BOM_Costing'` in registers.ts ("Formula_BOM
      // must be current"), i.e. the locked recipe belongs to Gate 5, not
      // Gate 4's candidate-ingredient screening.
      id: 'sg05-composition',
      label: 'Formula composition or controlled Cosmetri formula reference',
      tier: 'Mandatory',
      check: { kind: 'bomHasLines' },
    },
    {
      id: 'sg05-composition-detail',
      label: 'Formula composition — every BOM line has an identity recorded',
      tier: 'Mandatory',
      // Cosmetri reference not required here either — F14 allows manual
      // lines pre-Gate 7.
      check: { kind: 'bomIdentityComplete' },
    },
    {
      id: 'sg05-ph',
      label: 'Target pH and acceptable pH range',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
    },
    {
      id: 'sg05-ph-detail',
      label: 'Target pH and acceptable pH range — requirement row completed',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Target pH / pH range' },
    },
    {
      id: 'sg05-process',
      label: 'Manufacturing/process requirements affecting product function',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg05-ph — its own wording already
      // bundles "pH/process limits".
      check: { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
    },
    {
      id: 'sg05-process-detail',
      label: 'Manufacturing/process requirements — requirement row completed',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Scale-up or manufacturing notes' },
    },
    // sg05-preservative: still `manual` — none of Phase 2's requirement rows
    // are preservative-specific, and the trigger ("where applicable") has no
    // defined condition (same open gap as Gates 5/9's preservative items in
    // the mapping doc). Conditional — never hard-blocks. Open question — see
    // docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg05-preservative', label: 'Preservative strategy where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    {
      id: 'sg05-compatibility',
      label: 'Formula compatibility assessment',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg05-ph/sg05-process.
      check: { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
    },
    {
      id: 'sg05-compatibility-detail',
      label: 'Formula compatibility assessment — requirement row completed',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Compatibility / use-with constraints' },
    },
    {
      id: 'sg05-efficacy',
      label: 'Initial efficacy rationale and mechanism-of-action mapping',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'efficacyProcess', requirement: 'Mechanism-to-formula route' },
    },
    // sg05-costing: still `manual` — CostingInputs has no status field and is
    // always pre-filled with non-blank defaults from project creation, so
    // there's no non-invented "has this been considered" signal. Supporting
    // tier — never hard-blocks regardless.
    { id: 'sg05-costing', label: 'Costing or commercial feasibility status', tier: 'Supporting', check: { kind: 'manual' } },
    {
      // Not an F1-named item — same generalizable rule as prior gates' extra
      // rows (sg01-constraints, sg02-commercial, sg03-decision).
      id: 'sg05-decision',
      label: 'Development decision recorded with evidence or conditions',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '05', check: 'Development decision recorded with evidence or conditions' },
    },
  ],
  SG06: [
    { id: 'sg06-pack-spec', label: 'Proposed pack specification', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg06-compatibility', label: 'Packaging compatibility requirements', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg06-artwork', label: 'Label and artwork requirements', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg06-supplier', label: 'Component supplier status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg06-market-pack', label: 'Market-specific pack requirements', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg06-evidence-link', label: 'Link to controlled packaging evidence', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  // Gate 7 is a safety-critical hard block.
  SG07: [
    { id: 'sg07-final-safety', label: 'Final formulation safety review completed', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg07-bom-reconciled',
      label: 'Formula BOM reconciled to a controlled Cosmetri formula (no "Draft - Not Reconciled" lines)',
      tier: 'Mandatory',
      // F14: manual composition must be reconciled before Gate 7 final safety.
      check: { kind: 'bomReconciled' },
    },
    {
      id: 'sg07-prohibited-closed',
      label: 'Prohibited ingredient screen closed (no "REVIEW" / "Prohibited - remove" rows)',
      tier: 'Mandatory',
      // Auto-evaluated hard block: the headline C7 example (Gate 07 side).
      check: {
        kind: 'registerNoBadRows',
        register: 'prohibitedIngredients',
        column: 'productStatus',
        badValues: ['REVIEW - possible formula match', 'Prohibited - remove', 'Needs Regulatory Review'],
      },
    },
    { id: 'sg07-caution-closed', label: 'Restricted/caution ingredient assessment closed', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg07-exposure', label: 'Exposure and intended-use assessment', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg07-allergen', label: 'Allergen and impurity review', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg07-maternal-infant',
      label: 'Maternal and infant-contact assessment (when Skincare for Two is triggered)',
      tier: 'Conditional',
      // Auto-evaluated: reuses the existing C1 maternal/infant completion logic.
      check: { kind: 'skincareForTwo' },
      trigger: 'skincareForTwo',
    },
    { id: 'sg07-conclusion', label: 'Safety conclusion and identified limitations', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg07-reviewer', label: 'Required safety reviewer approval', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg07-no-critical', label: 'No unresolved critical safety finding', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG08: [
    { id: 'sg08-plan', label: 'Testing plan', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg08-methods', label: 'Test methods or method references', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg08-acceptance', label: 'Acceptance criteria', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg08-required-tests', label: 'Required safety, efficacy, preservative, QC and performance testing identified', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg08-human-study', label: 'Human-study approval workflow completed before participant recruitment, where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg08-reports', label: 'Test reports or controlled actions for tests still in progress', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG09: [
    { id: 'sg09-stability', label: 'Stability status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg09-pack-compat', label: 'Packaging compatibility status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg09-pet', label: 'Preservative efficacy status where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg09-acceptance', label: 'Physical, chemical and microbiological acceptance criteria', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg09-scaleup', label: 'Scale-up or pilot status where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg09-deviations', label: 'Deviations and open risks reviewed', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg09-conclusion', label: 'Release-readiness conclusion', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  // Gate 10 is a market-specific hard block (requirements repeat per market).
  SG10: [
    { id: 'sg10-checklist', label: 'Applicable regulatory checklist (per market)', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg10-cosmetri-formula',
      label: 'Uses the controlled Cosmetri formula (no unreconciled manual BOM lines)',
      tier: 'Mandatory',
      // F14: Gates 10/11 must use the controlled Cosmetri formula and version.
      check: { kind: 'bomReconciled' },
    },
    { id: 'sg10-dossier', label: 'PIF, CPSR, Product Master File or equivalent market dossier status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-claims-register', label: 'SKU-level claims register', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-claim-evidence', label: 'Evidence attached or linked for every approved product claim', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-safety-evidence', label: 'Ingredient and product safety evidence attached', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-performance-evidence', label: 'Product-performance evidence attached where relevant', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg10-artwork', label: 'Label and artwork review', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-published-info', label: 'Published information status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg10-reg-approval', label: 'Regulatory approval', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  // Gate 11 is a market-specific hard block.
  SG11: [
    { id: 'sg11-gate10', label: 'Gate 10 complete for the relevant market', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-gmp', label: 'GMP document links', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-formula', label: 'Approved current formula version', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg11-cosmetri-formula',
      label: 'Uses the controlled Cosmetri formula (no unreconciled manual BOM lines)',
      tier: 'Mandatory',
      // F14: Gates 10/11 must use the controlled Cosmetri formula and version.
      check: { kind: 'bomReconciled' },
    },
    { id: 'sg11-artwork', label: 'Approved artwork version', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-production', label: 'Production readiness', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-release-pathway', label: 'Quality release pathway', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-changes-closed', label: 'Change controls closed or formally accepted', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-published-approved', label: 'Published product information approved', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg11-launch', label: 'Launch approval', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG12: [
    { id: 'sg12-feedback', label: 'Market feedback', tier: 'Supporting', check: { kind: 'manual' } },
    { id: 'sg12-complaints', label: 'Complaint and adverse-event status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg12-pv-pms', label: 'PV/PMS review where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg12-performance', label: 'Product-performance feedback', tier: 'Supporting', check: { kind: 'manual' } },
    { id: 'sg12-capa', label: 'CAPA or improvement actions', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg12-change-links', label: 'Change-control links', tier: 'Supporting', check: { kind: 'manual' } },
  ],
};
