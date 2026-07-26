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
  | { kind: 'requirementDone'; section: string; requirement: string }
  // NPD Front-End Roadmap (v2 workbook, 2026-07-24): every row of a
  // `mode:'fixed'` register has a non-empty value in EVERY listed column —
  // a direct generalization of registerColumnFilled (single column) to
  // multiple columns, used to express "this fixed-role sign-off register
  // (e.g. needsSignOff/targetProductSignOff) has name AND date filled for
  // every role" as ONE clean Mandatory item instead of two awkwardly-split
  // single-column items.
  | { kind: 'registerRowsComplete'; register: string; columns: string[] }
  // A `ProjectIdentity` field is non-empty — for fields that are REQUIRED on
  // the Create New Project form (ProjectList.tsx), so this is really "was the
  // project created at all" rather than a per-gate task; used where a Gate
  // 01 F1 item duplicates data the project can never actually be missing
  // (e.g. Project Lead/owner, required to create the project in the first
  // place — see 2026-07-25 sg01-owner fix).
  | { kind: 'identityFieldFilled'; field: 'projectLead' };

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
      // Project Lead is a REQUIRED field on the Create New Project form
      // itself (ProjectList.tsx) — a project cannot exist without one, so
      // this can never actually be missing by the time Gate 01 is being
      // worked. Previously reused the "Initial project record opened and
      // owner assigned" Key Gate Check row, which made the user manually
      // re-confirm something the project creation flow already guarantees.
      id: 'sg01-owner',
      label: 'Project owner',
      tier: 'Mandatory',
      check: { kind: 'identityFieldFilled', field: 'projectLead' },
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
    {
      // Gate 02 brief must name the product type — at least one Product Type
      // option selected (2026-07-23, user-requested). Mandatory, so it hard-
      // blocks the gate decision (Proceed / Proceed with Conditions alike),
      // like the other core brief selections above.
      id: 'sg02-product-type',
      label: 'Product type — at least one selected',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'productType' },
    },
    {
      id: 'sg02-vulnerable',
      label: 'Vulnerable-user flags',
      tier: 'Mandatory',
      // Wired 2026-07-26 to the target-user checklist, which IS where the
      // vulnerable-user flags live (Pregnancy / Breastfeeding / Postpartum /
      // Infant 0+ / Sensitive skin / Cancer patient support / …). The open
      // question was whether this is a 3rd reuse of sg02-user's evidence or a
      // distinct per-item check; reusing it is the same shared-evidence pattern
      // already used at sg01-request / sg01-source, and a per-item cardinality
      // rule ("which flags must be answered") is not something to invent.
      check: { kind: 'checklistHasSelection', section: 'targetUsers' },
    },
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
    // NPD Front-End Roadmap (v2 workbook, 2026-07-24, expert-authored, treated
    // as confirmed — no further SME round needed): Step 1 ("Define the NEEDS
    // and the scientific basis") is mandatory before formula work and its
    // sign-off gate is SG02. Reused again at SG05 (see below) since the
    // Roadmap also holds Formula BOM until Steps 1-3 are signed off.
    {
      id: 'sg02-npd-needs-content',
      label: 'Needs & Scientific Basis — research questions recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'needsResearchQuestions' },
    },
    {
      id: 'sg02-npd-needs-signoff',
      label: 'Needs & Scientific Basis dossier signed off (name + date, all 3 roles)',
      tier: 'Mandatory',
      check: { kind: 'registerRowsComplete', register: 'needsSignOff', columns: ['name', 'date'] },
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
    // NPD Front-End Roadmap (v2 workbook, 2026-07-24): Step 2 ("Map
    // COMPETITORS & current existing solutions"), sign-off gate SG03. This is
    // a STRICTER companion signal to sg03-benchmark above (a real purchased-
    // sample register, not just a checkbox) — not a duplicate. Reused at SG05
    // (Formula BOM hard-blocked pending Steps 1-3).
    {
      id: 'sg03-npd-competitor-content',
      label: 'Competitor & current-solution landscape recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'competitorLandscape' },
    },
    // Step 3 (Target Product Profile + Backbone Technology) is only a
    // non-blocking visibility nudge at SG03 — the sheet's own text states the
    // hard requirement is "before formula lock (Gate 5)", so the actual
    // Mandatory block lives at SG05, not here.
    {
      id: 'sg03-npd-target-product-progress',
      label: 'Target Product Profile in progress',
      tier: 'Supporting',
      // targetProductProfile is a `mode:'fixed'` register — its 7 attribute
      // rows are seeded at project creation regardless of user input, so
      // `registerHasRows` would be vacuously always true. `registerColumnFilled`
      // on 'target' (the "aim" column, blank until actually answered) is the
      // real signal.
      check: { kind: 'registerColumnFilled', register: 'targetProductProfile', column: 'target' },
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
    {
      id: 'sg04-allergen',
      label: 'Allergen, impurity and contaminant review where relevant',
      tier: 'Conditional',
      // Wired 2026-07-26. The columns are free text, so this only asserts they
      // are NOT EMPTY for every screened material — a minimum-bar "has this been
      // filled in" guard, not a judgement on the content (that would be
      // inventing a rule). registerRowsComplete is non-vacuous, so an untouched
      // register does not pass. Conditional tier: warns, never hard-blocks.
      check: { kind: 'registerRowsComplete', register: 'supplierRmEvidence', columns: ['allergenStatement', 'impurities'] },
    },
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
    // NPD Front-End Roadmap (v2 workbook, 2026-07-24, expert-authored, treated
    // as confirmed): "Formula work HELD until Steps 1-3 are signed off" —
    // Gate 5 (Formula BOM lock) is hard-blocked until Needs & Scientific
    // Basis, Competitor Landscape and Target Product & Tech are all complete/
    // signed off, plus the Step 4 prospective evidence plan (agree BEFORE
    // formula lock). This is the actual "hold formula work" enforcement the
    // Roadmap describes; sg02-npd-*/sg03-npd-competitor-content above are the
    // earlier, per-step checkpoints reusing the same underlying registers.
    {
      id: 'sg05-npd-needs-signoff',
      label: 'Needs & Scientific Basis dossier signed off (name + date, all 3 roles)',
      tier: 'Mandatory',
      check: { kind: 'registerRowsComplete', register: 'needsSignOff', columns: ['name', 'date'] },
    },
    {
      id: 'sg05-npd-competitor-content',
      label: 'Competitor & current-solution landscape recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'competitorLandscape' },
    },
    {
      id: 'sg05-npd-target-product-content',
      label: 'Target Product Profile recorded',
      tier: 'Mandatory',
      // Same registerColumnFilled reasoning as sg03-npd-target-product-progress
      // above — targetProductProfile's fixed rows always exist, so `target`
      // (blank until answered) is the real signal, not registerHasRows.
      check: { kind: 'registerColumnFilled', register: 'targetProductProfile', column: 'target' },
    },
    {
      id: 'sg05-npd-target-product-signoff',
      label: 'Target Product & Tech Platform signed off (name + date, all 3 roles)',
      tier: 'Mandatory',
      check: { kind: 'registerRowsComplete', register: 'targetProductSignOff', columns: ['name', 'date'] },
    },
    {
      id: 'sg05-npd-evidence-plan',
      label: 'Prospective evidence plan recorded (agree before formula lock)',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'evidencePlanProspective' },
    },
  ],
  // Gate 6 wired 2026-07-26 (previously 0 of 5 Mandatory items enforced — the
  // gate could be passed with no packaging evidence at all). Same method as
  // Gates 1-5: the Key Gate Check row is the primary signal (it already has a
  // confirmed done/Y-N-NA + justified-NA rule), paired with a minimum-bar
  // "has this actually been touched" guard on the underlying register/checklist.
  // No new cardinality rules invented.
  SG06: [
    {
      id: 'sg06-pack-spec',
      label: 'Proposed pack specification',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '06', check: 'Packaging format and component requirements selected' },
    },
    {
      id: 'sg06-pack-spec-detail',
      label: 'Proposed pack specification — at least one component recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'packagingSpecsArtwork' },
    },
    {
      id: 'sg06-compatibility',
      label: 'Packaging compatibility requirements',
      tier: 'Mandatory',
      // The row's own wording bundles "pack compatibility triggers".
      check: { kind: 'gateCheckDone', gate: '06', check: 'Artwork/label needs and pack compatibility triggers identified' },
    },
    {
      id: 'sg06-compatibility-detail',
      label: 'Packaging compatibility — compatibility evidence recorded per component',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'packagingSpecsArtwork', column: 'compatibilityEvidence' },
    },
    {
      id: 'sg06-artwork',
      label: 'Label and artwork requirements',
      tier: 'Mandatory',
      // Shares the Key Gate Check above ("Artwork/label needs …"); the distinct
      // signal is the artwork trigger checklist below.
      check: { kind: 'checklistHasSelection', section: 'artworkTriggers' },
    },
    {
      id: 'sg06-artwork-version',
      label: 'Label and artwork — artwork version recorded per component',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'packagingSpecsArtwork', column: 'artworkVersion' },
    },
    {
      id: 'sg06-supplier',
      label: 'Component supplier status',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '06', check: 'Packaging cost, lead time and supplier approval requirements entered' },
    },
    {
      id: 'sg06-supplier-detail',
      label: 'Component supplier — supplier named for every component',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'packagingSpecsArtwork', column: 'supplier' },
    },
    {
      id: 'sg06-market-pack',
      label: 'Market-specific pack requirements',
      tier: 'Conditional',
      check: { kind: 'checklistHasSelection', section: 'packagingOptions' },
    },
    {
      id: 'sg06-evidence-link',
      label: 'Link to controlled packaging evidence',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'packagingSpecsArtwork', column: 'specLink' },
    },
  ],
  // Gate 7 is a safety-critical hard block.
  // Gate 7 wired 2026-07-26. Earlier judged "needs an SME threshold first"; that
  // was too cautious — the workbook already ships the exact surface for it in
  // `formulationSafetyFinalSignOff` (mode:'fixed', 10 seeded safety questions:
  // Formula identity locked, Toxicology / safety assessment, Pregnancy /
  // breastfeeding, Baby-contact / nipple-use, Preservation / microbiology,
  // Impurities / heavy metals, Fragrance / allergen, Stability / compatibility,
  // Label warnings / directions, Final safety release) plus a per-ingredient
  // `formulationSafetyMatrix`. Because that register is `fixed` with 10 seeded
  // rows it can never be vacuously satisfied.
  SG07: [
    {
      id: 'sg07-final-safety',
      label: 'Final formulation safety review completed',
      tier: 'Mandatory',
      // Every one of the 10 Final Safety Sign-off questions must be Completed.
      // `status` (not evidenceLink) because that column carries the register's
      // own done/outstanding semantics.
      check: {
        kind: 'registerNoBadRows',
        register: 'formulationSafetyFinalSignOff',
        column: 'status',
        badValues: ['Not Started', 'In Progress', 'On Hold', 'Backtracked'],
      },
    },
    {
      id: 'sg07-matrix-rows',
      label: 'Formulation safety matrix — every formula ingredient assessed',
      tier: 'Mandatory',
      // Guards the three per-column matrix checks below: `.every()` over an empty
      // register is vacuously true, so the row-count check has to be Mandatory too.
      check: { kind: 'registerHasRows', register: 'formulationSafetyMatrix' },
    },
    {
      id: 'sg07-safety-questions',
      label: 'Safety/tolerance questions defined and vulnerable-user risks reviewed',
      tier: 'Mandatory',
      // Not an F1-named item — already mandatory-in-effect via B3, same pattern
      // as sg01-constraints.
      check: { kind: 'gateCheckDone', gate: '07', check: 'Safety/tolerance questions defined and vulnerable-user risks reviewed' },
    },
    {
      id: 'sg07-restrictions-linked',
      label: 'Restrictions, conditions and safety evidence linked',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '07', check: 'Restrictions, conditions and safety evidence linked' },
    },
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
    {
      id: 'sg07-caution-closed',
      label: 'Restricted/caution ingredient assessment closed',
      tier: 'Mandatory',
      // Resolves the open question in F1_Per_Gate_Open_Questions.md ("at Gate 7
      // should this apply to EVERY project, not just Skincare-for-Two ones?") by
      // following the appendix literally: the Gate 7 item is Mandatory and
      // unconditional, unlike sg04-pb-screen which is Conditional on the
      // skincareForTwo trigger. Every row must be resolved to "Not present" or
      // "Within limit - evidence linked".
      check: {
        kind: 'registerNoBadRows',
        register: 'pbCautionLimits',
        column: 'productStatus',
        badValues: [
          'Not assessed',
          'Exceeds limit - reformulate',
          'Needs Safety Review',
          'Needs Regulatory Review',
        ],
      },
    },
    {
      id: 'sg07-exposure',
      label: 'Exposure and intended-use assessment',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'formulationSafetyMatrix', column: 'exposureRationale' },
    },
    {
      id: 'sg07-allergen',
      label: 'Allergen and impurity review',
      tier: 'Mandatory',
      // registerRowsComplete (not two registerColumnFilled items) because it is
      // one review covering both columns, and this kind is non-vacuous by design.
      check: { kind: 'registerRowsComplete', register: 'formulationSafetyMatrix', columns: ['allergenIfra', 'impurityProof'] },
    },
    {
      id: 'sg07-maternal-infant',
      label: 'Maternal and infant-contact assessment (when Skincare for Two is triggered)',
      tier: 'Conditional',
      // Auto-evaluated: reuses the existing C1 maternal/infant completion logic.
      check: { kind: 'skincareForTwo' },
      trigger: 'skincareForTwo',
    },
    {
      id: 'sg07-conclusion',
      label: 'Safety conclusion and identified limitations',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'formulationSafetyMatrix', column: 'safetyDecision' },
    },
    {
      id: 'sg07-reviewer',
      label: 'Required safety reviewer approval',
      tier: 'Mandatory',
      // Answers the other open question ("a separate GATE-level sign-off, or is
      // the phase-level Prepared/Reviewed/Approved block enough?"): the workbook
      // already provides a gate-level one — Final Safety Sign-off carries `owner`
      // and `decisionDate` per question — so that is used rather than reusing the
      // phase block, and the phase-level sign-off stays a separate B3 condition.
      check: { kind: 'registerRowsComplete', register: 'formulationSafetyFinalSignOff', columns: ['owner', 'decisionDate'] },
    },
    {
      id: 'sg07-no-critical',
      label: 'No unresolved critical safety finding',
      tier: 'Mandatory',
      // Shares sg07-final-safety's check on purpose: there is no separate
      // "critical finding" flag anywhere, and "every safety question Completed —
      // including the 'Final safety release' row" IS the absence of an unresolved
      // critical finding. Same shared-evidence pattern as sg01-request /
      // sg01-source. Flagged rather than hidden: if the team wants a distinct
      // critical-finding field, that is a config addition, not a rule change.
      check: {
        kind: 'registerNoBadRows',
        register: 'formulationSafetyFinalSignOff',
        column: 'status',
        badValues: ['Not Started', 'In Progress', 'On Hold', 'Backtracked'],
      },
    },
  ],
  // Gate 8 wired 2026-07-26. `evidenceTestProtocol` (gate '08') carries
  // testMethod / acceptanceLimit / reportLink per test, and the existing
  // sg08-npd-evidence-protocol (registerHasRows on the same register) is the
  // non-vacuous guard for the three per-column checks below.
  SG08: [
    {
      id: 'sg08-plan',
      label: 'Testing plan',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '08', check: 'Testing families selected and methods/protocols referenced' },
    },
    {
      id: 'sg08-methods',
      label: 'Test methods or method references',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'evidenceTestProtocol', column: 'testMethod' },
    },
    {
      id: 'sg08-acceptance',
      label: 'Acceptance criteria',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '08', check: 'Acceptance criteria, results and CAPA pathway defined' },
    },
    {
      id: 'sg08-acceptance-detail',
      label: 'Acceptance criteria — an acceptance limit on every planned test',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'evidenceTestProtocol', column: 'acceptanceLimit' },
    },
    {
      id: 'sg08-required-tests',
      label: 'Required safety, efficacy, preservative, QC and performance testing identified',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'testingFamilies' },
    },
    {
      id: 'sg08-human-study',
      label: 'Human-study approval workflow completed before participant recruitment, where applicable',
      tier: 'Conditional',
      // Phase 3's humanStudy requirement section is tagged gate '08' and has an
      // "Approval trail" row — the C2 study-approval workflow's own checkpoint.
      check: { kind: 'requirementDone', section: 'humanStudy', requirement: 'Approval trail' },
    },
    {
      id: 'sg08-reports',
      label: 'Test reports or controlled actions for tests still in progress',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '08', check: 'Validation report linked or placeholder/action used' },
    },
    {
      id: 'sg08-reports-detail',
      label: 'Test reports — a report link on every planned test',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'evidenceTestProtocol', column: 'reportLink' },
    },
    // NPD Front-End Roadmap (v2 workbook, 2026-07-24): Step 4's detailed test
    // protocol ("complete once prototype exists — Gate 8"), distinct from
    // sg08-human-study above (a different, existing workflow).
    {
      id: 'sg08-npd-evidence-protocol',
      label: 'Detailed test protocol recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'evidenceTestProtocol' },
    },
  ],
  // Gate 9 wired 2026-07-26 (previously 0 of 5 Mandatory items enforced). Phase 3
  // has a real requirement section for exactly this gate
  // (PHASE_3.requirementSections 'stabilityRelease', all rows gate '09'), so most
  // items map to a specific requirement row rather than a coarse gate check.
  SG09: [
    {
      id: 'sg09-stability',
      label: 'Stability status',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '09', check: 'Stability, preservation/micro and pack compatibility program selected' },
    },
    {
      id: 'sg09-stability-detail',
      label: 'Stability status — stability program requirement completed',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Stability program selected' },
    },
    {
      id: 'sg09-stability-evidence',
      label: 'Stability status — at least one stability/release result recorded',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'stabilityRelease' },
    },
    {
      id: 'sg09-pack-compat',
      label: 'Packaging compatibility status',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Pack compatibility assessed' },
    },
    {
      id: 'sg09-pet',
      label: 'Preservative efficacy status where applicable',
      tier: 'Conditional',
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Preservation / microbiology checks selected' },
    },
    {
      id: 'sg09-acceptance',
      label: 'Physical, chemical and microbiological acceptance criteria',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '09', check: 'Pilot/scale-up and release criteria assessed' },
    },
    {
      id: 'sg09-acceptance-detail',
      label: 'Acceptance criteria — recorded against every stability/release row',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'stabilityRelease', column: 'acceptanceCriteria' },
    },
    {
      id: 'sg09-scaleup',
      label: 'Scale-up or pilot status where applicable',
      tier: 'Conditional',
      // Shares the Key Gate Check above — its own wording covers "Pilot/scale-up".
      check: { kind: 'gateCheckDone', gate: '09', check: 'Pilot/scale-up and release criteria assessed' },
    },
    {
      id: 'sg09-deviations',
      label: 'Deviations and open risks reviewed',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '09', check: 'Release readiness risks closed or conditionally accepted' },
    },
    {
      id: 'sg09-conclusion',
      label: 'Release-readiness conclusion',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Release readiness risks closed' },
    },
    {
      id: 'sg09-retest-pathway',
      label: 'Retest or CAPA pathway defined',
      tier: 'Mandatory',
      // Not an F1-named item — same generalizable rule as sg01-constraints: this
      // requirement row was already mandatory-in-effect via B3 (phase close).
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Retest or CAPA pathway defined' },
    },
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
    // Partially wired 2026-07-26: the PIF/claims/published-info items map onto
    // registers and Phase 4 requirement rows that already exist. The two items
    // that are genuinely PER MARKET (regulatory approval, and Gate 10 completion
    // at Gate 11) stay `manual` — they live in `marketTracks`, whose per-market
    // gating is follow-up F4, and a project-level check would either pass with
    // one market approved or block with one market pending. Not guessed.
    {
      id: 'sg10-dossier',
      label: 'PIF, CPSR, Product Master File or equivalent market dossier status',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'dossierEvidence', requirement: 'PIF/CPSR export-ready' },
    },
    {
      id: 'sg10-pif-mapped',
      label: 'ASEAN PIF mapped',
      tier: 'Mandatory',
      // Not an F1-named item — already mandatory-in-effect via B3, same as
      // sg01-constraints; wiring it here only enforces it earlier.
      check: { kind: 'requirementDone', section: 'dossierEvidence', requirement: 'ASEAN PIF mapped' },
    },
    {
      id: 'sg10-claims-register',
      label: 'SKU-level claims register',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'skuClaimsPifRegister' },
    },
    {
      id: 'sg10-claim-evidence',
      label: 'Evidence attached or linked for every approved product claim',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'skuClaimsPifRegister', column: 'evidenceLink' },
    },
    {
      id: 'sg10-safety-evidence',
      label: 'Ingredient and product safety evidence attached',
      tier: 'Mandatory',
      check: { kind: 'requirementDone', section: 'dossierEvidence', requirement: 'Product Safety Summary' },
    },
    {
      id: 'sg10-performance-evidence',
      label: 'Product-performance evidence attached where relevant',
      tier: 'Conditional',
      check: { kind: 'requirementDone', section: 'dossierEvidence', requirement: 'Efficacy evidence summary' },
    },
    {
      id: 'sg10-artwork',
      label: 'Label and artwork review',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'packagingSpecsArtwork', column: 'approval' },
    },
    {
      id: 'sg10-published-info',
      label: 'Published information status',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'publishedInfoApproval' },
    },
    // sg10-reg-approval: still `manual` — per-market (marketTracks.regulatoryStatus),
    // needs F4. See docs/F1_Per_Gate_Open_Questions.md.
    { id: 'sg10-reg-approval', label: 'Regulatory approval', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  // Gate 11 is a market-specific hard block.
  SG11: [
    // sg11-gate10: still `manual` — per-market, same F4 dependency as
    // sg10-reg-approval below it.
    { id: 'sg11-gate10', label: 'Gate 10 complete for the relevant market', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg11-gmp',
      label: 'GMP document links',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'gmpLinks' },
    },
    {
      id: 'sg11-gmp-link',
      label: 'GMP document links — a link recorded on every entry',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'gmpLinks', column: 'link' },
    },
    {
      id: 'sg11-formula',
      label: 'Approved current formula version',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '11', check: 'Final formula/version, packaging and artwork approved' },
    },
    {
      id: 'sg11-cosmetri-formula',
      label: 'Uses the controlled Cosmetri formula (no unreconciled manual BOM lines)',
      tier: 'Mandatory',
      // F14: Gates 10/11 must use the controlled Cosmetri formula and version.
      check: { kind: 'bomReconciled' },
    },
    {
      id: 'sg11-artwork',
      label: 'Approved artwork version',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'releasedLabelRegister' },
    },
    {
      id: 'sg11-production',
      label: 'Production readiness',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '11', check: 'Production records ready and GMP links added' },
    },
    {
      id: 'sg11-production-detail',
      label: 'Production readiness — production/launch records selected',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'productionRecords' },
    },
    {
      id: 'sg11-release-pathway',
      label: 'Quality release pathway',
      tier: 'Mandatory',
      check: { kind: 'registerColumnFilled', register: 'stabilityRelease', column: 'releaseDecision' },
    },
    // sg11-changes-closed: still `manual`. An open change control record already
    // soft-locks the gate through a DIFFERENT mechanism (F9/C4 — openChangesForGate
    // in the gate-decision guard), so adding a readiness check here would either
    // duplicate it or contradict it. Left for the SME round.
    { id: 'sg11-changes-closed', label: 'Change controls closed or formally accepted', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      id: 'sg11-published-approved',
      label: 'Published product information approved',
      tier: 'Mandatory',
      // C6/F11: no row may still be short of a released/approved workflow state.
      check: {
        kind: 'registerNoBadRows',
        register: 'publishedInfoApproval',
        column: 'workflowState',
        badValues: [
          'Draft',
          'Evidence Gathering',
          'Technical Review',
          'Regulatory Review Required',
          'Revision Required',
          'Final Approval Pending',
        ],
      },
    },
    // sg11-launch: still `manual` — per-market (marketTracks.launchApproval, already
    // hard-blocked per market by C5 in MarketTrackingCard/setMarketTracks). F4.
    { id: 'sg11-launch', label: 'Launch approval', tier: 'Mandatory', check: { kind: 'manual' } },
  ],
  // Gate 12 wired 2026-07-26 (previously 0 of 2 Mandatory items enforced).
  // Deliberately NOT requiring a CAPA record to exist: a product with no
  // complaints legitimately has no CAPA, so requiring a row would block a clean
  // project. The Key Gate Check is the right mechanism precisely because it has
  // the NA-with-justification escape.
  SG12: [
    {
      id: 'sg12-feedback',
      label: 'Market feedback',
      tier: 'Supporting',
      check: { kind: 'checklistHasSelection', section: 'postMarketSources' },
    },
    {
      id: 'sg12-complaints',
      label: 'Complaint and adverse-event status',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '12', check: 'Complaints/issues triaged and CAPA/improvement actions assigned' },
    },
    {
      id: 'sg12-pv-pms',
      label: 'PV/PMS review where applicable',
      tier: 'Conditional',
      check: { kind: 'gateCheckDone', gate: '12', check: 'Feedback sources monitored and PV/PMS signals classified' },
    },
    {
      id: 'sg12-performance',
      label: 'Product-performance feedback',
      tier: 'Supporting',
      // Shares the feedback-source checklist — Supporting tier only warns.
      check: { kind: 'checklistHasSelection', section: 'postMarketSources' },
    },
    {
      id: 'sg12-capa',
      label: 'CAPA or improvement actions',
      tier: 'Mandatory',
      // Shares the same Key Gate Check as sg12-complaints — its own wording
      // already covers "CAPA/improvement actions assigned", and no separate
      // signal exists that would not wrongly demand a CAPA record.
      check: { kind: 'gateCheckDone', gate: '12', check: 'Complaints/issues triaged and CAPA/improvement actions assigned' },
    },
    {
      id: 'sg12-change-links',
      label: 'Change-control links',
      tier: 'Supporting',
      check: { kind: 'gateCheckDone', gate: '12', check: 'Loopback to NPD or change control recorded where needed' },
    },
  ],
};
