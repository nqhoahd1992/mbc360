// Per-gate mandatory evidence & sign-offs (confirmed rule F1 / C7, 2026-07-21 —
// see docs/rules/Business_Rules_Confirmation_EN.md appendix and docs/rounds/2026-07-21-sme-reply-F1-F14.txt).
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
// Conditional items only hard-block once their trigger applies (rule A1/A3).
// Adding one means: a value here, a branch in isReadinessTriggerActive(), a
// message in TRIGGER_INACTIVE_EXPLANATIONS (TypeScript enforces that one), and
// `trigger:` on the item. See docs/rules/F1_Conditional_Triggers.md for the
// full catalogue of 13, including the 9 still waiting on data the app does not
// capture yet.
export type ReadinessTrigger =
  | 'skincareForTwo'
  | 'humanStudyPlanned'
  | 'newOrRepositionedProject'
  | 'microbiologicallySusceptible';

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
  // Mapping confirmed 2026-07-22: see docs/archive/F1_Gate_Readiness_Mapping_Proposal.md.
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
  // A `ProjectIdentity` field is non-empty (2026-08-09, SME Round 3 B1/B2/B3).
  //
  // An earlier `identityFieldFilled` kind was DELETED on 2026-08-07 because its
  // only field, `projectLead`, is required on the Create New Project form — so
  // the check was vacuously satisfied by construction and could never block.
  // This kind is the same shape, and is only safe because the fields it reads
  // are deliberately OPTIONAL at creation (see the comment on those fields in
  // types/index.ts): someone has to go and fill them in for Gate 1 to pass.
  //
  // Before adding a field here, ask the question that killed the last one: can
  // this field ever actually be empty on a real project? If not, the check is
  // decoration, not enforcement.
  | { kind: 'identityFieldFilled'; field: 'initialScope' | 'initialTargetUsers' | 'initialTargetMarkets' }
  // A `FormulaProperties` field is non-empty. Same non-vacuity test as
  // `identityFieldFilled`: these fields start empty and only a person fills them.
  | { kind: 'formulaPropertyFilled'; field: 'microSusceptibility' | 'microRationale' }
  // A specific field on the Phase Gate Flow row itself (`ProjectData.gates`
  // entry for `gate`) is non-empty. This is NOT vacuous:
  // `owner`/`dueDate`/`evidenceLink`/`notes` on a gate record start
  // blank and are only filled in when someone actually does so — added
  // 2026-07-28 for Gate 7's "Prepared, reviewed and approved sign-off" (the
  // SME's own item), which the user confirmed means completing these fields
  // on the Gate 07 row itself, not a separate sign-off mechanism.
  | { kind: 'gateFieldFilled'; gate: string; field: 'owner' | 'dueDate' | 'evidenceLink' | 'notes' }
  // AND-composite: satisfied only when EVERY sub-check is satisfied. Merges
  // several signals into ONE readiness item so the panel shows exactly one
  // line per F1 appendix item, instead of a separate visible row per signal
  // (2026-07-26, user-requested — e.g. Gate 2's "Target user and life stage"
  // needs both the Key Gate Check ticked AND the underlying checklist
  // actually touched, but the appendix lists it as one item, not two).
  | { kind: 'allOf'; checks: ReadinessCheck[] };

// Where a requirement came from, when it ISN'T one of the SME's own named
// items in the confirmed F1 appendix (docs/rounds/2026-07-21-sme-reply-F1-F14.txt). Left undefined for
// the ~90 items that ARE named there — only the exceptions get tagged, so
// this stays true to the file's existing "flag it when it's not F1" comment
// convention rather than requiring every single item to restate the default.
// Used to group the readiness panel (2026-07-26, user-requested): the SME's
// own items render first, unmarked; anything else renders below a divider,
// labelled with exactly which of these it is.
export type ReadinessSource =
  // Not F1-named, but an existing Key Gate Check row already mandatory via
  // the SME-confirmed rule B3(b) ("every Key Gate Check must be Done/Y or
  // justified N/A before the phase can close") — wiring it at gate level
  // only enforces that same confirmed rule earlier, it invents nothing new.
  | 'b3'
  // From the "NPD Front-End Roadmap" sheet in the v2 workbook
  // (`MBc360 Master Product Development System File v2.xlsx`, 2026-07-24) —
  // expert-authored and treated as carrying the same confirmed authority as
  // the original V18 workbook (no separate SME round needed), per the note
  // in CLAUDE.md.
  | 'npd-roadmap'
  // Not in the F1 appendix, but confirmed by the team in an EARLIER round — the
  // F1–F14 answers of 2026-07-21 (e.g. F14, "manual composition must be
  // reconciled to the controlled Cosmetri formula before Gate 7"). Added
  // 2026-08-11: the F1 appendix is one document, not the whole rule set, and
  // labelling an F14 rule "not SME-confirmed" understated its authority.
  | 'f-series'
  // A judgment call by the project owner, not backed by any confirmed SME
  // rule or the newer workbook — e.g. Gate 2's Product Type requirement
  // (2026-07-23, user-requested). Every item carrying this MUST also declare
  // `assumption` — see the field below; `npm run verify:readiness` fails
  // otherwise, so an unconfirmed decision cannot sit in the panel unasked.
  | 'dev-decision';

export interface ReadinessRequirement {
  id: string;
  label: string;
  tier: ReadinessTier;
  check: ReadinessCheck;
  // Conditional requirements are only active (and only able to block) when this
  // trigger applies to the project.
  trigger?: ReadinessTrigger;
  // See `ReadinessSource` — omit for an item named in the F1 appendix itself.
  source?: ReadinessSource;
  // The open question this item's existence depends on (`'R4-Q20'`), defined in
  // docs/rules/F1_Per_Gate_Open_Questions.md. REQUIRED whenever
  // `source: 'dev-decision'`: such an item hard-blocks a gate on nothing but our
  // own reading, so it has to be on the list the SME can answer. Enforced by
  // `npm run verify:readiness` (sweep S4) rather than left to memory — the four
  // dev-decision items shipped for weeks with the panel truthfully labelling
  // them "not SME-confirmed" while none of them had ever been put to the team.
  assumption?: string;
}

