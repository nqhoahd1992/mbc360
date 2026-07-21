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
  | { kind: 'bomReconciled' };

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
    { id: 'sg01-request', label: 'Product request record', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg01-owner', label: 'Project owner', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg01-source', label: 'Request source', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg01-scope', label: 'Initial product scope', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg01-market-user', label: 'Initial target market and user', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG02: [
    { id: 'sg02-brief', label: 'Approved development brief', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg02-user', label: 'Target user and life stage', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg02-use', label: 'Intended use and body area', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg02-markets', label: 'Selected markets', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg02-vulnerable', label: 'Vulnerable-user flags', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg02-requirements', label: 'Project requirements and exclusions', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  SG03: [
    { id: 'sg03-concept', label: 'Product concept', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg03-claims', label: 'Proposed claims list', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg03-classification', label: 'Preliminary claim classification', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg03-evidence-reqs', label: 'Evidence requirements identified for each proposed claim', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg03-benchmark', label: 'Competitor or benchmark review where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg03-reg-claims', label: 'Regulatory review of high-risk or borderline claims', tier: 'Conditional', check: { kind: 'manual' } },
  ],
  SG04: [
    { id: 'sg04-ingredients', label: 'Formula ingredients or intended ingredient set', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg04-identity', label: 'Ingredient identity and Cosmetri reference where available', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg04-supplier', label: 'Supplier and raw-material evidence status', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg04-prohibited-screen', label: 'Prohibited and restricted ingredient screen', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg04-no-remove',
      label: 'No unresolved "Prohibited - remove" findings',
      tier: 'Mandatory',
      // Auto-evaluated hard block: the confirmed C7 example (Gate 04 side).
      check: { kind: 'registerNoBadRows', register: 'prohibitedIngredients', column: 'productStatus', badValues: ['Prohibited - remove'] },
    },
    { id: 'sg04-pb-screen', label: 'Pregnancy/breastfeeding caution screen', tier: 'Conditional', check: { kind: 'manual' }, trigger: 'skincareForTwo' },
    { id: 'sg04-allergen', label: 'Allergen, impurity and contaminant review where relevant', tier: 'Conditional', check: { kind: 'manual' } },
  ],
  SG05: [
    { id: 'sg05-version', label: 'Current formula version', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-composition', label: 'Formula composition or controlled Cosmetri formula reference', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-ph', label: 'Target pH and acceptable pH range', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-process', label: 'Manufacturing/process requirements affecting product function', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-preservative', label: 'Preservative strategy where applicable', tier: 'Conditional', check: { kind: 'manual' } },
    { id: 'sg05-compatibility', label: 'Formula compatibility assessment', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-efficacy', label: 'Initial efficacy rationale and mechanism-of-action mapping', tier: 'Mandatory', check: { kind: 'manual' } },
    { id: 'sg05-costing', label: 'Costing or commercial feasibility status', tier: 'Supporting', check: { kind: 'manual' } },
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
