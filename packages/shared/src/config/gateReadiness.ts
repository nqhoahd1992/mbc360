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
import { UNEVALUATED_C1_CONDITIONS } from './claimReview';
import { NO_VULNERABLE_GROUP } from './vulnerableGroups';

export type ReadinessTrigger =
  | 'skincareForTwo'
  | 'humanStudyPlanned'
  | 'newOrRepositionedProject'
  | 'claimNeedsRegulatoryReview'
  | 'microbiologicallySusceptible'
  // E1: "Infant-only products should trigger the Infant/Baby Safety pathway
  // instead." Added 2026-08-12 after the project owner asked whether Gate 7 was
  // finished: the pathway CONTENT turned out to be in the app already — Phase 3's
  // 8-row "Compartment 3 - Infant / Baby-Contact Safety & Characteristics"
  // (INF-01…INF-08, every row gate 07, from the V18 workbook) — but it was only
  // ever evaluated for MATERNAL projects, through skincareForTwoIncompleteSections.
  // So an infant-only product was required to complete nothing.
  | 'infantContact'
  // Rule E2: the ASEAN checklist is enforced only where an ASEAN market is sold into.
  | 'aseanMarket'
  // A3, Gate 12: "Mandatory where a Change Control record has been opened or
  // should be opened because of the post-market finding."
  //
  // ✅ Round 4 question 8 (2026-08-24) made the second limb machine-readable by
  // recording the judgement instead of inferring it, and it is built: the trigger
  // reads an OPEN record OR `assessments.changeControlRequired`, whose "Pending
  // assessment" — and unanswered — both resolve to `notAssessed` and block.
  | 'openChangeControl'
  // A3, Gate 12: "Mandatory where required by product category, market, company
  // policy, safety signal, vulnerable-user population, complaint trend or
  // scheduled surveillance plan." Three of those seven are readable today.
  | 'pvPmsRequired'
  // A3, Gate 10: a declared claim is categorised as depending on product-level
  // performance or sensory evidence.
  | 'claimNeedsPerformanceEvidence'
  // Round 4 question 12, Gate 9. `sg09-scaleup` had no trigger at all until
  // 2026-08-24, so it could never block whatever the project was. Fires on a Major
  // formula change ("A formula change classified Major also counts as a major
  // reformulation for the Gate 9 scale-up trigger") or on the reviewer's own
  // Yes / No / Pending answer.
  | 'scaleUpRiskIdentified'
  // A3, Gate 4: "The ingredient or raw material contains fragrance, essential
  // oils, botanical extracts, proteins, known allergens, residual solvents,
  // heavy-metal risk, microbiological risk, restricted impurities, processing
  // residues, or variable natural-source composition."
  //
  // Round 4 question 17 (2026-08-24) supplied the missing half — WHERE that is
  // recorded. It is company data, not project data ("Do not re-enter this per
  // project"), so the trigger reads the shared Raw Material Risk Overlay through
  // `ProjectData.reference.rmRisk` against the materials this project uses. Before
  // this, `sg04-allergen` was Conditional with no trigger at all: it could never
  // hard-block whatever the formula contained.
  | 'rmRiskFlagged'
  // Round 4 question 36(b), Gate 5. The costing item "remains a Supporting Gate 5
  // item unless the project is specifically designated as commercially dependent
  // on a defined cost or margin. Where that commercial requirement is a Must,
  // failure should result in Hold or Proceed with Conditions rather than being
  // ignored." Question 21 supplies the designation without inventing a field: the
  // Phase 1 requirement row "Target cost or commercial boundary" carries a
  // Must / Should / Could priority, and Must is what the answer names.
  | 'commercialRequirementIsMust';

// Round 4 question 7 (2026-08-24), option (b): "A missing assessment must never be
// treated as meaning the condition does not apply." A trigger therefore has THREE
// answers, not two, and the third one BLOCKS:
//
//   applies       — assessed, and the condition holds. The Conditional item
//                   becomes mandatory and hard-blocks until satisfied.
//   doesNotApply  — assessed, and the condition does not hold. The item is
//                   auto-satisfied with the reason stated (question 16 permits the
//                   system to generate that reason).
//   notAssessed   — nobody has recorded the information the condition reads.
//                   Blocks a Mandatory or Conditional item; on a Supporting item it
//                   warns instead, which is question 7's own carve-out.
//
// The distinction that matters is between the last two. Before this, an unset field
// returned `false` and the item passed — "we have not checked" being read as "it
// does not apply", which is exactly what the answer rejects.
export type TriggerState = 'applies' | 'doesNotApply' | 'notAssessed';