// Keyed by gate id (SG01..SG12). Every gate's own F1 appendix list (docs/
// Response.txt) ends with the same line, "Prepared, reviewed and approved
// sign-off" — for years (until 2026-07-28) this was read as referring to the
// existing PHASE-closure sign-off (phaseCompletionChecklist's Prepared/
// Reviewed/Approved roles) and deliberately NOT duplicated as a per-gate row.
// User-corrected 2026-07-28: that phase-level block is per-PHASE (shared
// across several gates), which is a different thing from a per-GATE
// confirmation, and the appendix repeats the line at every single gate, not
// just once per phase — so each gate now gets its own `sgXX-signoff` item,
// checking that the GATE's own Phase Gate Flow row (Owner + Evidence link)
// has actually been filled in. The phase-level sign-off block is unchanged
// and remains a separate B3 condition.
export const GATE_READINESS: Record<string, ReadinessRequirement[]> = {
  SG01: [
    {
      id: 'sg01-request',
      label: 'Product request record',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Product request, opportunity and requester captured' },
    },
    {
      // Reversed 2026-07-26 (user-requested) back to its pre-2025-07-25
      // mapping: F1's "Project owner" IS the "Initial project record opened
      // and owner assigned" Key Gate Check row — not a separate concept.
      // The 2026-07-25 change (see git history) swapped this to a
      // `ProjectIdentity.projectLead` field check, reasoning that Project
      // Lead is a REQUIRED field on the Create New Project form so the row
      // could never really be unmet — but that conflated "the underlying
      // fact is guaranteed" with "the confirmation step is redundant". Every
      // other Key Gate Check row requires an explicit tick regardless of how
      // obvious the fact behind it is (e.g. "Product request... captured"
      // above); singling this one out to auto-pass was inconsistent. Reverted
      // to requiring the row itself to be Done+Y or NA+justified, exactly
      // like its two sibling rows. The `identityFieldFilled` check kind that
      // change introduced was deleted outright on 2026-08-07 once nothing
      // used it: reading a field the create form makes mandatory is
      // vacuously satisfied by construction, which is precisely the failure
      // mode the F1 verification passes exist to catch — leaving the kind
      // available invited a future item to reintroduce it. Use
      // `gateFieldFilled` for a genuinely field-only check.
      id: 'sg01-owner',
      label: 'Project owner',
      tier: 'Mandatory',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Initial project record opened and owner assigned' },
    },
    // sg01-source: back to `manual` (2026-07-26, user-challenged). Previously
    // reused sg01-request's Key Gate Check on the theory that "...requester
    // captured" already covers the request's source — but that was our own
    // guess, not backed by the workbook or the F1 appendix (which lists
    // "Product request record" and "Request source" as two separate lines
    // with no elaboration). Correctly challenged: if the team meant one
    // piece of evidence, they would have written one line. Reopened as a
    // question — see docs/rules/F1_Per_Gate_Open_Questions.md.
    {
      // Wired 2026-08-09 (SME Round 3 B1). The team confirmed this IS distinct
      // from the requester, and supplied the exact 16-option list now in
      // REQUEST_ORIGIN_OPTIONS — closing the guess that had been reverted here.
      //
      // Reads the `requestOrigin` CHECKLIST section (2026-08-10), not an identity
      // field: B1 gave an option list, and the workbook records an option list as
      // a table with per-option owner / status / evidence / rationale. Satisfied
      // by one row at status Y, the same bar as every other checklist-backed item
      // [ASSUMPTION: R4-Q19].
      id: 'sg01-source',
      label: 'Request source',
      tier: 'Mandatory',
      check: { kind: 'checklistHasSelection', section: 'requestOrigin' },
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
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '01', check: 'Initial constraints, known deadlines and risk flags recorded' },
    },
    {
      // Wired 2026-08-09 (SME Round 3 B2), replacing `manual`. Three signals in
      // one line: the new Key Gate Check row must be ticked, AND the two pieces
      // of scope detail behind it must actually be recorded. The Key Gate Check
      // alone would be a bare tick; the fields alone would skip the explicit
      // confirmation every sibling row requires. `projectNature` is listed last
      // by the allOf link convention (most specific check last).
      //
      // `projectNature` became a checklist section on 2026-08-10 for the reason
      // given on sg01-source; the link therefore now lands on that section rather
      // than the identification card [ASSUMPTION: R4-Q19].
      id: 'sg01-scope',
      label: 'Initial product scope',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '01', check: 'Initial product scope defined' },
          { kind: 'identityFieldFilled', field: 'initialScope' },
          { kind: 'checklistHasSelection', section: 'projectNature' },
        ],
      },
    },
    {
      // Wired 2026-08-09 (SME Round 3 B3, option (a)): a lightweight Gate 1
      // capture that is deliberately NOT the Gate 02 checklists. Pointing this
      // at those would have forced Gate 2's full target-user and market work to
      // finish before Gate 1 could close — collapsing two gates into one.
      id: 'sg01-market-user',
      label: 'Initial target market and user',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'identityFieldFilled', field: 'initialTargetUsers' },
          { kind: 'identityFieldFilled', field: 'initialTargetMarkets' },
        ],
      },
    },
    {
      // Added 2026-07-28 — every gate's F1 list ends with this same line (see
      // the note above GATE_READINESS). Checks the Gate 01 Phase Gate Flow
      // row's own Owner + Evidence link fields, not the phase-level sign-off.
      id: 'sg01-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '01', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '01', field: 'evidenceLink' },
        ],
      },
    },
  ],
  SG02: [
    {
      // Wired 2026-08-09 (SME Round 3 B4, option a): the brief is "a discrete
      // controlled record or linked document, not merely an inference from
      // completed checklists", so this reads the new Development Brief register
      // and NOT the four Phase 1 checklist sections — the team ruled that
      // substitution out explicitly. registerRowsComplete is non-vacuous by
      // design, so an untouched register does not pass.
      id: 'sg02-brief',
      label: 'Approved development brief',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'registerHasRows', register: 'developmentBrief' },
          { kind: 'registerRowsComplete', register: 'developmentBrief', columns: ['briefStatus', 'briefLink', 'briefOwner'] },
          { kind: 'registerNoBadRows', register: 'developmentBrief', column: 'briefStatus', badValues: ['Draft', 'In Review'] },
        ],
      },
    },
    {
      // Merged 2026-07-26 (user-requested) from two separate rows
      // (sg02-user + sg02-user-detail) into one, so the panel shows exactly
      // one line per F1 item, matching the appendix's own count and order.
      // Requires BOTH signals — same rigor as before, just one visible row:
      // the coarse Key Gate Check row AND the underlying Target Users
      // checklist actually having a real selection (guards against the
      // checkbox being ticked without the detail table ever being touched).
      id: 'sg02-user',
      label: 'Target user and life stage',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '02', check: 'Target user / life stage / use context selected' },
          { kind: 'checklistHasSelection', section: 'targetUsers' },
        ],
      },
    },
    {
      // Merged 2026-07-26 (user-requested), same reasoning as sg02-user
      // above. Shares the same Key Gate Check as sg02-user — "...use context
      // selected" already covers this; no separate Key Gate Check row exists
      // for "intended use" alone.
      id: 'sg02-use',
      label: 'Intended use and body area',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '02', check: 'Target user / life stage / use context selected' },
          { kind: 'checklistHasSelection', section: 'targetArea' },
        ],
      },
    },
    {
      // Merged 2026-07-26 (user-requested), same reasoning as sg02-user above.
      id: 'sg02-markets',
      label: 'Selected markets',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '02', check: 'Target markets and success criteria linked' },
          { kind: 'checklistHasSelection', section: 'targetMarkets' },
        ],
      },
    },
    {
      id: 'sg02-vulnerable',
      label: 'Vulnerable-user flags',
      tier: 'Mandatory',
      // Rewired 2026-08-09 (SME Round 3 B5, option b). It used to read the
      // targetUsers checklist — the same evidence as sg02-user — so it was
      // satisfied the moment ANY target user was picked, including a plain
      // General adult. The team rejected that outright: "the system should
      // distinguish between selecting a target user and explicitly recognising
      // a vulnerable-use context ... a general-adult project should still
      // record 'No vulnerable-user group identified' rather than satisfying the
      // requirement by default."
      //
      // Only `vulnerableGroup` is required on every row: the other three
      // columns (pathway / reviewer / additional assessments) are meaningless
      // on the "No vulnerable-user group identified" row, and requiring them
      // there would be inventing a rule. B5 asks for them "where any vulnerable
      // group is selected" — that per-row conditional is not expressible with
      // the current check kinds and is left for the trigger work.
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'registerHasRows', register: 'vulnerableUserAssessment' },
          { kind: 'registerRowsComplete', register: 'vulnerableUserAssessment', columns: ['vulnerableGroup'] },
        ],
      },
    },
    {
      // Wired 2026-08-09 (SME Round 3 B6), replacing `manual`. Phase 1 had NO
      // requirement section at all, which is why this could never be checked.
      //
      // Deliberately NOT requiring all 16 rows Completed: the team gave the row
      // list but no cardinality rule, and several rows genuinely will not apply
      // to a given project ("Benchmark or reference product" on a project with
      // no benchmark). Requiring every row would be inventing a rule. Two rows
      // are checked instead — the two the appendix names in its own wording,
      // "requirements AND exclusions" — and the WorkStatus rules already let a
      // row be closed as not-applicable.
      id: 'sg02-requirements',
      label: 'Project requirements and exclusions',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'requirementDone', section: 'projectRequirements', requirement: 'Must-have product requirements' },
          { kind: 'requirementDone', section: 'projectRequirements', requirement: 'Explicit exclusions' },
        ],
      },
    },
    // --- End of the 6 F1-named Gate 2 items (order matches the appendix
    // exactly, 2026-07-26, user-requested) — everything below is NOT one of
    // the SME's named items, so its order among itself doesn't carry meaning.
    {
      // Gate 02 brief must name the product type — at least one Product Type
      // option selected (2026-07-23, user-requested). Mandatory, so it hard-
      // blocks the gate decision (Proceed / Proceed with Conditions alike),
      // like the other core brief selections above.
      id: 'sg02-product-type',
      label: 'Product type — at least one selected',
      tier: 'Mandatory',
      source: 'dev-decision',
      // Never put to the team in any round: "Product type" appears exactly once
      // in the Round 3 questions, inside option (b) of B4 — and B4 was answered
      // (a) [ASSUMPTION: R4-Q20].
      assumption: 'R4-Q20',
      check: { kind: 'checklistHasSelection', section: 'productType' },
    },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints:
      // this Key Gate Check row was already mandatory-in-effect via B3
      // (phase close), just not yet enforced at its own gate.
      id: 'sg02-commercial',
      label: 'Commercial planning inputs entered or marked N/A',
      tier: 'Mandatory',
      source: 'b3',
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
      source: 'npd-roadmap',
      check: { kind: 'registerHasRows', register: 'needsResearchQuestions' },
    },
    {
      id: 'sg02-npd-needs-signoff',
      label: 'Needs & Scientific Basis dossier signed off (name + date, all 3 roles)',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      check: { kind: 'registerRowsComplete', register: 'needsSignOff', columns: ['name', 'date'] },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg02-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '02', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '02', field: 'evidenceLink' },
        ],
      },
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
      // Merged 2026-07-27 (user-requested, same treatment as Gate 2's
      // "detailed selection recorded" pairs) from sg03-claims +
      // sg03-claims-detail — requires BOTH the Key Gate Check row done+Y/NA
      // AND the underlying Claim Areas checklist actually having a real
      // selection, shown as one line instead of two.
      id: 'sg03-claims',
      label: 'Proposed claims list',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '03', check: 'Claim/benefit areas selected and evidence route identified' },
          { kind: 'checklistHasSelection', section: 'claimAreas' },
        ],
      },
    },
    // sg03-classification: still `manual` — no field represents a claim's
    // classification (e.g. cosmetic / functional / medical-adjacent) anywhere;
    // `claimAreas` only lists benefit wording, not a risk/classification tier.
    // Open question — see docs/rules/F1_Per_Gate_Open_Questions.md.
    { id: 'sg03-classification', label: 'Preliminary claim classification', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      // Merged 2026-07-27 (user-requested), same reasoning as sg03-claims
      // above. Shares the same Key Gate Check as sg03-claims — "...evidence
      // route identified" already covers this; the Evidence Route checklist
      // is the distinct detail signal.
      id: 'sg03-evidence-reqs',
      label: 'Evidence requirements identified for each proposed claim',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '03', check: 'Claim/benefit areas selected and evidence route identified' },
          { kind: 'checklistHasSelection', section: 'evidenceRoute' },
        ],
      },
    },
    {
      // Tier methodology reaffirmed 2026-07-27 (briefly reverted to Mandatory
      // when challenged, then the project owner reviewed and kept Conditional
      // on purpose): the F1 appendix (docs/rounds/2026-07-21-sme-reply-F1-F14.txt) lists every gate's
      // items under one flat "Required:" heading with no per-item
      // Mandatory/Conditional/Supporting tag — the team's own tiering had to
      // be inferred by applying the SME's general 3-tier definitions to each
      // item's wording. This item's own text ("...where applicable") matches
      // the SME's own definition of Conditional verbatim ("becomes mandatory
      // when triggered by product type, user, market, claim or change") —
      // formalized as a cross-cutting rule, not a one-off guess. See the
      // "Cross-cutting: tier assignment from 'where applicable' wording"
      // section in docs/rules/F1_Per_Gate_Open_Questions.md for the full rule, the
      // complete list of items it applies to, and the confirmation being
      // requested from the SME team.
      id: 'sg03-benchmark',
      label: 'Competitor or benchmark review where applicable',
      tier: 'Conditional',
      // Trigger wired 2026-08-09, now that B1/B2/B6 supply all three of A3's
      // limbs: project nature, request origin, and whether a benchmark product
      // is named. Which project natures count as the "purely administrative
      // change" A3 exempts is our reading [ASSUMPTION: R4-Q7].
      trigger: 'newOrRepositionedProject',
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
      source: 'npd-roadmap',
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
      source: 'npd-roadmap',
      // targetProductProfile is a `mode:'fixed'` register — its 7 attribute
      // rows are seeded at project creation regardless of user input, so
      // `registerHasRows` would be vacuously always true. `registerColumnFilled`
      // on 'target' (the "aim" column, blank until actually answered) is the
      // real signal.
      check: { kind: 'registerColumnFilled', register: 'targetProductProfile', column: 'target' },
    },
    // sg03-reg-claims: still `manual` — depends on a "high-risk/borderline
    // claim" flag that doesn't exist yet (same open question as Round 2's A1
    // "critical" definition). Tier methodology reaffirmed 2026-07-27, same
    // reasoning as sg03-benchmark above ("high-risk or borderline" is itself
    // a conditional qualifier — only applies to some claims, not all) — see
    // the cross-cutting section in docs/rules/F1_Per_Gate_Open_Questions.md.
    { id: 'sg03-reg-claims', label: 'Regulatory review of high-risk or borderline claims', tier: 'Conditional', check: { kind: 'manual' } },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints /
      // sg02-commercial.
      id: 'sg03-decision',
      label: 'Gate 1-3 decision and open actions recorded',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '03', check: 'Gate 1-3 decision and open actions recorded' },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg03-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '03', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '03', field: 'evidenceLink' },
        ],
      },
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
      // Merged 2026-07-27 (user-requested, same treatment as Gates 2-3) from
      // sg04-identity + sg04-identity-detail — requires BOTH the Key Gate
      // Check row done+Y/NA AND every Supplier/RM Evidence row actually
      // having an identity (inciName) recorded. Cosmetri reference
      // deliberately NOT required here — F14 allows manual reconciliation
      // pre-Gate 7.
      id: 'sg04-identity',
      label: 'Ingredient identity and Cosmetri reference where available',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '04', check: 'Ingredient functions identified and RM document pack requested' },
          // registerRowsComplete, not registerColumnFilled: sg04-supplier's
          // registerHasRows on this same register only guards the GATE
          // overall — this item's own satisfied flag was still vacuously
          // true on an empty register (found 2026-07-28, same class of bug
          // as the Gate 06 packagingSpecsArtwork items).
          { kind: 'registerRowsComplete', register: 'supplierRmEvidence', columns: ['inciName'] },
        ],
      },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg04-supplier +
      // sg04-supplier-detail + sg04-supplier-detail-docs — three signals for
      // one F1 item: the Key Gate Check row, at least one Supplier/RM
      // Evidence record, AND the Raw Material Document Pack checklist
      // (phases.ts, gate '04' — which document TYPES exist, e.g.
      // Specification/CoA/SDS/TDS) actually touched. All three must hold.
      id: 'sg04-supplier',
      label: 'Supplier and raw-material evidence status',
      tier: 'Mandatory',
      // Order matters for resolveCheckLink's "last check = link target"
      // convention — registerHasRows (the main data-entry register) is the
      // most useful destination, so it goes last.
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '04', check: 'Ingredient evidence / registry links added or gap actions opened' },
          { kind: 'checklistHasSelection', section: 'rmDocPack' },
          { kind: 'registerHasRows', register: 'supplierRmEvidence' },
        ],
      },
    },
    {
      // Narrowed 2026-08-09 (SME Round 3 C2). The Key Gate Check row alone was
      // too broad — it bundles restrictions, exclusions AND supplier risks into
      // one tick, and supplier risk is not an ingredient-prohibition matter at
      // all. The team asked for "a narrow, dedicated confirmation for the
      // ingredient-level screen", keeping the existing row "as a broader Gate 4
      // check". So both are now required, and the new dedicated row draws on the
      // automated watch-list results (sg04-no-remove / sg04-pb-screen enforce
      // the results themselves; this is the qualified review of them).
      id: 'sg04-prohibited-screen',
      label: 'Prohibited and restricted ingredient screen',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '04', check: 'Restrictions, exclusions and supplier risks screened' },
          { kind: 'gateCheckDone', gate: '04', check: 'Prohibited, restricted and caution ingredient screen completed' },
        ],
      },
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
      // [ASSUMPTION: R4-Q3] — the Gate 4 vs Gate 7 threshold split below is
      // our reading, not something the appendix states.
      // 2026-08-07: this now HARD-BLOCKS Gate 4 once the trigger is active
      // (Conditional items with a live trigger stopped being advisory — see
      // `advisory` in gateProgress.ts). Deliberately conservative badValues:
      // 'Not assessed' is NOT one of them, so a maternal project whose rows
      // are still at their seeded default is not blocked on day one — only a
      // row someone has explicitly escalated to "Needs ... Review" blocks.
      // Full closure of every row is Gate 7's job (sg07-caution-closed, whose
      // badValues DO include 'Not assessed'), matching the workbook's own
      // Gate 4 = screen / Gate 7 = close split.
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
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg04-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '04', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '04', field: 'evidenceLink' },
        ],
      },
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
      // Merged 2026-07-27 (user-requested) from sg05-composition +
      // sg05-composition-detail. Cosmetri reference not required here —
      // F14 allows manual lines pre-Gate 7.
      id: 'sg05-composition',
      label: 'Formula composition or controlled Cosmetri formula reference',
      tier: 'Mandatory',
      check: { kind: 'allOf', checks: [{ kind: 'bomHasLines' }, { kind: 'bomIdentityComplete' }] },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg05-ph + sg05-ph-detail.
      id: 'sg05-ph',
      label: 'Target pH and acceptable pH range',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
          { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Target pH / pH range' },
        ],
      },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg05-process +
      // sg05-process-detail. Shares the same Key Gate Check as sg05-ph — its
      // own wording already bundles "pH/process limits".
      id: 'sg05-process',
      label: 'Manufacturing/process requirements affecting product function',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
          { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Scale-up or manufacturing notes' },
        ],
      },
    },
    // sg05-preservative: still `manual` — none of Phase 2's requirement rows
    // are preservative-specific, and the trigger ("where applicable") has no
    // defined condition (same open gap as Gates 5/9's preservative items in
    // the mapping doc). Conditional — never hard-blocks. Open question — see
    // docs/rules/F1_Per_Gate_Open_Questions.md.
    {
      // Wired 2026-08-09. A3's condition is a property of the formula, not of a
      // register — see FormulaProperties. The check is that a rationale exists
      // alongside the classification: for a susceptible product that rationale
      // IS the preservative strategy, which is what the item asks for.
      id: 'sg05-preservative',
      label: 'Preservative strategy where applicable',
      tier: 'Conditional',
      trigger: 'microbiologicallySusceptible',
      check: { kind: 'formulaPropertyFilled', field: 'microRationale' },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg05-compatibility +
      // sg05-compatibility-detail. Shares the same Key Gate Check as
      // sg05-ph/sg05-process.
      id: 'sg05-compatibility',
      label: 'Formula compatibility assessment',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
          { kind: 'requirementDone', section: 'formulationDesign', requirement: 'Compatibility / use-with constraints' },
        ],
      },
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
      source: 'b3',
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
      source: 'npd-roadmap',
      check: { kind: 'registerRowsComplete', register: 'needsSignOff', columns: ['name', 'date'] },
    },
    {
      id: 'sg05-npd-competitor-content',
      label: 'Competitor & current-solution landscape recorded',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      check: { kind: 'registerHasRows', register: 'competitorLandscape' },
    },
    {
      id: 'sg05-npd-target-product-content',
      label: 'Target Product Profile recorded',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      // Same registerColumnFilled reasoning as sg03-npd-target-product-progress
      // above — targetProductProfile's fixed rows always exist, so `target`
      // (blank until answered) is the real signal, not registerHasRows.
      check: { kind: 'registerColumnFilled', register: 'targetProductProfile', column: 'target' },
    },
    {
      id: 'sg05-npd-target-product-signoff',
      label: 'Target Product & Tech Platform signed off (name + date, all 3 roles)',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      check: { kind: 'registerRowsComplete', register: 'targetProductSignOff', columns: ['name', 'date'] },
    },
    {
      id: 'sg05-npd-evidence-plan',
      label: 'Prospective evidence plan recorded (agree before formula lock)',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      check: { kind: 'registerHasRows', register: 'evidencePlanProspective' },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg05-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '05', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '05', field: 'evidenceLink' },
        ],
      },
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
      // Merged 2026-07-27 (user-requested) from sg06-pack-spec +
      // sg06-pack-spec-detail.
      id: 'sg06-pack-spec',
      label: 'Proposed pack specification',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '06', check: 'Packaging format and component requirements selected' },
          { kind: 'registerHasRows', register: 'packagingSpecsArtwork' },
        ],
      },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg06-compatibility +
      // sg06-compatibility-detail. The Key Gate Check's own wording bundles
      // "pack compatibility triggers".
      id: 'sg06-compatibility',
      label: 'Packaging compatibility requirements',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '06', check: 'Artwork/label needs and pack compatibility triggers identified' },
          // registerRowsComplete, not registerColumnFilled: an empty register
          // must not vacuously satisfy this (found 2026-07-28 — the register
          // had 0 rows and this still showed satisfied).
          { kind: 'registerRowsComplete', register: 'packagingSpecsArtwork', columns: ['compatibilityEvidence'] },
        ],
      },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg06-artwork +
      // sg06-artwork-version. Shares the Key Gate Check used by
      // sg06-compatibility above ("Artwork/label needs …") — not repeated
      // here as a 3rd sub-check to avoid over-counting the same row twice
      // across two merged items; the artwork trigger checklist + the
      // per-component artwork version are this item's own distinct signals.
      id: 'sg06-artwork',
      label: 'Label and artwork requirements',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'checklistHasSelection', section: 'artworkTriggers' },
          // registerRowsComplete (see sg06-compatibility note above).
          { kind: 'registerRowsComplete', register: 'packagingSpecsArtwork', columns: ['artworkVersion'] },
        ],
      },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg06-supplier +
      // sg06-supplier-detail.
      id: 'sg06-supplier',
      label: 'Component supplier status',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '06', check: 'Packaging cost, lead time and supplier approval requirements entered' },
          // registerRowsComplete (see sg06-compatibility note above).
          { kind: 'registerRowsComplete', register: 'packagingSpecsArtwork', columns: ['supplier'] },
        ],
      },
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
      // registerRowsComplete, not registerColumnFilled: an empty register must
      // not vacuously satisfy this (found 2026-07-28 — user reported this item
      // showing satisfied with 0 rows in packagingSpecsArtwork).
      check: { kind: 'registerRowsComplete', register: 'packagingSpecsArtwork', columns: ['specLink'] },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg06-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '06', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '06', field: 'evidenceLink' },
        ],
      },
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
  // Order below (2026-07-28) matches the exact sequence the SME provided for
  // Gate 7's "What's blocking" panel — the 10 named items first (untagged, no
  // `source`, so `gateReadinessChecklist` groups them together and in this
  // order), then the dev-added extras below a divider (each now carries a
  // `source` so it never interleaves with the SME's own list).
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
      tier: 'Conditional',
      trigger: 'skincareForTwo',
      // [ASSUMPTION: R4-Q1] [ASSUMPTION: R4-Q2] — shipped on our own reading;
      // see docs/rules/F1_Per_Gate_Open_Questions.md -> Round 4.
      // Corrected 2026-08-07 (SME Round 3, Response2 E1). This was Mandatory
      // and UNCONDITIONAL, on the reading that the Gate 7 appendix item
      // carries no qualifier (unlike sg04-pb-screen) — the open question in
      // F1_Per_Gate_Open_Questions.md was answered the other way: "the
      // pregnancy/breastfeeding assessment at Gate 7 should not be
      // unconditional for every project. It is mandatory when Pregnancy,
      // Breastfeeding or Postpartum is selected." Because `pbCautionLimits` is
      // `mode: 'fixed'` and seeds all 12 rows at 'Not assessed' (a badValue),
      // the old tiering hard-blocked Gate 7 on EVERY project — a plain
      // general-adult product had to walk the whole maternal caution register
      // to pass. Now Conditional on the same trigger as Gate 4's screen, and
      // it still hard-blocks once that trigger is active. Every row must be
      // resolved to "Not present" or "Within limit - evidence linked".
      // STILL TO DO from the same answer (needs Round-2 A2 content first):
      // infant-only products should route to the Infant/Baby Safety pathway
      // instead, and a general product should record N/A with a rationale —
      // today the `sg07-screen-check` Key Gate Check row is the only N/A route.
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
      // registerRowsComplete, not registerColumnFilled: sg07-matrix-rows'
      // registerHasRows only guards the GATE overall, not this item's own
      // satisfied flag (found 2026-07-28 — same class as the Gate 06 fix).
      check: { kind: 'registerRowsComplete', register: 'formulationSafetyMatrix', columns: ['exposureRationale'] },
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
      // registerRowsComplete (see sg07-exposure note above).
      check: { kind: 'registerRowsComplete', register: 'formulationSafetyMatrix', columns: ['safetyDecision'] },
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
    {
      // Added 2026-07-28 — the SME's own Gate 7 list names this as a DISTINCT
      // 10th item, separate from "Required safety reviewer approval" above.
      // User-confirmed reading (2026-07-28): unlike sg07-reviewer (a separate
      // Final Safety Sign-off register) or the Phase 3 SignOffBlock
      // (Prepared/Reviewed/Approved roles, evaluated per-PHASE, not per-gate),
      // this item is the act of completing the Gate 07 row itself in the
      // Phase Gate Flow table — Owner and Evidence link filled in, i.e. a
      // named person has taken responsibility and left a review trail. Not
      // vacuous: both fields start blank on a gate record and are only
      // filled in when someone actually does so.
      id: 'sg07-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '07', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '07', field: 'evidenceLink' },
        ],
      },
    },
    {
      id: 'sg07-matrix-rows',
      label: 'Formulation safety matrix — every formula ingredient assessed',
      tier: 'Mandatory',
      source: 'dev-decision',
      assumption: 'R4-Q20',
      // Not an F1-named item. Guards the three per-column matrix checks above:
      // `.every()` over an empty register is vacuously true, so the row-count
      // check has to be Mandatory too.
      //
      // The GUARD is ours and needs no confirmation — an empty register must not
      // satisfy a check. What does need it is the cardinality this implies: that
      // the matrix must carry a row for EVERY formula ingredient, which the SME
      // has never been asked [ASSUMPTION: R4-Q20].
      check: { kind: 'registerHasRows', register: 'formulationSafetyMatrix' },
    },
    {
      id: 'sg07-safety-questions',
      label: 'Safety/tolerance questions defined and vulnerable-user risks reviewed',
      tier: 'Mandatory',
      source: 'b3',
      // Not an F1-named item — already mandatory-in-effect via B3, same pattern
      // as sg01-constraints.
      check: { kind: 'gateCheckDone', gate: '07', check: 'Safety/tolerance questions defined and vulnerable-user risks reviewed' },
    },
    {
      id: 'sg07-restrictions-linked',
      label: 'Restrictions, conditions and safety evidence linked',
      tier: 'Mandatory',
      source: 'b3',
      // Not an F1-named item (not in the SME's 10-item Gate 7 list either) —
      // tagged 2026-07-28 so it groups with the other extras instead of
      // interleaving with the SME list above.
      //
      // Relabelled from 'dev-decision' to 'b3' on 2026-08-11: this reads one of
      // the workbook's own Gate 7 Key Gate Check rows, exactly like
      // `sg07-safety-questions` two entries above, so B3(b) already makes it
      // mandatory before the phase can close. Same shape, same rule — the two
      // had different provenance labels for no reason.
      check: { kind: 'gateCheckDone', gate: '07', check: 'Restrictions, conditions and safety evidence linked' },
    },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints:
      // B3(b) already confirms EVERY Key Gate Check row is mandatory before
      // its phase can close; this is the third of Gate 7's three rows and
      // was missed when Gate 7 was first wired (2026-07-26 completeness
      // pass). `sg07-maternal-infant` above is a DIFFERENT, Conditional item
      // (the C1 Skincare-for-Two auto-check) — it does not substitute for
      // this Key Gate Check row being confirmed done/justified.
      id: 'sg07-screen-check',
      label: 'Pregnancy/breastfeeding and baby-contact screen completed where triggered',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '07', check: 'Pregnancy/breastfeeding and baby-contact screen completed where triggered' },
    },
    {
      id: 'sg07-bom-reconciled',
      label: 'Formula BOM reconciled to a controlled Cosmetri formula (no "Draft - Not Reconciled" lines)',
      tier: 'Mandatory',
      source: 'f-series',
      // F14: manual composition must be reconciled before Gate 7 final safety.
      // Not in the SME's 10-item Gate 7 list — tagged 2026-07-28 (see note on
      // sg07-restrictions-linked above).
      //
      // Relabelled from 'dev-decision' to 'f-series' on 2026-08-11: F14 IS a
      // confirmed SME answer (2026-07-21), so the panel was calling a confirmed
      // rule "not SME-confirmed". The old enum simply had no value for
      // "confirmed elsewhere, just not in the F1 appendix".
      check: { kind: 'bomReconciled' },
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
      // registerRowsComplete, not registerColumnFilled: sg08-npd-evidence-
      // protocol's registerHasRows only guards the GATE overall, not this
      // item's own satisfied flag (found 2026-07-28 — same class as the
      // Gate 06 fix).
      check: { kind: 'registerRowsComplete', register: 'evidenceTestProtocol', columns: ['testMethod'] },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg08-acceptance +
      // sg08-acceptance-detail.
      id: 'sg08-acceptance',
      label: 'Acceptance criteria',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '08', check: 'Acceptance criteria, results and CAPA pathway defined' },
          // registerRowsComplete (see sg08-methods note above).
          { kind: 'registerRowsComplete', register: 'evidenceTestProtocol', columns: ['acceptanceLimit'] },
        ],
      },
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
      // Trigger wired 2026-08-09. A3 requires the approval workflow "before any
      // study involving human participants", so the signal has to catch the
      // INTENT to run one — studyApprovals appear only once approvals are being
      // recorded, which is already too late [ASSUMPTION: R4-Q5].
      trigger: 'humanStudyPlanned',
      // Phase 3's humanStudy requirement section is tagged gate '08' and has an
      // "Approval trail" row — the C2 study-approval workflow's own checkpoint.
      check: { kind: 'requirementDone', section: 'humanStudy', requirement: 'Approval trail' },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg08-reports +
      // sg08-reports-detail.
      id: 'sg08-reports',
      label: 'Test reports or controlled actions for tests still in progress',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '08', check: 'Validation report linked or placeholder/action used' },
          // registerRowsComplete (see sg08-methods note above).
          { kind: 'registerRowsComplete', register: 'evidenceTestProtocol', columns: ['reportLink'] },
        ],
      },
    },
    // NPD Front-End Roadmap (v2 workbook, 2026-07-24): Step 4's detailed test
    // protocol ("complete once prototype exists — Gate 8"), distinct from
    // sg08-human-study above (a different, existing workflow).
    {
      id: 'sg08-npd-evidence-protocol',
      label: 'Detailed test protocol recorded',
      tier: 'Mandatory',
      source: 'npd-roadmap',
      check: { kind: 'registerHasRows', register: 'evidenceTestProtocol' },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg08-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '08', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '08', field: 'evidenceLink' },
        ],
      },
    },
  ],
  // Gate 9 wired 2026-07-26 (previously 0 of 5 Mandatory items enforced). Phase 3
  // has a real requirement section for exactly this gate
  // (PHASE_3.requirementSections 'stabilityRelease', all rows gate '09'), so most
  // items map to a specific requirement row rather than a coarse gate check.
  SG09: [
    {
      // Merged 2026-07-27 (user-requested) from sg09-stability +
      // sg09-stability-detail + sg09-stability-evidence — three signals for
      // one F1 item.
      id: 'sg09-stability',
      label: 'Stability status',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '09', check: 'Stability, preservation/micro and pack compatibility program selected' },
          { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Stability program selected' },
          { kind: 'registerHasRows', register: 'stabilityRelease' },
        ],
      },
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
      // Same formula property as sg05-preservative — modelled once, read twice.
      trigger: 'microbiologicallySusceptible',
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Preservation / microbiology checks selected' },
    },
    {
      // Merged 2026-07-27 (user-requested) from sg09-acceptance +
      // sg09-acceptance-detail.
      id: 'sg09-acceptance',
      label: 'Physical, chemical and microbiological acceptance criteria',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '09', check: 'Pilot/scale-up and release criteria assessed' },
          // registerRowsComplete, not registerColumnFilled: sg09-stability's
          // registerHasRows only guards the GATE overall, not this item's own
          // satisfied flag (found 2026-07-28 — same class as the Gate 06 fix).
          { kind: 'registerRowsComplete', register: 'stabilityRelease', columns: ['acceptanceCriteria'] },
        ],
      },
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
      source: 'b3',
      // Not an F1-named item — same generalizable rule as sg01-constraints: this
      // requirement row was already mandatory-in-effect via B3 (phase close).
      check: { kind: 'requirementDone', section: 'stabilityRelease', requirement: 'Retest or CAPA pathway defined' },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg09-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '09', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '09', field: 'evidenceLink' },
        ],
      },
    },
  ],
  // Gate 10 is a market-specific hard block (requirements repeat per market).
  SG10: [
    { id: 'sg10-checklist', label: 'Applicable regulatory checklist (per market)', tier: 'Mandatory', check: { kind: 'manual' } },
    // sg10-evidence-hierarchy / sg10-regulatory-mapped / sg10-approved-wording:
    // not F1-named items — same generalizable rule as sg01-constraints: B3(b)
    // already confirms every Key Gate Check row is mandatory before its phase
    // can close. Gate 10 had all three of its own rows unwired until this
    // completeness pass (2026-07-26) — the widest such gap found; every other
    // gate had at most one row missing.
    {
      id: 'sg10-evidence-hierarchy',
      label: 'Evidence hierarchy applied and claims wording checked',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '10', check: 'Evidence hierarchy applied and claims wording checked' },
    },
    {
      id: 'sg10-regulatory-mapped',
      label: 'Countries/regulatory pathway matched and PIF/evidence file mapped',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '10', check: 'Countries/regulatory pathway matched and PIF/evidence file mapped' },
    },
    {
      id: 'sg10-approved-wording',
      label: 'Approved wording / limitations recorded',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '10', check: 'Approved wording / limitations recorded' },
    },
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
      source: 'b3',
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
      // registerRowsComplete, not registerColumnFilled: sg10-claims-register's
      // registerHasRows only guards the GATE overall, not this item's own
      // satisfied flag (found 2026-07-28 — same class as the Gate 06 fix).
      check: { kind: 'registerRowsComplete', register: 'skuClaimsPifRegister', columns: ['evidenceLink'] },
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
      // registerRowsComplete, not registerColumnFilled: the only registerHasRows
      // on this register is sg06-pack-spec at an EARLIER gate, so this item's
      // own satisfied flag was vacuously true if viewed before Gate 06 is
      // actually passed (found 2026-07-28 — same class as the Gate 06 fix).
      check: { kind: 'registerRowsComplete', register: 'packagingSpecsArtwork', columns: ['approval'] },
    },
    {
      id: 'sg10-published-info',
      label: 'Published information status',
      tier: 'Mandatory',
      check: { kind: 'registerHasRows', register: 'publishedInfoApproval' },
    },
    // sg10-reg-approval: still `manual` — per-market (marketTracks.regulatoryStatus),
    // needs F4. See docs/rules/F1_Per_Gate_Open_Questions.md.
    { id: 'sg10-reg-approval', label: 'Regulatory approval', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg10-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '10', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '10', field: 'evidenceLink' },
        ],
      },
    },
  ],
  // Gate 11 is a market-specific hard block.
  SG11: [
    // sg11-gate10: still `manual` — per-market, same F4 dependency as
    // sg10-reg-approval below it.
    { id: 'sg11-gate10', label: 'Gate 10 complete for the relevant market', tier: 'Mandatory', check: { kind: 'manual' } },
    {
      // Merged 2026-07-27 (user-requested) from sg11-gmp + sg11-gmp-link.
      id: 'sg11-gmp',
      label: 'GMP document links',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'registerHasRows', register: 'gmpLinks' },
          { kind: 'registerColumnFilled', register: 'gmpLinks', column: 'link' },
        ],
      },
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
      // Merged 2026-07-27 (user-requested) from sg11-production +
      // sg11-production-detail.
      id: 'sg11-production',
      label: 'Production readiness',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '11', check: 'Production records ready and GMP links added' },
          { kind: 'checklistHasSelection', section: 'productionRecords' },
        ],
      },
    },
    {
      id: 'sg11-release-pathway',
      label: 'Quality release pathway',
      tier: 'Mandatory',
      // registerRowsComplete, not registerColumnFilled: the only registerHasRows
      // on this register is sg09-stability at an EARLIER gate, so this item's
      // own satisfied flag was vacuously true if viewed before Gate 09 is
      // actually passed (found 2026-07-28 — same class as the Gate 06 fix).
      check: { kind: 'registerRowsComplete', register: 'stabilityRelease', columns: ['releaseDecision'] },
    },
    {
      // Not an F1-named item — same generalizable rule as sg01-constraints:
      // B3(b) already confirms every Key Gate Check row is mandatory before
      // its phase can close. Gate 11's third row, missed when Gate 11 was
      // first wired (2026-07-26 completeness pass).
      id: 'sg11-launch-signoff',
      label: 'Launch sign-off completed and blockers recorded',
      tier: 'Mandatory',
      source: 'b3',
      check: { kind: 'gateCheckDone', gate: '11', check: 'Launch sign-off completed and blockers recorded' },
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
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg11-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '11', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '11', field: 'evidenceLink' },
        ],
      },
    },
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
      // Supporting -> Conditional 2026-08-09: A1 says so in as many words
      // ("change from Supporting to Conditional"). Behaviour is unchanged for
      // now — a Conditional item with no trigger stays advisory — but the tier
      // is at least no longer wrong.
      //
      // The trigger is NOT wired, and deliberately not faked: A3's condition is
      // "a Change Control record has been opened", and Change Control records
      // are NOT part of `ProjectData`. They live in a store-level slice (and in
      // the API envelope) beside it, because the Change Control page shows them
      // across projects. The readiness engine only ever receives `ProjectData`,
      // so it cannot see them.
      //
      // Copying changes into `ProjectData` to make this one trigger work would
      // create a second copy of a list that already has an owner — exactly the
      // duplication that drifts. Wiring it properly means either moving changes
      // into `ProjectData` outright or giving the engine a second argument, and
      // both are bigger than this item. Until then it stays advisory, which is
      // what it already was as Supporting.
      tier: 'Conditional',
      check: { kind: 'gateCheckDone', gate: '12', check: 'Loopback to NPD or change control recorded where needed' },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS). Gate 12's own
      // closing line is worded slightly differently from every other gate's
      // ("review closure" vs "sign-off") — transcribed verbatim from
      // docs/rounds/2026-07-21-sme-reply-F1-F14.txt rather than reusing the other gates' exact wording.
      id: 'sg12-signoff',
      label: 'Prepared, reviewed and approved review closure',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateFieldFilled', gate: '12', field: 'owner' },
          { kind: 'gateFieldFilled', gate: '12', field: 'evidenceLink' },
        ],
      },
    },
  ],
};