// Triggers that CANNOT yet return `notAssessed`, because the data they read has
// nowhere for a person to say "I checked, it does not apply" — an empty checklist
// or register is indistinguishable from a considered no [ASSUMPTION: R5-Q5].
//
// They keep two-state behaviour until that question is answered, which is a known
// and deliberate shortfall against question 7, not an oversight: guessing that
// "empty table = not assessed" would block several gates on every existing project
// on our own reading of a rule whose whole point is not to guess.
//
// `microbiologicallySusceptible` is deliberately NOT here — its field is empty
// until a person picks one of five values, so it already expresses all three
// states, and it is the case question 7 names outright. It is the shape the seven
// below should copy; `openChangeControl` and `humanStudyPlanned` left this list
// when questions 8 and 9 gave them an explicit Yes/No/Pending field.
//
// The count is printed by `npm run verify:readiness` every run. No typo sweep is
// needed: the array is typed, so the compiler already catches a bad name. An empty
// list means R5-Q5 is fully discharged.
export const TRIGGERS_WITHOUT_UNASSESSED_STATE: readonly ReadinessTrigger[] = [
  'skincareForTwo',
  'infantContact',
  'aseanMarket',
  'claimNeedsRegulatoryReview',
  'claimNeedsPerformanceEvidence',
  'newOrRepositionedProject',
  'pvPmsRequired',
];

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
  // `naInvalidWhenTrigger` (2026-08-12, project owner: "the project already knows
  // whether pregnancy/breastfeeding applies"): for a row whose own wording is
  // conditional — Gate 7's "…screen completed **where triggered**" — closing it as
  // NA is the right answer on a project the condition does not touch, and E1
  // asks for exactly that ("General products should record N/A with rationale").
  // But the app can evaluate the condition, and was letting NA satisfy the row on
  // projects where it demonstrably applies. With this set, an active trigger
  // narrows the row to done+Y only; NA no longer counts.
  | { kind: 'gateCheckDone'; gate: string; check: string; naInvalidWhenTrigger?: ReadinessTrigger[] }
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
  //
  // `when` narrows it to the rows the requirement actually applies to (added
  // 2026-08-11 for B5's vulnerable-user rule, which is conditional PER ROW: a row
  // naming a vulnerable group needs the safety pathway, reviewer and notes, while
  // the "No vulnerable-user group identified" row needs none of them). Rows whose
  // `when.column` holds one of `notIn` are skipped.
  //
  // ⚠️ With `when`, this check IS vacuously satisfiable — a register where every
  // row is skipped has nothing left to fail on — so it needs a Mandatory
  // `registerHasRows` alongside it, exactly like registerColumnFilled. Sweep S2
  // enforces that; without `when` the check stays non-vacuous and needs no pair.
  | { kind: 'registerRowsComplete'; register: string; columns: string[]; when?: { column: string; notIn: string[] } }
  // The Vulnerable-User Assessment agrees with the Gate 02 target users: every
  // selected target user that implies a vulnerable group (see
  // TARGET_USER_TO_VULNERABLE_GROUP) has a row naming that group. Bespoke rather
  // than generic, following the skincareForTwo precedent — it reads a mapping
  // between two specific surfaces, which no generic kind expresses.
  | { kind: 'vulnerableGroupsCovered' }
  // Every claim that C1 makes reviewable carries a recorded Regulatory review
  // (outcome + reviewer + date). Bespoke for the same reason as the one above: it
  // filters rows by a condition spanning two columns, which no generic kind says.
  | { kind: 'claimsRegulatoryReviewed' }
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
  | { kind: 'identityFieldFilled'; field: 'initialScope' | 'initialTargetUsers' }
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
  // Rule D4: every Supplier & RM Evidence row has reached a conclusion — approved
  // for use, conditionally accepted, or screened and not used. A row still at
  // "Incomplete — evidence review required" (or with no status at all) is what D4
  // calls an unresolved identity-only stub.
  | { kind: 'rmEvidenceDispositioned' }
  // Rule D4: no material is resting on the conditional route. Separate from the
  // check above because the two differ in severity — see `clearedByConditions`.
  | { kind: 'rmEvidenceNoneConditional' }
  // Rule D4, the hole the two above leave: a register where every row is
  // "Considered — not used" satisfies both of them, so Gate 4 would pass with
  // nothing the formula can be built from.
  | { kind: 'rmEvidenceHasUsable' }
  // Rule D3: no flagged watch-list row is Critical, unassessed, or assessed
  // without the record that verdict requires. Blocks Proceed with Conditions too.
  | { kind: 'watchlistReviewed' }
  // Rule D3: no flagged row is resting on Non-critical / Further information
  // required — both of which D3 allows only under Proceed with Conditions.
  | { kind: 'watchlistNoneConditional' }
  // Rule E1: no critical safety finding is open (nor left unjudged, nor closed
  // without the reviewer's conclusion and evidence). Deliberately vacuous on an
  // EMPTY register — a project with no findings has nothing open — which is why
  // it is NOT paired with a registerHasRows the way verify:readiness S2 requires
  // of the .every() checks: demanding at least one finding row would force every
  // project to invent one. The "did anyone look?" half is sg07-final-safety,
  // which E1 keeps ("not SOLELY the Final Safety Sign-off").
  | { kind: 'noOpenCriticalSafetyFinding' }
  // Round 4 question 33's middle band: "A Medium finding may permit Proceed with
  // Conditions where formally accepted and controlled." Split from the check above
  // because the two clear differently — see `clearedByConditions` on
  // `sg07-medium-findings`.
  | { kind: 'noOpenMediumSafetyFinding' }
  // Every row of a requirement section is Completed. Used for E1's infant
  // pathway; the section's rows are scaffolded at project creation (and
  // verify:scaffold guards that), so this is not vacuous in practice.
  | { kind: 'requirementSectionComplete'; section: string }
  // Rule E3(b): no open Change Control at Gate 11 is launch-impacting, High risk,
  // impacting formula/artwork/claims/safety/regulatory/packaging/release, or
  // unclassified. Blocks Proceed with Conditions too.
  | { kind: 'changeControlNoHardImpact' }
  // Rule E3(b)'s third line: no open low-risk ADMINISTRATIVE change remains —
  // which Proceed with Conditions may clear "following authorised
  // acknowledgement" (the existing F9 acknowledgement on the gate row).
  | { kind: 'changeControlNoAdminImpact' }
  // Rule E2: every market with no built-in dossier profile has a complete
  // Regulatory Checklist Status row. Vacuous only when the project sells into
  // nothing but ASEAN, which is correct — those markets are covered by the
  // checklist below instead.
  | { kind: 'marketChecklistRecorded' }
  // Rule E2: the built-in ASEAN PIF checklist is complete. Conditional on an
  // ASEAN market being selected.
  | { kind: 'aseanChecklistComplete' }
  // Round 4 question 22(b): on a checklist section declaring `requiresPrimary`,
  // exactly one SELECTED option is marked Primary. Never vacuous — with nothing
  // selected there is no primary either, so it blocks.
  | { kind: 'checklistPrimarySelected'; section: string }
  // Round 4 question 21, the hard half of the Gate 2 requirements rule: every row
  // reviewed (no 'Not Started'), every applicable row carrying a Must/Should/Could
  // priority, every 'N/A' row carrying a rationale, and every **Must** row
  // Completed. Deliberately separate from `requirementsNoOpenDeferrals` below,
  // which is the half Proceed with Conditions may clear.
  | { kind: 'requirementsDispositioned'; section: string }
  // Round 4 question 21, the deferrable half: no Should or Could row is still
  // open. Paired with `clearedByConditions`, because that is exactly the answer's
  // escape — "may be deferred only through Proceed with Conditions".
  | { kind: 'requirementsNoOpenDeferrals'; section: string }
  // Round 4 question 24: the Countries / Markets parameter, which stopped being
  // mandatory at project creation, is recorded before Gate 1 passes.
  | { kind: 'identityMarketsRecorded' }
  // Round 4 question 36(b): the Costing / Commercial Feasibility Status is set to
  // something other than 'Not Started', with a rationale where it is N/A.
  | { kind: 'costingStatusRecorded' }
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
  // Not in the F1 appendix, but confirmed by the team in ANOTHER round — the
  // F1–F14 answers of 2026-07-21 (e.g. F14, "manual composition must be
  // reconciled to the controlled Cosmetri formula before Gate 7"). Added
  // 2026-08-11: the F1 appendix is one document, not the whole rule set, and
  // labelling an F14 rule "not SME-confirmed" understated its authority.
  //
  // Widened 2026-08-24 from "an EARLIER round" to any round, when Round 4
  // confirmed the last two `dev-decision` items (`sg02-product-type`,
  // `sg07-matrix-rows` — question 23). The distinction this value carries is
  // confirmed-elsewhere versus not-confirmed-at-all, and which round supplied the
  // confirmation was never what it meant.
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
  // Shown after the label when the app enforces only PART of what the rule says,
  // so a satisfied item never reads as "the whole rule is covered". Added
  // 2026-08-11 for C1, whose seven conditions include four the app cannot
  // evaluate — the failure mode CLAUDE.md names as having already cost us once.
  coverageNote?: string;
  // Blocks a plain Proceed but is explicitly allowed to stay open under Proceed
  // with Conditions — the treatment the open-non-critical-next-action blocker has
  // always had, now available to a config item. Added 2026-08-12 for D4's second
  // route through Gate 4 ("formally accepted through a controlled conditional
  // decision"): a conditionally accepted material must not let the gate pass
  // outright, but must not make it impassable either, which is the whole point of
  // the conditional route. Without this a config item is all-or-nothing.
  clearedByConditions?: boolean;
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
//
// ⚠️ Round 3 D1 (2026-08-07) rejected that reading in its own words: "Owner +
// Evidence link is not equivalent to Prepared, Reviewed and Approved sign-off."
// The replacement — three separately recorded sign-offs per gate, each carrying
// an authenticated user, role, timestamp, decision, record version and comment,
// plus an independent reviewer on safety-, regulatory-, claims- or
// release-critical gates — is NOT built. It waited on one decision the team had to
// make first: whether a gate sign-off keys on (project, gate) or (project, gate,
// market), which is where D1 meets E3(a)'s per-market Gates 10-11. Project owner's
// call, 2026-08-12: wait for the answer rather than build on a guess and migrate
// signatures afterwards.
//
// ✅ Both answers arrived 2026-08-24 (Round 4 questions 18 and 29), so the wait is
// over. The key is `(project, gate, market?, role)` with `market` used only at
// Gates 10-11 — option C of docs/plans/Post_Round3_Design_Decisions.md §1 — and
// all five open points of D1 are settled there. One thing question 29(1) asks for
// is still ours to scope: the gate-specific evidence snapshot names three
// components that are open-ended ("applicable checklist results", "mandatory and
// triggered evidence-register states", "evidence links and document revisions"),
// so how much of a register the snapshot covers is [ASSUMPTION: R5-Q7]
// [R4-REWORK: câu 18+29].
//
// Until then these 12 items still block on owner+evidenceLink, and the note below
// keeps the panel from presenting that as the sign-off D1 asks for — 12 green
// ticks reading as "three roles have signed" is worse than a red one, because
// nobody goes looking for what a green tick is hiding.
const GATE_SIGNOFF_COVERAGE_NOTE =
  'the app checks only that the gate has an Owner and an Evidence link. The review team have said that is not a sign-off: ' +
  'three separate records are required (prepared / reviewed / approved), each with the signed-in user, their role, the time, ' +
  'the decision, the record version and a comment — and an independent reviewer for safety, regulatory, claims or release ' +
  'decisions. Not built yet.';

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
      // CONFIRMED by Round 4 question 22(a), 2026-08-24: "Table layout accepted;
      // provides owner, status, evidence and rationale fields" — accepted on
      // exactly the grounds argued above.
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
      // than the identification card. Same confirmation as sg01-source above
      // (Round 4 question 22(a)).
      id: 'sg01-scope',
      label: 'Initial product scope',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'gateCheckDone', gate: '01', check: 'Initial product scope defined' },
          { kind: 'identityFieldFilled', field: 'initialScope' },
          { kind: 'checklistHasSelection', section: 'projectNature' },
          // Round 4 question 22(b), 2026-08-29: several development/change types
          // may apply, but one must lead. Kept inside this item rather than made
          // a row of its own — it is the same statement of scope, and a second
          // red line saying "now say which one" reads as a separate obligation.
          { kind: 'checklistPrimarySelected', section: 'projectNature' },
        ],
      },
    },
    {
      // Wired 2026-08-09 (SME Round 3 B3, option (a)): a lightweight Gate 1
      // capture that is deliberately NOT the Gate 02 checklists. Pointing this
      // at those would have forced Gate 2's full target-user and market work to
      // finish before Gate 1 could close — collapsing two gates into one.
      //
      // The `initialTargetMarkets` half duplicates `identity.markets`, the
      // workbook's own Countries / Markets parameter, which the create-project
      // form already requires — and B3 was answered on our statement that no
      // such field existed, which was wrong. Reading `identity.markets` instead
      // would make this half vacuous (the form guarantees a value), so it stays
      // as it was until the SME answered.
      //
      // Round 4 question 24 (2026-08-24, built 2026-08-29) resolved both halves at
      // once, and the vacuity objection with them: "Use the existing Countries /
      // Markets parameter as the single source of truth. Remove the separate
      // free-text Initial target market field. The Countries / Markets parameter
      // is not mandatory to create the initial project shell, but becomes
      // mandatory before Gate 1 passes." So the market half reads
      // `identity.markets` and is NOT vacuous — creation stopped guaranteeing it
      // on the same day. `initialTargetUsers` stays as it was: it duplicates
      // nothing, so B3's preliminary-capture reasoning still holds for it.
      id: 'sg01-market-user',
      label: 'Initial target market and user',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'identityFieldFilled', field: 'initialTargetUsers' },
          { kind: 'identityMarketsRecorded' },
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // B5 lists four things to require "where any vulnerable group is
      // selected": the flag itself, the applicable safety pathway, the
      // responsible reviewer, and notes on additional assessments. That is a
      // PER-ROW conditional — the "No vulnerable-user group identified" row
      // needs only the flag, since a pathway and a reviewer for a group nobody
      // identified would be nonsense.
      //
      // Until 2026-08-11 only the flag was enforced, on the grounds that the
      // conditional could not be expressed; the project owner read B5 again and
      // was right that the other three are required, not optional. The gap was
      // real: a row naming Pregnancy with no reviewer and no pathway passed
      // Gate 2. `registerRowsComplete` gained a `when` clause rather than the
      // rule being left unenforced.
      check: {
        kind: 'allOf',
        checks: [
          { kind: 'registerHasRows', register: 'vulnerableUserAssessment' },
          // Every row names a group — including the explicit "none".
          { kind: 'registerRowsComplete', register: 'vulnerableUserAssessment', columns: ['vulnerableGroup'] },
          // Rows that name a real vulnerable group carry all three follow-ups.
          {
            kind: 'registerRowsComplete',
            register: 'vulnerableUserAssessment',
            columns: ['safetyPathway', 'responsibleReviewer', 'additionalAssessments'],
            when: { column: 'vulnerableGroup', notIn: [NO_VULNERABLE_GROUP] },
          },
          // ...and the two records agree: a target user implying a vulnerable
          // group cannot sit next to an assessment naming a different group, or
          // next to "none" (2026-08-11, user-proposed). CONFIRMED by Round 4
          // questions 25(a) and 25(d), 2026-08-24 — the nine mapped pairs and the
          // deliberate asymmetry (an exact contradiction refused, a renamed or
          // broader group warned with a rationale) are both accepted.
          { kind: 'vulnerableGroupsCovered' },
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
      // no benchmark). Requiring every row would be inventing a rule.
      //
      // ONE row is checked: "Must-have product requirements", which every
      // project has by definition — a project with no must-have requirement is
      // not a project.
      //
      // "Explicit exclusions" was checked too until 2026-08-11, on the reading
      // that the appendix's own title says "requirements AND exclusions". The
      // user pointed out that not every project HAS an exclusion, and the
      // justification written here for it — that a row can be closed as
      // not-applicable — was simply false: `WorkStatus` is Not Started / In
      // Progress / Completed / On Hold / Backtracked, with no N/A the way
      // GateCheck's `ynna` and ChecklistItem's `status` have. So a project with
      // nothing to exclude had two bad options: mark Completed for work that
      // does not exist, or stay blocked at Gate 02 forever. That is the rule
      // docs/archive/F1_Gate_Readiness_Mapping_Proposal.md already stated —
      // only put `requirementDone` on rows universally applicable at that gate —
      // and this row broke it.
      //
      // The underlying gap (requirement rows cannot be closed as N/A with a
      // justification) is a known limitation, not something to work around by
      // requiring less than the SME asked.
      //
      // Round 4 question 21(b) (2026-08-24) closed the gap rather than the
      // question, and it is built (2026-08-29): **'N/A with rationale' is now a
      // valid disposition** on a requirement row — "The system must not require
      // users to mark an empty requirement as Completed", the exact objection
      // raised above. With that escape in place the Gate 2 rule is no longer one
      // row, so this item now carries the answer's own four conditions, and the
      // fifth ("a Should or Could requirement may be deferred only through
      // Proceed with Conditions") is the separate item immediately below.
      //
      // The 'Must-have product requirements' leg stays, unchanged and strict:
      // "The Must-have product requirements row is always mandatory", so N/A does
      // not satisfy that one whatever its priority says.
      id: 'sg02-requirements',
      label: 'Project requirements and exclusions',
      tier: 'Mandatory',
      check: {
        kind: 'allOf',
        checks: [
          {
            kind: 'requirementDone',
            section: 'projectRequirements',
            requirement: 'Must-have product requirements',
          },
          { kind: 'requirementsDispositioned', section: 'projectRequirements' },
        ],
      },
    },
    {
      // Question 21's fifth condition, kept as its own row precisely because it
      // behaves differently from the four above: a Should or Could requirement
      // that is not finished does not stop the gate outright — it may be
      // "deferred only through Proceed with Conditions". `clearedByConditions`
      // is the existing mechanism for exactly that (D4's conditional-acceptance
      // route), so this needs no new machinery in gateProgress.
      //
      // What the answer also asks for and this does NOT capture is the deferral's
      // own owner and due date. A requirement row has an Owner column but no due
      // date, and whether a deferral is supposed to become a controlled Next
      // Action (as question 33(c) requires for a safety action) or just a note on
      // the row is not stated [ASSUMPTION: R5-Q23].
      id: 'sg02-requirements-deferred',
      label: 'Should / Could requirements completed, or deferred under Proceed with Conditions',
      tier: 'Mandatory',
      clearedByConditions: true,
      check: { kind: 'requirementsNoOpenDeferrals', section: 'projectRequirements' },
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
      source: 'f-series',
      // Was `dev-decision` until 2026-08-24: never put to the team in any round,
      // since "Product type" appears exactly once in the Round 3 questions, inside
      // option (b) of B4 — and B4 was answered (a). CONFIRMED by Round 4 question
      // 23(a): "Gate 2 requires at least one product type or form status", so this
      // requirement was right.
      //
      // With one addition, built 2026-08-29: "the exact final form may legitimately
      // remain open", so `productType` gained the option **"Product form under
      // evaluation — to be confirmed by Gate 5"**. Without it a legitimate early
      // brief ("infant barrier product — cream or balm to be determined") could
      // not pass Gate 2 at all, which is the one failing case we could construct
      // ourselves when we asked. This check is unchanged — the option list it
      // reads is what gained the escape.
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
    {
      // Wired 2026-08-11, replacing `manual`: B7's classification now has a home,
      // and the claim ledger opens at Gate 3 so it can be filled in here.
      //
      // Checks ONLY the columns marked gate '03' on that register — id, wording,
      // category, risk. Requiring the whole row would block Gate 3 on an evidence
      // grade and a "Supported" status that cannot exist until Gates 8 and 10.
      // `registerRowsComplete` is non-vacuous, so it also means at least one claim
      // must be declared; how many is R4-Q16(d), still open.
      id: 'sg03-classification',
      label: 'Preliminary claim classification',
      tier: 'Mandatory',
      check: {
        kind: 'registerRowsComplete',
        register: 'claimEvidenceTraceability',
        columns: ['claimId', 'approvedWording', 'claimCategory', 'claimRisk'],
      },
    },
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
      // change" A3 exempts was our reading.
      //
      // ✅ Round 4 question 11 (2026-08-24) removed that reading entirely — "None
      // of the six project types is automatically administrative" — and it is
      // built: `NEW_OR_REPOSITIONED_NATURES` is gone, and the only exemption is a
      // recorded Administrative-only = Yes CONFIRMED by a named reviewer.
      //
      // One half of the answer is deliberately not enforced, and cannot be: the
      // exemption also requires that "no claim, formula, market positioning,
      // product performance, packaging function or customer-facing meaning
      // changes". That is the reviewer's judgement, and it is what confirming the
      // classification attests to — the app records who attested, not the six
      // sub-conditions. Stated on the item rather than implied away.
      coverageNote:
        'the app requires a recorded Administrative-only = Yes, confirmed by a named reviewer, before it exempts a project. ' +
        'It cannot itself verify the reviewer’s further test — that no claim, formula, market positioning, product performance, packaging function or customer-facing meaning changes.',
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
    {
      // Wired 2026-08-11, replacing `manual`. C1 was confirmed long ago but had
      // nothing to read: the per-claim classification did not exist, and neither
      // did anywhere to record that a review happened. Both now do.
      //
      // Enforces FIVE of C1's seven conditions: the three reading B7's
      // classification, the wording-drift check, and — since 2026-08-24 — "the
      // market imposes a specific restriction", which question 4's Market profiles
      // dataset made readable. The remaining two are named on the item itself via
      // `coverageNote` rather than left implied, because quietly enforcing half a
      // rule and reporting it as met is the mistake this repo has already made.
      id: 'sg03-reg-claims',
      label: 'Regulatory review of high-risk or borderline claims',
      tier: 'Conditional',
      trigger: 'claimNeedsRegulatoryReview',
      coverageNote: `the app checks the claim's category and risk; it cannot yet check: ${UNEVALUATED_C1_CONDITIONS.join('; ')}`,
      check: { kind: 'claimsRegulatoryReviewed' },
    },
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // D4: "Missing evidence must appear in Gate Readiness. Gate 4 must not pass
      // until all applicable raw materials are adequately reviewed or formally
      // accepted through a controlled conditional decision." Before 2026-08-12
      // nothing in the engine read `approvedForUse` at all, so a formula imported
      // from Cosmetri could produce twenty identity-only stubs and Gate 4 still
      // showed green — `sg04-identity` even PASSED on them, since it only asks for
      // `inciName` and the import fills exactly that.
      //
      // "Applicable" is read as every row in the register: at Gate 4 there is no
      // BOM yet (that is Gate 5), so the register IS the candidate ingredient set
      // — which is also what the sg04-ingredients note above says. A material
      // screened and then dropped is excluded by dispositioning it "Considered —
      // not used", not by deleting the row. CONFIRMED by Round 4 questions 31(a)
      // and 31(b), 2026-08-24 — "every row in the candidate raw-material register
      // must be dispositioned before Gate 4 passes", and the not-used status is
      // retained rather than the record deleted. Note the confirmation is
      // specifically about GATE 4; question 31(f) narrows the same check at Gates
      // 7, 10 and 11 — see those items.
      id: 'sg04-rm-dispositioned',
      label: 'Every raw material has an evidence review outcome recorded',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'rmEvidenceDispositioned' },
    },
    {
      // The softer half of the same D4 sentence: a conditionally accepted material
      // is "formally accepted", so it must not make Gate 4 impassable — but it is
      // not "adequately reviewed" either, so it must not let a plain Proceed
      // through. That is precisely the F9 treatment of an open Change Control the
      // team already specified, reused here rather than invented
      // CONFIRMED by Round 4 question 31(c), 2026-08-24: the conditional route is
      // Proceed with Conditions plus a linked controlled action, and "no separate
      // duplicate approval field is required" provided the row carries the
      // qualified reviewer's conclusion, the gate approver is authorised, and the
      // condition and action are explicitly referenced in the gate decision.
      id: 'sg04-rm-conditional',
      label: 'No raw material is resting on a conditional acceptance',
      tier: 'Mandatory',
      source: 'f-series',
      clearedByConditions: true,
      check: { kind: 'rmEvidenceNoneConditional' },
    },
    {
      // Project owner, 2026-08-12: the two checks above are both "every row
      // satisfies P", and a register whose rows are ALL "Considered — not used"
      // satisfies each of them while leaving nothing to formulate with — Gate 4
      // would pass having screened everything and cleared nothing.
      //
      // Deliberately NOT "at least one row Approved for use", which would
      // contradict D4's own conditional route: a project whose materials are all
      // conditionally accepted has zero approved rows and is exactly what D4
      // describes. See `hasUsableRmRow`. CONFIRMED by Round 4 question 31(e),
      // 2026-08-24, including the "at least one suitable OR CONDITIONALLY suitable
      // route must remain" wording this counting rule was built on.
      id: 'sg04-rm-usable',
      label: 'At least one raw material is usable in the formula',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'rmEvidenceHasUsable' },
    },
    {
      // Rule D3, built 2026-08-12. Until then a row at "REVIEW - possible formula
      // match" blocked NOTHING at Gate 4 — plain Proceed included — and only bit at
      // Gate 7, after the formula had been locked at Gate 5. We reported that
      // ourselves in Round 3 D3; this is the answer being implemented.
      //
      // Covers three of D3's four rules at once, because all three end the gate
      // outright: a Critical verdict, a flagged row with no verdict, and a verdict
      // missing the record it requires (a linked controlled action for Non-critical
      // and Further information required; the evidence link for Not a true match).
      id: 'sg04-watchlist-reviewed',
      label: 'Every possible watch-list match has a qualified reviewer assessment on record',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'watchlistReviewed' },
    },
    {
      // D3's fourth rule: Non-critical "may permit Proceed with Conditions", and
      // Further information required "may allow Proceed with Conditions only with
      // authorised acceptance and a linked controlled action". Same severity as an
      // open Change Control under F9, so the same treatment.
      id: 'sg04-watchlist-conditional',
      label: 'No watch-list match is resting on a reviewer assessment that needs conditions',
      tier: 'Mandatory',
      source: 'f-series',
      clearedByConditions: true,
      // D3 asks for "authorised acceptance" on Further information required
      // specifically. Recording the Proceed with Conditions decision is an audited
      // act by a role permitted to decide the gate, but it is not a separate
      // acceptance step, so the difference is disclosed rather than implied.
      coverageNote:
        'the app requires the reviewer assessment, rationale and a linked controlled action, then lets Proceed with Conditions clear it. ' +
        // ✅ Round 4 question 32(c), fully built 2026-08-24. Proceed with Conditions
        // IS the acceptance — "a separate duplicate acknowledgement is not
        // required" — and its authority condition is now enforced server-side by
        // `assertCanCarryConditions`, via the two new `watchlist-finding`
        // capabilities. Which of the two is "required" for a machine-flagged row is
        // the one part still open [ASSUMPTION: R5-Q14].
        'The review team confirmed that is enough, provided the person deciding the gate holds Safety or Regulatory authority — which the app now checks. Either authority satisfies it; which one a machine-flagged row requires is not yet settled.',
      check: { kind: 'watchlistNoneConditional' },
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
      // ⚠️ The Gate 4 vs Gate 7 threshold split below was our reading, not
      // something the appendix states, and Round 4 question 6 (2026-08-24)
      // corrects it: "Gate 4 screens and DISPOSITIONS every relevant candidate"
      // and "must not pass with unassessed rows". So the deliberately
      // conservative badValues below — which let a maternal project sail through
      // Gate 4 with every row still at its seeded 'Not assessed' — are too loose.
      // Gate 4 keeps its lighter close-out (the full final close-out stays a Gate
      // 7 matter) but every row must carry one of six dispositions: No issue
      // identified · Needs Safety Review · Needs Regulatory Review · Prohibited —
      // remove · Considered — not selected · Further information required
      // [R4-REWORK: câu 6].
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
      // register does not pass.
      //
      // ✅ Round 4 question 17 (2026-08-24) gave the "where relevant" in the label a
      // data source, so this stopped being a Conditional item that could never
      // block: the trigger reads the company Raw Material Risk Overlay against the
      // materials this project uses. It now hard-blocks Gate 4 when any of them
      // carries a risk classification — and also when any of them is unclassified,
      // which is question 7's third state rather than a silent pass.
      trigger: 'rmRiskFlagged',
      check: { kind: 'registerRowsComplete', register: 'supplierRmEvidence', columns: ['allergenStatement', 'impurities'] },
    },
    {
      // Added 2026-07-28 (see the note above GATE_READINESS).
      id: 'sg04-signoff',
      label: 'Prepared, reviewed and approved sign-off',
      tier: 'Mandatory',
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
    // Was `manual` until 2026-08-29 — CostingInputs had no status field and its
    // numbers are pre-filled with non-blank defaults at project creation, so
    // there was no non-invented "has this been considered" signal to read.
    // Round 4 question 36(b) supplied one: a Costing / Commercial Feasibility
    // Status with six values, plus assessor, review date, assumptions and an
    // evidence link. Supporting tier, exactly as the answer says — it warns.
    {
      id: 'sg05-costing',
      label: 'Costing or commercial feasibility status',
      tier: 'Supporting',
      check: { kind: 'costingStatusRecorded' },
    },
    {
      // The other half of 36(b): the item "remains a Supporting Gate 5 item
      // unless the project is specifically designated as commercially dependent
      // on a defined cost or margin. Where that commercial requirement is a Must,
      // failure should result in Hold or Proceed with Conditions rather than
      // being ignored."
      //
      // The designation needed no new field: question 21 gives the Phase 1
      // requirement row "Target cost or commercial boundary" a Must / Should /
      // Could priority, and Must is the word the answer itself uses. So this is
      // the same check as above, escalated by that trigger and cleared by
      // Proceed with Conditions — which is what "Hold or Proceed with
      // Conditions rather than being ignored" describes.
      id: 'sg05-costing-must',
      label: 'Costing status recorded — this project is commercially dependent',
      tier: 'Conditional',
      trigger: 'commercialRequirementIsMust',
      clearedByConditions: true,
      check: { kind: 'costingStatusRecorded' },
    },
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // Rule D4. "Gate 7 final safety approval must use the completed evidence status." Both legs: nothing left undispositioned, AND nothing still resting on a conditional acceptance — a conditional acceptance has an open controlled action by definition, so it is not a COMPLETED evidence status. Unlike Gate 4 this does not clear with Proceed with Conditions. The second half is CONFIRMED by Round 4 question 31(d), 2026-08-24: "A conditionally accepted material included in the final formula must be fully closed before Gate 7 final safety approval."
      //
      // ⚠️ But question 31(f) narrows the SCOPE, which is the half we got wrong.
      // We applied the Gate 4 reading ("applicable" = every row in the register) at
      // all four gates, for consistency. The answer: at Gates 7, 10 and 11 the
      // formula exists, so "the hard block applies to materials ACTUALLY PRESENT in
      // the current formula. Materials formally dispositioned as not used should
      // not block those gates. An incomplete non-formula candidate may produce a
      // warning but should not block release where the product does not rely on
      // it." So both legs here must be scoped to the BOM, and the out-of-formula
      // remainder becomes a warning [R4-REWORK: câu 31(f)].
      id: 'sg07-rm-evidence-complete',
      label: 'Raw-material evidence review complete for every material',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'allOf', checks: [{ kind: 'rmEvidenceDispositioned' }, { kind: 'rmEvidenceNoneConditional' }] },
    },
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
      // ⚠️ Round 4 question 5 (2026-08-24) answers **option (b)**, and this item as
      // it stands is the wrong shape for it. Gate 7 requires a GENERAL
      // restricted-and-caution ingredient assessment for **every product**; the
      // Pregnancy/Breastfeeding Caution assessment is "an additional conditional
      // layer", and the Infant/Baby Safety screen is a third. So one Conditional
      // item on `skincareForTwo` becomes three:
      //
      //   general prohibited/restricted/caution → Mandatory, all products
      //   maternal caution                      → Conditional, skincareForTwo
      //   infant / baby safety                  → Conditional, infantContact
      //
      // Where both intended-use contexts are selected, both pathways apply. The
      // general layer has no register today — `prohibitedIngredients` and
      // `pbCautionLimits` are the only two — so it is a build, not a re-tier
      // [R4-REWORK: câu 5].
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
      // E1 answered this one against us: "Please add a distinct safety-finding
      // control rather than relying solely on the Final Safety Sign-off." It used
      // to share sg07-final-safety's check, on the reasoning that no separate
      // critical-finding field existed anywhere — true at the time, and the comment
      // said a distinct field would be "a config addition, not a rule change". The
      // team asked for the addition, so here it is, reading its own register.
      // ✅ Round 4 question 33 (2026-08-24) graded what was one binary check.
      // Split into two items because they differ in severity, exactly like the two
      // Next Actions items and the two raw-material ones: this one cannot be
      // cleared by any decision, the next one can.
      id: 'sg07-no-critical',
      label: 'No unresolved critical or high safety finding',
      tier: 'Mandatory',
      coverageNote:
        'the app checks the reviewer conclusion, the evidence link and a completed controlled action before a High or Critical finding counts as closed. ' +
        'It cannot yet check the remaining three the review team named — verification, the verifier and a closure date — as the register has no columns for them.',
      check: { kind: 'noOpenCriticalSafetyFinding' },
    },
    {
      // Question 33's middle band: "A Medium finding may permit Proceed with
      // Conditions where formally accepted and controlled." `clearedByConditions`
      // is that mechanism — the same one D4 uses for a conditionally accepted
      // material and F9 for an open change control — so recording the decision IS
      // the formal acceptance, with no separate step invented.
      //
      // A Low finding blocks nothing, but `warningSafetyFindings()` surfaces it, so
      // it is not silently dropped: "A finding assessed as non-critical must still
      // be appropriately dispositioned."
      id: 'sg07-medium-findings',
      label: 'No open medium safety finding',
      tier: 'Mandatory',
      source: 'f-series',
      clearedByConditions: true,
      check: { kind: 'noOpenMediumSafetyFinding' },
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      source: 'f-series',
      // Not an F1-named item. Guards the three per-column matrix checks above:
      // `.every()` over an empty register is vacuously true, so the row-count
      // check has to be Mandatory too.
      //
      // The GUARD was ours and needed no confirmation — an empty register must not
      // satisfy a check. What did need it was the cardinality this implies: that
      // the matrix must carry a row for EVERY formula ingredient. CONFIRMED by
      // Round 4 question 23(b), 2026-08-24: "At Gate 7, every ingredient in the
      // final formula must have a safety disposition… Every formula line must show
      // it has been covered and linked to the relevant assessment."
      //
      // ⚠️ With a proportionality rule this row-count check cannot express:
      // "low-risk excipients do not each need a lengthy monograph", and coverage
      // may be shown four ways — individual assessment · reference to an existing
      // approved ingredient assessment · group or class assessment where
      // scientifically justified · reference to an accepted regulatory/safety
      // conclusion. Relevant mixture components, impurities and residuals must
      // also be assessed where required [R4-REWORK: câu 23(b)].
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
      // E1: "Infant-only products should trigger the Infant/Baby Safety pathway
      // instead." Built 2026-08-12 — NOT from new content, but by requiring the
      // workbook's own Compartment 3 for the projects it is plainly about. It was
      // reachable before only via skincareForTwoIncompleteSections, i.e. only when a
      // MATERNAL user was selected, so an infant-only product completed nothing at
      // Gate 7 at all.
      //
      // This did NOT close Round-2 A2: the team's own pathway might cover more than
      // these eight rows, and until they sent it we were enforcing the workbook's
      // version rather than theirs.
      //
      // Round 4 question 1 (2026-08-24) answers it: "Retain Compartment 3 as the
      // core Gate 7 Infant & Baby Safety assessment… Existing controls INF-01 to
      // INF-08 remain appropriate." So this item is right, and the hard block is
      // confirmed in their own words: "Gate 7 must hard-block if the Infant 0+
      // pathway is triggered and this assessment is incomplete."
      //
      // ⚠️ But Compartment 3 is "the FINAL COMPONENT of a broader pathway spanning
      // multiple gates — not the entire pathway by itself". Six other gates carry
      // requirements that do not exist in the app at all: Gate 2 (10 items of
      // intended infant-use context) · Gate 4 (8 ingredient-suitability items) ·
      // Gate 5 (7 formula-level items) · Gate 6 (7 packaging and instruction items)
      // · Gates 8–9 (testing triggered by use context and risk) · Gate 10 (6 PIF
      // content items). Until those exist, an infant project is screened at Gate 7
      // and nowhere earlier [R4-REWORK: câu 1].
      id: 'sg07-infant-safety',
      label: 'Infant / baby-contact safety compartment completed (INF-01 to INF-08)',
      tier: 'Conditional',
      trigger: 'infantContact',
      check: { kind: 'requirementSectionComplete', section: 'infantSafety' },
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
      // This row is E1's fourth line in practice — "General products should record
      // N/A with rationale where neither pathway applies" — which is why it stays
      // Mandatory and unconditional: the N/A itself is the required record, so
      // auto-passing it would remove the very statement E1 asks for.
      //
      // What was missing (2026-08-12, project owner): the row's own wording is
      // "where triggered", the app can evaluate that trigger, and NA was accepted
      // regardless. So on a project with Pregnancy selected, this row could be
      // dismissed as not applicable while `sg07-maternal-infant` blocked the same
      // gate for the opposite reason. Now an active trigger requires done+Y.
      check: {
        kind: 'gateCheckDone',
        gate: '07',
        check: 'Pregnancy/breastfeeding and baby-contact screen completed where triggered',
      // Both triggers, because the row's own label covers BOTH subjects —
      // "Pregnancy/breastfeeding AND baby-contact". An infant-only project could
      // previously dismiss it as not applicable, which is exactly the product for
      // which baby contact is the whole point.
        naInvalidWhenTrigger: ['skincareForTwo', 'infantContact'],
      },
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
      // recorded, which is already too late.
      //
      // ✅ Round 4 question 9 (2026-08-24) kept that reasoning and added the field
      // we offered as the alternative, now built: "Human-participant study planned?
      // → Yes / No / Undecided". A started Study Protocol still counts and is
      // checked first, so it remains one input rather than the whole trigger, and
      // **Undecided prevents Gate 8 from closing** — it resolves to `notAssessed`,
      // and a Conditional item with an unassessed trigger blocks.
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // Trigger wired 2026-08-24 (Round 4 question 12). Until then this was one of
      // the three Conditional items with no trigger at all, so it could never block
      // however risky the change — the exact "Conditional in name only" gap A3 was
      // meant to close. Fires on a Major formula change, or on the reviewer's own
      // answer; Pending assessment blocks, which is the answer's own instruction.
      trigger: 'scaleUpRiskIdentified',
      coverageNote:
        'triggered by a Major formula change or by the reviewer’s own Yes / Pending answer. ' +
        'The eighteen affected areas that should also trigger it — manufacturing site, equipment scale, batch size, order of addition and the rest — are not read yet; they belong on the change record, which is being restructured.',
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
    {
      // E2 answered the reasoning that kept this `manual`. It was left unenforced
      // because requiring the ASEAN checklist of every project would wrongly block a
      // product not sold in ASEAN — right premise, wrong conclusion. The team's
      // answer is to enforce it PER MARKET: "The absence of a built-in country
      // template should not mean the item is unenforced."
      id: 'sg10-checklist',
      label: 'Applicable regulatory checklist recorded for every market without a built-in profile',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'marketChecklistRecorded' },
    },
    {
      // The other half of E2, split out because it is Conditional and the half above
      // is not — a project selling only outside ASEAN must not be asked for this,
      // and a project selling only inside it needs no per-market rows.
      id: 'sg10-checklist-asean',
      label: 'ASEAN PIF checklist complete',
      tier: 'Conditional',
      trigger: 'aseanMarket',
      source: 'f-series',
      check: { kind: 'aseanChecklistComplete' },
    },
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
      // Rule D4. "Gates 10 and 11 must not rely on unresolved identity-only stubs." Same pairing as Gate 7 — an unresolved stub blocks, and so does a still-open conditional acceptance, since releasing a dossier that rests on one would be relying on unfinished evidence.
      //
      // ⚠️ Scope narrows here exactly as at Gate 7 — Round 4 question 31(f),
      // 2026-08-24: only materials actually present in the current formula
      // hard-block; an incomplete candidate the product does not contain warns
      // instead. The counter-argument we put ourselves ("a gate arguably does not
      // rely on a material the product does not contain", quoting D4's own "must
      // not RELY on") is the one that was accepted [R4-REWORK: câu 31(f)].
      id: 'sg10-rm-evidence-complete',
      label: 'No unresolved raw-material evidence stub',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'allOf', checks: [{ kind: 'rmEvidenceDispositioned' }, { kind: 'rmEvidenceNoneConditional' }] },
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
      // Wired 2026-08-12. The catalogue had this "waiting on B7"; B7 landed on
      // 11/08 as the per-claim category, so the trigger became readable. Which
      // categories count is the one judgement — see
      // CLAIM_CATEGORIES_NEEDING_PERFORMANCE_EVIDENCE.
      id: 'sg10-performance-evidence',
      label: 'Product-performance evidence attached where relevant',
      tier: 'Conditional',
      trigger: 'claimNeedsPerformanceEvidence',
      coverageNote:
        // ⚠️ Round 4 question 36(a) settles what this note used to call unsettled,
        // and the other way round [R4-REWORK: câu 36(a)].
        'triggered by a claim categorised Product performance or Sensory. The review team have since confirmed that a Cosmetic claim asserting an outcome of the finished product triggers it too — the app does not check that yet.',
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // Rule D4. "Gates 10 and 11 must not rely on unresolved identity-only stubs." Repeated at Gate 11 rather than assumed from Gate 10: a gate is evaluated on its own list, and Gate 10 could have passed under Proceed with Conditions.
      //
      // ⚠️ Same narrowing as Gates 7 and 10 — Round 4 question 31(f), 2026-08-24:
      // scope this to materials in the current formula, and warn rather than block
      // on the rest [R4-REWORK: câu 31(f)].
      id: 'sg11-rm-evidence-complete',
      label: 'No unresolved raw-material evidence stub',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'allOf', checks: [{ kind: 'rmEvidenceDispositioned' }, { kind: 'rmEvidenceNoneConditional' }] },
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
    // E3(b) answered the question the old comment was waiting for, and answered it
    // against the old design: "Therefore, Gate 11 requires more than a duplicate
    // warning. It must evaluate the impact classification and closure status of
    // each open Change Control." The F9/C4 soft lock treats every open change
    // alike; these two items grade them, which is what makes them not a duplicate.
    {
      id: 'sg11-changes-blocking',
      label: 'No open change control that is launch-impacting, high risk, or affects formula, artwork, claims, safety, regulatory, packaging or release',
      tier: 'Mandatory',
      source: 'f-series',
      check: { kind: 'changeControlNoHardImpact' },
    },
    {
      id: 'sg11-changes-admin',
      label: 'No open low-risk administrative change control',
      tier: 'Mandatory',
      source: 'f-series',
      clearedByConditions: true,
      // E3(b) allows this one through "following authorised acknowledgement". The
      // acknowledgement is F9's existing confirm step on the Phase Gate Flow row,
      // not a second one built here — recorded so the difference is not implied away.
      coverageNote:
        'the app requires the change to be classified as administrative only and lets Proceed with Conditions clear it, using the existing open-change acknowledgement. ' +
        // ✅ Round 4 question 34(d), built 2026-08-24: the existing acknowledgement
        // is reused, and it is now role-restricted — only a role holding
        // `change-impact|acknowledge` can record the Proceed-with-Conditions that
        // carries an open change, enforced in `assertCanCarryConditions`.
        //
        // Five of the six fields the answer lists were already captured by the
        // decision itself: the authenticated user, their role, the timestamp and
        // the conditions accepted all live on the gate change log and (once Round 4
        // question 29 lands) the gate sign-off. The Change Control reference is on
        // the change record. What is NOT captured is a rationale specific to the
        // acknowledgement, as opposed to the gate decision's own comment — stated
        // here rather than implied away.
        'The review team confirmed that acknowledgement may serve, and it is now restricted to a role authorised to approve the change’s Gate 11 impact. ' +
        'The acknowledgement does not yet carry its own rationale separate from the gate decision’s comment.',
      check: { kind: 'changeControlNoAdminImpact' },
    },
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
      // Wired 2026-08-12. Three of A3's seven limbs are readable: a safety signal
      // or complaint trend ticked on Post-Market Sources, and a vulnerable-user
      // population (B5's assessment register, which exists since 11/08). The other
      // four need reference data nobody has supplied — product category list,
      // market and company policy, surveillance plan — so the item says so.
      id: 'sg12-pv-pms',
      trigger: 'pvPmsRequired',
      coverageNote:
        // ⚠️ Round 4 question 4 reshapes this item rather than just filling its
        // gaps: a BASELINE review is required for every marketed product (so the
        // Conditional tier is about the ENHANCED one), the enhanced trigger has
        // fourteen limbs rather than seven, and the market limb comes from the
        // configurable Regulatory market profile — explicitly NOT a hard-coded
        // country list [R4-REWORK: câu 4].
        'the app checks three of the conditions — a safety signal or complaint trend recorded on Post-Market Sources, and a vulnerable-user population assessed. It does not yet check the product-category, market-profile, company-policy or surveillance-plan conditions, and does not yet require the baseline review every marketed product needs.',
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
      // Wired 2026-08-12, unblocked by E3(b) putting `changes` on ProjectData —
      // until then the engine could not see whether a change control existed.
      id: 'sg12-change-links',
      // ✅ Round 4 question 8 (2026-08-24) turned the unreadable half into a
      // recorded one, and it is built: the trigger reads an open record OR the
      // reviewer's explicit answer, with Pending and unanswered both blocking.
      //
      // What remains disclosed is the GRANULARITY: the answer is held once per
      // project, because the app has no per-finding record to attach it to
      // [ASSUMPTION: R5-Q11].
      trigger: 'openChangeControl',
      coverageNote:
        'the app checks whether a change control record is open, or whether a reviewer has recorded an explicit Yes / No answer. ' +
        'That answer is held once for the project, not per post-market finding — the app has no per-finding record to attach it to.',
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
      coverageNote: GATE_SIGNOFF_COVERAGE_NOTE,
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
