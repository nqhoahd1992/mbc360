import type { GateRecord, NextAction, ProjectData, RegisterRow } from '../types';
import { GATE_SIGNOFF_ROLES, NEXT_ACTION_TERMINAL_STATUSES, familyUseAgeGroupList, isRegisterClosed, isSignedOff } from '../types';
import type { GateSignOffRole } from '../types';
import { COSTING_STATUS_NOT_APPLICABLE, GATES, REQUIREMENT_NOT_APPLICABLE } from '../config/gates';
import { findGateSignOff, gateSignOffMarkets, isGateSignOffSigned } from '../config/gateSignOff';
import { gateEvidenceSnapshot, snapshotChanges } from './gateSnapshot';
import { isChangeOpen } from '../config/changeTriggers';
import {
  CLAIM_CATEGORIES_NEEDING_PERFORMANCE_EVIDENCE,
  GATE4_DISPOSITION_OPTIONS,
  REGISTER_CONFIGS,
  SAFETY_COVERAGE_INDIVIDUAL,
} from '../config/registers';
import {
  CLAIM_CATEGORIES_NEEDING_REVIEW,
  CLAIM_REVIEWED_WORDING_COLUMN,
  CLAIM_REVIEW_COLUMNS,
  CLAIM_RISKS_NEEDING_REVIEW,
  CLAIM_WORDING_COLUMN,
  marketRestrictsClaims,
} from '../config/claimReview';
import { rmCodesUnclassified, rmCodesWithRiskFlags } from '../config/referenceData';
import { TARGET_USER_TO_VULNERABLE_GROUP } from '../config/vulnerableGroups';
import {
  RM_EVIDENCE_REGISTER,
  conditionallyAcceptedRmRows,
  hasUsableRmRow,
  rmRowsInFormula,
  rmRowsNotInFormula,
  unresolvedRmRows,
} from './rmEvidence';
import { WATCHLIST_REGISTER, watchlistConditionalRows, watchlistHardBlockers } from './watchlistReview';
import { conditionalSafetyFindings, hardBlockingSafetyFindings } from './safetyFindings';
import { gate11ConditionalChanges, gate11HardBlockingChanges } from './changeImpact';
import {
  ASEAN_CHECKLIST_REGISTER,
  MARKET_DOSSIER_REGISTER,
  aseanChecklistIncomplete,
  marketsWithoutChecklist,
  projectHasAseanMarket,
} from './marketDossier';
import {
  GATE_READINESS,
  type ReadinessCheck,
  type ReadinessRequirement,
  type ReadinessSource,
  type ReadinessTier,
  type ReadinessTrigger,
  type RmEvidenceScope,
  type TriggerState,
} from '../config/gateReadiness';

// Progression rules (confirmed by the subject-matter team — see
// docs/rules/Business_Rules_Confirmation_EN.md, decisions B1-B4/C1):
//  - A gate is PASSED only when (B1): Stage status is Complete, a positive gate
//    decision (Proceed / Proceed with Conditions) is recorded, AND no blockers
//    remain — open next actions block a plain Proceed (they may stay open only
//    under Proceed with Conditions), and the Skincare-for-Two safety screen
//    hard-blocks Gate 07 when triggered (C1).
//  - Complete without a decision = Pending (not passed).
//  - A Gap prevents a normal Proceed decision (enforced in the gate flow UI).
//  - A phase is COMPLETE only when (B3): all its gates are passed, all key gate
//    checks are done or justified N/A, all 8 angles are covered or justified
//    N/A, next actions are closed (unless Proceed with Conditions), and all
//    three sign-off roles (Prepared / Reviewed / Approved) are signed.
//    Sign-off only becomes available once the other conditions are met.
//  - Gates unlock strictly in order: a gate opens only when every earlier gate
//    is passed and every earlier phase is complete.
//  - Backtrack (B4) reopens an earlier gate range for rework and invalidates
//    affected approvals, but never deletes: prior values are preserved in the
//    project's backtrackEvents audit log ("no silent corrections").

const PASSING_DECISIONS = ['Proceed', 'Proceed with Conditions'];

export function gateIndex(gateId: string): number {
  return GATES.findIndex((g) => g.id === gateId);
}

// ---------------------------------------------------------------------------
// Next actions (rule B2)
// ---------------------------------------------------------------------------

// "Open" = any action not in a terminal status (Closed / Cancelled) — rule F8.
export function openNextActions(project: ProjectData, gateId: string): NextAction[] {
  return project.nextActions.filter(
    (a) => a.gateId === gateId && !NEXT_ACTION_TERMINAL_STATUSES.includes(a.status),
  );
}

// ---------------------------------------------------------------------------
// Skincare for Two (rule C1)
// ---------------------------------------------------------------------------

// Auto-trigger: the confirmed maternal life-stage selections on the Gate 02
// target-user checklist. ("Infant 0+" alone is follow-up question F2.)
const SKINCARE_FOR_TWO_TRIGGERS = ['Pregnancy', 'Breastfeeding', 'Postpartum'];
// E1's infant pathway keys off this one option, separately from the three above.
const INFANT_TARGET_USER = 'Infant 0+';
// Round 4 question 25(c): the target-user option that asks a question rather than
// answering one — see the `infantContact` trigger.
const FAMILY_USE_TARGET_USER = 'Family use';
// A3's "safety signal … complaint trend" limbs, as they appear on the Gate 12
// Post-Market Sources checklist.
//
// ⚠️ Round 4 question 10 (2026-08-24) confirms the mapping but says the option
// list itself is wrong: the sixteen options mix SOURCE, ISSUE TYPE and RESULTING
// ACTION, and should be three separate lists. It also widens this limb — a
// complaint counts only where it has a safety component, and consumer, HCP or
// social-media feedback tagged as a potential safety issue counts too, neither of
// which a flat label list can express [R4-REWORK: câu 10].
const PV_PMS_SOURCE_LABELS = ['Adverse event / PV signal', 'PMS trend', 'Complaint'];
// B5's register — a row here means a vulnerable-user population was assessed.
const VULNERABLE_REGISTER = 'vulnerableUserAssessment';

export function skincareForTwoTriggers(project: ProjectData): string[] {
  const targetUsers = project.checklists['targetUsers'] ?? [];
  return targetUsers
    .filter((item) => item.selected && SKINCARE_FOR_TWO_TRIGGERS.includes(item.label))
    .map((item) => item.label);
}

export function isSkincareForTwoTriggered(project: ProjectData): boolean {
  return skincareForTwoTriggers(project).length > 0;
}

// Requirement sections (Phase 3 config keys) that must be fully Completed
// before Gate 07 can pass once Skincare for Two is triggered. Maternal safety
// AND infant-contact assessment are both mandatory.
const SKINCARE_FOR_TWO_SECTIONS: { key: string; title: string; trigger?: string[] }[] = [
  { key: 'skincareForTwo', title: 'Skincare for Two - Mandatory Safety Checks' },
  { key: 'infantSafety', title: 'Compartment 3 - Infant / Baby-Contact Safety' },
  { key: 'pregnancySafety', title: 'Compartment 1 - Pregnancy Safety', trigger: ['Pregnancy'] },
  { key: 'breastfeedingSafety', title: 'Compartment 2 - Breastfeeding Safety', trigger: ['Breastfeeding', 'Postpartum'] },
];

// Titles of the mandatory safety sections that are not yet fully Completed.
export function skincareForTwoIncompleteSections(project: ProjectData): string[] {
  const triggers = skincareForTwoTriggers(project);
  if (triggers.length === 0) return [];
  return SKINCARE_FOR_TWO_SECTIONS.filter((section) => {
    if (section.trigger && !section.trigger.some((t) => triggers.includes(t))) return false;
    const rows = project.requirements[section.key] ?? [];
    return rows.some((r) => r.status !== 'Completed');
  }).map((s) => s.title);
}

// ---------------------------------------------------------------------------
// Gate readiness — mandatory evidence per gate (rule F1 / C7)
// ---------------------------------------------------------------------------

// Which of the three states does a named trigger hold for this project?
// (Round 4 question 7, option (b) — see `TriggerState` in config/gateReadiness.ts.)
//
// Of the ten triggers below, exactly THREE can return `notAssessed` today:
//   - `microbiologicallySusceptible` — its field is empty until a person picks one
//     of five values, so empty IS "not yet assessed". The one case question 7
//     names outright, and the shape the other seven should copy;
//   - `openChangeControl` and `humanStudyPlanned` — explicit Yes/No/Pending fields
//     from questions 8 and 9.
// The other SEVEN are inferred from a checklist, a register or `identity.markets`,
// where an empty source is indistinguishable from a considered no; they are listed
// in `TRIGGERS_WITHOUT_UNASSESSED_STATE` and keep two-state behaviour until R5-Q5
// answers. That is a disclosed shortfall, not an oversight.
//
// Question 12 supplies a trigger for `sg09-scaleup`, which has none at all today,
// rather than a third state for an existing one.
// A trigger that can only answer yes-or-no. Every call site is a trigger listed in
// `TRIGGERS_WITHOUT_UNASSESSED_STATE`, so the shortfall is visible in the code
// rather than only in a doc — `return twoState(…)` reads as "this one cannot tell
// an empty source from a considered no yet".
const twoState = (applies: boolean): TriggerState => (applies ? 'applies' : 'doesNotApply');

function evaluateTrigger(project: ProjectData, trigger: ReadinessTrigger): TriggerState {
  switch (trigger) {
    case 'skincareForTwo':
      return isSkincareForTwoTriggered(project) ? 'applies' : 'doesNotApply';

    // E1's third line, "Infant-only products should trigger the Infant/Baby Safety
    // pathway instead". Deliberately independent of skincareForTwo: a maternal
    // project already reaches the same section through
    // skincareForTwoIncompleteSections, while an infant-only one reached nothing.
    // E2: the built-in ASEAN checklist applies only where an ASEAN market is sold
    // into. Everything else is covered by the per-market register instead.
    // A3, Gate 12, first limb only: a change control record IS open. The second
    // limb — "or should be opened because of the post-market finding" — is a
    // judgement no rule can make, and dropping it silently is the mistake CLAUDE.md
    // names, so the item carries a coverageNote saying which half is checked.
    // ✅ Round 4 question 8 (2026-08-24) closed the "or should be opened" half by
    // recording the judgement instead of inferring it. Two independent limbs now:
    // an OPEN record (the machine-readable half, unchanged), or a reviewer having
    // answered Yes. `Pending assessment` — and no answer at all — is the third
    // state, which blocks rather than passing.
    case 'openChangeControl': {
      const recordOpen = project.changes.some(
        (c) => (!c.projectId || c.projectId === project.identity.id) && isChangeOpen(c.status),
      );
      if (recordOpen) return 'applies';
      const answer = project.assessments.changeControlRequired?.trim() ?? '';
      if (answer === '') return 'notAssessed';
      if (answer === 'Pending assessment') return 'notAssessed';
      return answer === 'Yes' ? 'applies' : 'doesNotApply';
    }

    // A3, Gate 12: three of seven limbs. The Post-Market Sources checklist carries
    // the safety-signal and complaint-trend limbs; B5's Vulnerable-User Assessment
    // carries the vulnerable-population one. An OR-trigger can be wired limb by
    // limb and stay correct — it just catches fewer cases until the rest arrive.
    case 'pvPmsRequired': {
      const sources = selectedChecklistLabels(project, 'postMarketSources');
      if (sources.some((s) => PV_PMS_SOURCE_LABELS.includes(s))) return 'applies';
      return (project.registers[VULNERABLE_REGISTER] ?? []).length > 0 ? 'applies' : 'doesNotApply';
    }

    case 'claimNeedsPerformanceEvidence':
      return twoState(
        (project.registers['claimEvidenceTraceability'] ?? []).some((c) =>
          CLAIM_CATEGORIES_NEEDING_PERFORMANCE_EVIDENCE.includes(String(c.claimCategory ?? '').trim()),
        ),
      );

    case 'aseanMarket':
      return twoState(projectHasAseanMarket(project));

    // Two routes in, since Round 4 question 25(c) (2026-08-29). Selecting
    // `Infant 0+` outright is the first and always has been. The second is
    // `Family use`, which "does not automatically mean a vulnerable population,
    // but must prompt confirmation of the actual age groups included; if infants
    // or young children are included, the relevant pathway activates".
    //
    // That second route is what gives this trigger a real `notAssessed` state: a
    // family product whose age groups nobody has confirmed is not a product
    // without infants, it is a product nobody has asked about. Before this, an
    // unanswered family-use project silently skipped the whole infant pathway.
    case 'infantContact': {
      const selected = (project.checklists['targetUsers'] ?? []).filter((i) => i.selected).map((i) => i.label);
      if (selected.includes(INFANT_TARGET_USER)) return 'applies';
      if (!selected.includes(FAMILY_USE_TARGET_USER)) return 'doesNotApply';
      const groups = familyUseAgeGroupList(project.assessments);
      if (groups.length === 0) return 'notAssessed';
      return groups.includes(INFANT_TARGET_USER) ? 'applies' : 'doesNotApply';
    }

    // A3: mandatory "before ANY study involving human participants". Study
    // Protocol Setup is `mode: 'fixed'`, so its rows are seeded — the signal is
    // a row someone has actually filled a planned value into, never row count,
    // which would be true from creation.
    //
    // ✅ Round 4 question 9 (2026-08-24) keeps that reasoning but adds the explicit
    // field we offered as the alternative. A started Study Protocol still counts —
    // "Creating a Study Protocol automatically sets the answer to Yes" — so it
    // remains one input rather than the whole trigger, and it is checked FIRST so a
    // stale 'No' can never mask a protocol somebody has begun filling in.
    //
    // `Undecided` is `notAssessed`, which is what makes it "prevent Gate 8 from
    // closing": Gate 8's `sg08-human-study` is Conditional, and a Conditional item
    // whose trigger is unassessed blocks.
    case 'humanStudyPlanned': {
      const protocolStarted = (project.registers['studyProtocolSetup'] ?? []).some(
        (r) => String(r.plannedValue ?? '').trim() !== '',
      );
      if (protocolStarted) return 'applies';
      const answer = project.assessments.humanStudyPlanned?.trim() ?? '';
      if (answer === '' || answer === 'Undecided') return 'notAssessed';
      return answer === 'Yes' ? 'applies' : 'doesNotApply';
    }

    // A3, Gates 5 and 9. Only 'Susceptible' triggers; the other four values are
    // the N/A route the team allowed, and each already demands a rationale
    // before it can be saved.
    //
    // ✅ FIXED 2026-08-24. This is the case Round 4 question 7 names outright: "A
    // formula with no microbiological-susceptibility assessment must not
    // automatically bypass preservative-strategy or preservative-efficacy
    // requirements." An unset property used to return false, so `sg05-preservative`
    // and `sg09-pet` auto-passed on every project nobody had classified — "not yet
    // assessed" read as "assessed and does not apply", exactly what option (b)
    // rejects. Empty now means what it says.
    //
    // The other four values ARE the assessed-and-does-not-apply answer, and each
    // already demands a rationale before it can be saved, so no second field is
    // needed to tell "anhydrous" from "nobody looked".
    case 'microbiologicallySusceptible': {
      const susceptibility = project.formulaProperties.microSusceptibility?.trim() ?? '';
      if (susceptibility === '') return 'notAssessed';
      return susceptibility === 'Susceptible' ? 'applies' : 'doesNotApply';
    }

    // A3: "new product, claim extension, repositioning project,
    // customer/distributor-led request, or where a benchmark/reference product
    // is named. Not mandatory for a purely administrative change." Three
    // independent limbs, any one of which fires.
    //
    // ✅ Round 4 question 11 (2026-08-24) replaced the exemption test. Which project
    // natures counted as administrative used to be our reading; the answer is that
    // NONE of the six is automatically administrative, so the exemption now needs
    // two things recorded rather than inferred — the classification, AND its
    // confirmation by an authorised reviewer. Unconfirmed means not exempt, which
    // is the safe direction: an unclassified project gets the competitor review.
    //
    // The first two limbs read gate-01 CHECKLIST sections (2026-08-10, moved off
    // two single-valued identity fields — see config/phases.ts). Both use
    // `selected`, matching skincareForTwoTriggers above; ChecklistSection sets
    // status Y from the same tick, so the two signals move together.
    // C1: three of its seven conditions, the ones reading B7's per-claim
    // classification. The other four have no data source — they are listed on the
    // item itself (coverageNote) so a green tick never claims more than it checked.
    case 'claimNeedsRegulatoryReview': {
      const claims = project.registers['claimEvidenceTraceability'] ?? [];
      // C1's per-claim conditions: category, risk, or wording reworded since its
      // last review.
      if (claims.some(claimNeedsReview)) return 'applies';
      // C1's sixth condition — "the market imposes a specific restriction" — became
      // evaluable with question 4's market profile (2026-08-24). It is a property of
      // the PROJECT's markets, not of one claim, so it can only make the review
      // required once at least one claim has been declared: with no claims there is
      // nothing for a restriction to apply to.
      if (claims.length > 0 && marketRestrictsClaims(project.identity.markets, project.reference.marketProfiles)) {
        return 'applies';
      }
      return 'doesNotApply';
    }

    case 'newOrRepositionedProject': {
      const natures = selectedChecklistLabels(project, 'projectNature');
      const origins = selectedChecklistLabels(project, 'requestOrigin');
      const benchmark = (project.requirements['projectRequirements'] ?? []).find(
        (r) => r.requirement === 'Benchmark or reference product',
      );
      // A3's own three limbs, unchanged: a development/change type is recorded, the
      // request came from a customer or distributor, or a benchmark is named.
      const limbFires =
        natures.length > 0 || origins.some((o) => CUSTOMER_LED_ORIGINS.includes(o)) || !!benchmark?.notes?.trim();
      if (!limbFires) return 'doesNotApply';
      // Question 11's exemption, which is now the only way out: confirmed
      // administrative-only, by a named reviewer. Anything less and the review
      // applies — including "Yes" with nobody's name against it.
      const adminOnly = project.assessments.administrativeOnly?.trim() ?? '';
      const confirmedBy = project.assessments.administrativeOnlyConfirmedBy?.trim() ?? '';
      if (adminOnly === 'Yes' && confirmedBy !== '') return 'doesNotApply';
      return 'applies';
    }

    // Question 12 (2026-08-24), Gate 9. `sg09-scaleup` had NO trigger at all — it
    // was one of the three Conditional items that could never block — so this is a
    // new trigger rather than a third state for an existing one.
    //
    // A Major formula change counts on its own: "A formula change classified Major
    // also counts as a major reformulation for the Gate 9 scale-up trigger."
    // ⚠️ TWO of the answer's three limbs are here. The third is a list of EIGHTEEN
    // affected areas that also trigger scale-up or pilot review — manufacturing
    // site · equipment type or scale · batch size · order of addition · mixing
    // speed or time · homogenisation · heating or cooling profile · maximum
    // temperature · hold time · pre-processing · transfer method · filling method
    // · water quality · process aid · packaging/filling interface, and more.
    //
    // Not built, and deliberately not guessed at: those areas belong on the change
    // record, whose `affectedArea` is free text today and which question 34 is
    // about to restructure (a fourth severity level, an eight-field disposition).
    // Adding a nineteenth taxonomy to that record now would mean doing it twice.
    // So a project whose only scale-up risk is a site transfer or a batch-size
    // change does NOT trigger this yet unless someone answers Yes by hand
    // [R4-REWORK: câu 12].
    case 'scaleUpRiskIdentified': {
      const majorChange = project.formulaVersionHistory.some((v) => v.changeType === 'Major');
      if (majorChange) return 'applies';
      const answer = project.assessments.scaleUpRiskIdentified?.trim() ?? '';
      if (answer === '' || answer === 'Pending assessment') return 'notAssessed';
      return answer === 'Yes' ? 'applies' : 'doesNotApply';
    }

    // Round 4 question 17, Gate 4. Reads the company Raw Material Risk Overlay
    // against the materials this project uses, and is one of the few triggers that
    // expresses all three of question 7's states from real data:
    //
    //   applies       at least one material carries a risk classification
    //   notAssessed   at least one material has NO overlay entry, or the project
    //                 has recorded no materials at all
    //   doesNotApply  every material is classified, none carries a flag
    //
    // Note the order: a flagged material wins over an unclassified one. Both
    // outcomes block, and "there IS an allergen risk here" is the more useful thing
    // to tell the reader than "one other material is unclassified".
    //
    // The empty case deliberately resolves to `notAssessed`, not `doesNotApply`. A
    // project with no materials entered has assessed nothing, and auto-satisfying
    // the item there would be exactly the vacuous pass sweep S2 exists to catch —
    // this is Gate 4, the gate at which materials get screened in the first place.
    case 'rmRiskFlagged': {
      const rmCodes = projectRmCodes(project);
      if (rmCodes.length === 0) return 'notAssessed';
      if (rmCodesWithRiskFlags(rmCodes, project.reference.rmRisk).length > 0) return 'applies';
      return rmCodesUnclassified(rmCodes, project.reference.rmRisk).length > 0 ? 'notAssessed' : 'doesNotApply';
    }

    // Round 4 question 36(b), Gate 5: is this project "specifically designated as
    // commercially dependent on a defined cost or margin"? The answer's own next
    // sentence names where that is recorded — "where that commercial requirement
    // is a Must" — and question 21 gives every Phase 1 requirement row exactly
    // that priority, so the designation needed no field of its own.
    //
    // All three of question 7's states come from real data here: a priority is
    // recorded (Must, or one of the other two), the row is dispositioned N/A
    // (assessed as not applicable to this project), or nobody has prioritised it
    // yet — which blocks, because an unprioritised commercial boundary is the one
    // case where "we did not look" must not read as "it does not matter".
    case 'commercialRequirementIsMust': {
      const row = (project.requirements[PHASE1_REQUIREMENTS_SECTION] ?? []).find(
        (r) => r.requirement === COMMERCIAL_BOUNDARY_REQUIREMENT,
      );
      if (!row) return 'notAssessed';
      if (row.status === REQUIREMENT_NOT_APPLICABLE) return 'doesNotApply';
      const priority = row.priority?.trim() ?? '';
      if (priority === '') return 'notAssessed';
      return priority === 'Must' ? 'applies' : 'doesNotApply';
    }
  }
}

// The Phase 1 (B6) requirements section and the one row question 36(b) reads.
// Named constants rather than inline strings: `verify:readiness` sweep S1 checks
// config references, not engine ones, so a typo here would be silent.
const PHASE1_REQUIREMENTS_SECTION = 'projectRequirements';
const COMMERCIAL_BOUNDARY_REQUIREMENT = 'Target cost or commercial boundary';

// Round 4 question 31(f): the rmCodes of the CURRENT formula, as opposed to
// `projectRmCodes` below which is the union of formula and candidate register.
// The two exist for opposite reasons — that one widens a screen so nothing slips
// through, this one narrows a release block to what the product actually contains.
function bomRmCodes(project: ProjectData): string[] {
  return project.bom.map((line) => (line.rmCode ?? '').trim()).filter((code) => code !== '');
}

function rmRowsInScope(project: ProjectData, scope: RmEvidenceScope | undefined): RegisterRow[] {
  const rows = project.registers[RM_EVIDENCE_REGISTER] ?? [];
  return scope === 'formula' ? rmRowsInFormula(rows, bomRmCodes(project)) : rows;
}

export const SAFETY_MATRIX_REGISTER = 'formulationSafetyMatrix';

// Round 4 question 23(b): formula lines with no safety coverage recorded against
// them. Exported because the Ingredient-Level Safety Matrix screen shows the same
// list — a blocker that names the gate but not the ingredient is a scavenger hunt.
//
// Matched by rmCode first and INCI second. The matrix's own identity column is
// `inciName` (it predates rmCode existing anywhere), while a BOM line reliably has
// rmCode, so both are tried rather than forcing one: requiring rmCode alone would
// fail every matrix row typed before the Cosmetri import existed, and INCI alone
// would mis-join two materials sharing an INCI name.
export function uncoveredFormulaLines(project: ProjectData): { label: string; reason: string }[] {
  const matrix = project.registers[SAFETY_MATRIX_REGISTER] ?? [];
  const out: { label: string; reason: string }[] = [];
  for (const line of project.bom) {
    const code = (line.rmCode ?? '').trim();
    const inci = (line.inciName ?? '').trim();
    const label = inci || code || '(unnamed formula line)';
    const row = matrix.find((r) => {
      const rowCode = String(r.rmCode ?? '').trim();
      const rowInci = String(r.inciName ?? '').trim();
      return (code !== '' && rowCode === code) || (inci !== '' && rowInci.toLowerCase() === inci.toLowerCase());
    });
    if (!row) {
      out.push({ label, reason: 'no safety-matrix row' });
      continue;
    }
    const route = String(row.coverageRoute ?? '').trim();
    if (route === '') {
      out.push({ label, reason: 'no coverage route recorded' });
      continue;
    }
    // "Every formula line must show it has been covered AND LINKED to the relevant
    // assessment." An individual assessment IS this row; the other three routes
    // name something elsewhere, so they have to say what.
    if (route !== SAFETY_COVERAGE_INDIVIDUAL && String(row.coverageReference ?? '').trim() === '') {
      out.push({ label, reason: `"${route}" but no assessment referenced` });
    }
  }
  return out;
}

// Round 4 questions 18 and 29 — the lanes of a gate that are not fully and
// currently signed. A "lane" is one market at Gates 10-12 and the single
// market-less lane everywhere else.
//
// A lane counts as signed only when all three roles are signed AND none of the
// three has gone stale, which is question 29(1)'s own consequence: "if evidence
// within the signed snapshot changes after a signature … the signature becomes
// stale/invalidated … re-signing is required". A stale signature is deliberately
// not deleted — what was signed and when stays on the record; it simply stops
// counting, and `staleGateSignOffs` says what changed.
export function unsignedGateLanes(project: ProjectData, gateId: string): { market?: string; reason: string }[] {
  const lanes = gateSignOffMarkets(project, gateId);
  if (lanes.length === 0) {
    return [{ reason: 'no market recorded on this project, so there is nothing to sign off per market' }];
  }
  const out: { market?: string; reason: string }[] = [];
  for (const market of lanes) {
    const missing = GATE_SIGNOFF_ROLES.filter((role) => !isGateSignOffSigned(findGateSignOff(project, gateId, market, role)));
    if (missing.length > 0) {
      out.push({ market, reason: `not signed: ${missing.join(', ')}` });
      continue;
    }
    const stale = GATE_SIGNOFF_ROLES.filter((role) => gateSignOffStaleChanges(project, gateId, market, role).length > 0);
    if (stale.length > 0) {
      out.push({ market, reason: `evidence changed since signing: ${stale.join(', ')} must re-sign` });
    }
  }
  return out;
}

// What has changed under one signature since it was given — empty when it is
// still current, and the list question 29(1) asks the system to identify when it
// is not. A signature with no stored snapshot is treated as current rather than
// stale: that can only be a record predating this mechanism, and inventing
// staleness for it would invalidate signatures on evidence nobody has touched.
export function gateSignOffStaleChanges(
  project: ProjectData,
  gateId: string,
  market: string | undefined,
  role: GateSignOffRole,
): string[] {
  const signOff = findGateSignOff(project, gateId, market, role);
  if (!signOff?.signedAt || !signOff.snapshot) return [];
  return snapshotChanges(signOff.snapshot, gateEvidenceSnapshot(project, gateId, market));
}

// Every raw material this project uses, by the rmCode the overlay is keyed on.
//
// The union of two surfaces on purpose. Supplier & RM Evidence is the Gate 4
// screening register — where a material first appears, before the formula is locked
// at Gate 5 — and the Formula BOM is the formula itself. A material in either is
// one this project uses; taking the union can only make the screen stricter, never
// let a material through unscreened.
function projectRmCodes(project: ProjectData): string[] {
  const codes = new Set<string>();
  for (const row of project.registers['supplierRmEvidence'] ?? []) {
    const code = String(row.rmCode ?? '').trim();
    if (code !== '') codes.add(code);
  }
  for (const line of project.bom) {
    const code = (line.rmCode ?? '').trim();
    if (code !== '') codes.add(code);
  }
  return [...codes];
}

// A claim C1 makes reviewable: borderline/therapeutic category, high risk, or
// still unclassified (the last is our reading — see CLAIM_RISKS_NEEDING_REVIEW).
function claimNeedsReview(row: RegisterRow): boolean {
  const category = String(row.claimCategory ?? '').trim();
  const risk = String(row.claimRisk ?? '').trim();
  return (
    CLAIM_CATEGORIES_NEEDING_REVIEW.includes(category) ||
    CLAIM_RISKS_NEEDING_REVIEW.includes(risk) ||
    claimWordingChangedSinceReview(row)
  );
}

// C1's "varies from previously approved wording": the wording no longer matches
// the snapshot taken when the review was recorded. Only meaningful once a review
// exists — before that there is nothing it could vary FROM, which is exactly why
// this condition cannot be about the moment a claim is declared.
function claimWordingChangedSinceReview(row: RegisterRow): boolean {
  const reviewed = String(row[CLAIM_REVIEWED_WORDING_COLUMN] ?? '').trim();
  if (reviewed === '') return false;
  return String(row[CLAIM_WORDING_COLUMN] ?? '').trim() !== reviewed;
}

// Labels a project has ticked in a checklist section.
function selectedChecklistLabels(project: ProjectData, section: string): string[] {
  return (project.checklists[section] ?? []).filter((i) => i.selected).map((i) => i.label);
}

// ~~The three project natures we read as NOT "a purely administrative change".~~
// DELETED 2026-08-24. Round 4 question 11 rejected the premise the list rested on:
// "None of the six project types is automatically administrative. A packaging
// change, lifecycle improvement or reformulation can be technically and
// commercially significant." So there was nothing to re-tune — a list mapping
// types to administrative-ness cannot exist. The exemption moved to
// `assessments.administrativeOnly`, a recorded classification confirmed by a named
// reviewer, which `newOrRepositionedProject` reads above.
//
// Worth keeping the shape of the mistake: the old list quietly decided that a
// Packaging change project needs no competitor review, which is a business
// judgement nobody had made. It looked like configuration and behaved like a rule.

// A3's "customer/distributor-led request" limb, against B1's option list.
const CUSTOMER_LED_ORIGINS = ['Customer request', 'Distributor request'];

// Why a trigger isn't currently active, in plain language for the readiness
// panel (2026-07-27) — keyed so a new ReadinessTrigger can't silently ship
// without updating this message too.
const TRIGGER_INACTIVE_EXPLANATIONS: Record<ReadinessTrigger, string> = {
  skincareForTwo: 'no Pregnancy/Breastfeeding/Postpartum target user selected',
  humanStudyPlanned: 'no human study is planned — the Study Protocol has no planned values recorded',
  newOrRepositionedProject:
    'not a new product, claim change or market extension, not a customer or distributor request, and no benchmark product named',
  microbiologicallySusceptible:
    'the formula is recorded as anhydrous, self-preserving, sterile or single-use, with a rationale',
  infantContact:
    'no Infant 0+ target user selected, and no family-use product whose confirmed age groups include infants',
  aseanMarket: 'no ASEAN market selected, so the ASEAN PIF checklist does not apply',
  openChangeControl: 'no change control record is open for this project',
  claimNeedsPerformanceEvidence:
    'no declared claim is categorised as depending on product performance or sensory evidence',
  pvPmsRequired:
    'no safety signal, complaint or PMS trend recorded on Post-Market Sources, and no vulnerable-user population assessed',
  scaleUpRiskIdentified:
    'no Major formula change has been recorded and the scale-up risk assessment says no risk was identified',
  claimNeedsRegulatoryReview:
    'no declared claim is borderline, therapeutic-adjacent, high risk, still unclassified, or reworded since its last review',
  rmRiskFlagged:
    'every raw material in this project is classified in the Raw Material Risk Overlay and none carries a fragrance, allergen, botanical, protein, residue, heavy-metal, microbiological or variable-source classification',
  commercialRequirementIsMust:
    'the "Target cost or commercial boundary" requirement is not a Must for this project, so it is not commercially dependent on a defined cost or margin',
};

// Why a trigger has not been evaluated yet, in plain language — the third state
// Round 4 question 7 requires (2026-08-24). Keyed like the map above, so a new
// ReadinessTrigger cannot ship without a message for both states.
//
// Every entry says what to GO AND DO, not just what is missing: this text is the
// only thing on screen between a user and a blocked gate, and "not assessed" on
// its own tells them nothing about where to click.
//
// The seven triggers in `TRIGGERS_WITHOUT_UNASSESSED_STATE` can never return
// `notAssessed` today, so their messages are unreachable until R5-Q5 answers.
// They are written now rather than left as TODOs, because a message written when
// the rule is fresh is better than one written months later by whoever wires it.
const TRIGGER_UNASSESSED_EXPLANATIONS: Record<ReadinessTrigger, string> = {
  skincareForTwo: 'nobody has recorded the target users yet, so pregnancy, breastfeeding and postpartum use are unknown',
  humanStudyPlanned: 'nobody has answered whether this project involves a human-participant study',
  newOrRepositionedProject: 'the development / change type has not been recorded, so it is unknown whether this is a new product, a claim change or an administrative-only change',
  microbiologicallySusceptible: 'the formula has not been classified as susceptible, anhydrous, self-preserving, sterile or single-use',
  infantContact:
    'this is a Family use product and nobody has confirmed which age groups it is for, so whether infants are included is unknown (Project Overview -> Assessments)',
  aseanMarket: 'no market has been recorded for this project yet',
  openChangeControl: 'nobody has assessed whether a change control record should be opened for this finding',
  claimNeedsPerformanceEvidence: 'no claim has been declared yet, so no claim carries an evidence category',
  pvPmsRequired: 'nothing has been recorded on Post-Market Sources and no vulnerable-user assessment exists, so it is unknown whether enhanced surveillance applies',
  claimNeedsRegulatoryReview: 'no claim has been declared yet, so no claim carries a category or risk level',
  scaleUpRiskIdentified: 'nobody has assessed whether this project carries a scale-up or pilot risk',
  rmRiskFlagged:
    'one or more raw materials in this project have no entry in the Raw Material Risk Overlay (Company Reference Data -> Raw material risk), so their allergen, impurity and contaminant risk is unclassified',
  commercialRequirementIsMust:
    'the "Target cost or commercial boundary" row of the Phase 1 requirements table has no Must / Should / Could priority yet, so it is unknown whether this project depends on a defined cost or margin',
};

// Evaluate a requirement's check against live project data. `evaluable` is false
// for `manual` checks (no linked data source yet — shown for confirmation, never
// hard-blocks); when false, `satisfied` is meaningless (reported as false/pending).
function evaluateReadinessCheck(
  project: ProjectData,
  check: ReadinessCheck,
  // Which gate is being evaluated. Only `gateSignedOff` needs it — every other
  // kind names its own data source — but it is threaded rather than looked up,
  // because a check that had to work out which gate it belongs to would be a
  // check that could get it wrong.
  gateId: string,
): { evaluable: boolean; satisfied: boolean } {
  switch (check.kind) {
    case 'manual':
      return { evaluable: false, satisfied: false };
    case 'registerNoBadRows': {
      const rows = project.registers[check.register] ?? [];
      const bad = rows.some((r) => check.badValues.includes(String(r[check.column])));
      return { evaluable: true, satisfied: !bad };
    }
    case 'skincareForTwo':
      return { evaluable: true, satisfied: skincareForTwoIncompleteSections(project).length === 0 };
    case 'nextActionsClosed':
      return { evaluable: true, satisfied: openNextActions(project, '').length === 0 };
    case 'bomReconciled':
      // F14: satisfied when no manual line remains unreconciled (a fromCosmetri
      // line is inherently reconciled).
      return {
        evaluable: true,
        satisfied: !project.bom.some((l) => !l.fromCosmetri && !l.reconciled),
      };
    // D4. Both read the same register; they are separate checks because Gate 4
    // treats them at different severities (see `clearedByConditions`).
    case 'rmEvidenceDispositioned': {
      const rows = rmRowsInScope(project, check.scope);
      // `scope: 'formula'` over an EMPTY formula would be vacuously true, which is
      // the failure sweep S2 exists to catch — and it would land at Gate 7, after
      // the formula was supposed to be locked at Gate 5. An empty formula means
      // nothing has been assessed, not that everything has.
      if (check.scope === 'formula' && project.bom.length === 0) {
        return { evaluable: true, satisfied: false };
      }
      return { evaluable: true, satisfied: unresolvedRmRows(rows).length === 0 };
    }
    case 'rmEvidenceNoneConditional': {
      const rows = rmRowsInScope(project, check.scope);
      if (check.scope === 'formula' && project.bom.length === 0) {
        return { evaluable: true, satisfied: false };
      }
      return { evaluable: true, satisfied: conditionallyAcceptedRmRows(rows).length === 0 };
    }
    // Question 31(f)'s warning half. Vacuously true when every candidate IS in the
    // formula, which is correct here and harmless: this item is Supporting, so a
    // true value blocks nothing either way.
    case 'rmEvidenceNonFormulaResolved': {
      const rows = rmRowsNotInFormula(project.registers[RM_EVIDENCE_REGISTER] ?? [], bomRmCodes(project));
      return {
        evaluable: true,
        satisfied: unresolvedRmRows(rows).length === 0 && conditionallyAcceptedRmRows(rows).length === 0,
      };
    }
    // Round 4 question 6: every row of a watch-list register carries one of the six
    // Gate 4 dispositions. Non-vacuous by construction — both registers this is
    // used on are `mode: 'fixed'` and ship their rows at project creation, so an
    // empty register cannot arise; and unlike `productStatus`, `gate4Disposition`
    // has no seeded value, so no row starts out satisfying it (sweep S3's hazard
    // read the other way round).
    case 'watchlistDispositioned': {
      const rows = project.registers[check.register] ?? [];
      return {
        evaluable: true,
        // Membership, not merely non-empty. A rule that accepts any non-blank
        // string is satisfied by a value nobody can have picked from the dropdown
        // — which is the failure sweep S1 exists to catch in config, and it
        // applies just as much to data arriving through the API.
        satisfied:
          rows.length > 0 &&
          rows.every((r) =>
            (GATE4_DISPOSITION_OPTIONS as readonly string[]).includes(String(r.gate4Disposition ?? '').trim()),
          ),
      };
    }
    // Round 4 question 23(b): every line of the current formula has a safety-matrix
    // row naming a coverage route — and, for the three routes that point at an
    // assessment elsewhere, naming what it points at.
    // Round 4 questions 18 and 29. Satisfied only when every lane of this gate
    // carries all three signatures and none has gone stale. A per-market gate has
    // one lane per market — and none at all on a project with no markets, which
    // resolves to unsatisfied rather than vacuously true: a project that has not
    // said where it sells has not signed anything off for anywhere.
    case 'gateSignedOff':
      return { evaluable: true, satisfied: unsignedGateLanes(project, gateId).length === 0 };
    case 'safetyMatrixCoversFormula': {
      // Same empty-formula guard as the two `scope: 'formula'` D4 checks above,
      // and for the same reason: "every formula line is covered" is vacuously
      // true of a formula with no lines, which would show a green tick on the
      // Gate 7 panel for a product that has not been formulated. `bomHasLines` at
      // Gate 5 makes this unreachable for a project that got here properly — the
      // panel is readable for any gate at any time, which is when it would show.
      if (project.bom.length === 0) return { evaluable: true, satisfied: false };
      return { evaluable: true, satisfied: uncoveredFormulaLines(project).length === 0 };
    }
    case 'requirementSectionComplete': {
      const rows = project.requirements[check.section] ?? [];
      return { evaluable: true, satisfied: rows.every((r) => r.status === 'Completed') };
    }
    // Round 4 question 1: Completed, or 'N/A' with a rationale. The rationale is
    // not optional — without it "N/A" is a way to clear a row by clicking, which
    // is the opposite of what a disposition is.
    case 'requirementSectionDispositioned': {
      const rows = project.requirements[check.section] ?? [];
      return {
        evaluable: true,
        satisfied:
          rows.length > 0 &&
          rows.every(
            (r) =>
              r.status === 'Completed' ||
              (r.status === REQUIREMENT_NOT_APPLICABLE && (r.naRationale ?? '').trim() !== ''),
          ),
      };
    }
    case 'marketChecklistRecorded':
      return { evaluable: true, satisfied: marketsWithoutChecklist(project).length === 0 };
    case 'aseanChecklistComplete':
      return { evaluable: true, satisfied: !aseanChecklistIncomplete(project) };
    case 'changeControlNoHardImpact':
      return { evaluable: true, satisfied: gate11HardBlockingChanges(project, project.changes).length === 0 };
    case 'changeControlNoAdminImpact':
      return { evaluable: true, satisfied: gate11ConditionalChanges(project, project.changes).length === 0 };
    case 'noOpenCriticalSafetyFinding':
      return { evaluable: true, satisfied: hardBlockingSafetyFindings(project).length === 0 };
    case 'noOpenMediumSafetyFinding':
      return { evaluable: true, satisfied: conditionalSafetyFindings(project).length === 0 };
    case 'watchlistReviewed':
      return { evaluable: true, satisfied: watchlistHardBlockers(project).length === 0 };
    case 'watchlistNoneConditional':
      return { evaluable: true, satisfied: watchlistConditionalRows(project).length === 0 };
    case 'rmEvidenceHasUsable':
      return { evaluable: true, satisfied: hasUsableRmRow(project.registers[RM_EVIDENCE_REGISTER] ?? []) };
    case 'gateCheckDone': {
      const row = project.gateChecks.find((c) => c.gate === check.gate && c.check === check.check);
      // Same rule as the existing phase-level keyChecksDone: done+Y, or
      // NA+justified (a note explaining why it's not applicable) — except where
      // the row declares a trigger that makes N/A untrue. See
      // `naInvalidWhenTrigger`: on a project the trigger touches, "not applicable"
      // is a statement the app can see is wrong, so only done+Y counts.
      // Any one active trigger is enough to make "not applicable" untrue — Gate 7's
      // row names two subjects, pregnancy/breastfeeding AND baby contact.
      //
      // Only `applies` invalidates N/A, deliberately not `notAssessed` (2026-08-24):
      // an unevaluated trigger means we do not know whether the row is applicable,
      // and refusing the user's N/A on that basis would assert the opposite. The
      // gate is not let off either — the item that OWNS that trigger blocks in its
      // own right, which is the correct place for "nobody has assessed this".
      const naAllowed = !(check.naInvalidWhenTrigger ?? []).some(
        (t) => evaluateTrigger(project, t) === 'applies',
      );
      const satisfied =
        !!row && ((row.done && row.ynna === 'Y') || (naAllowed && row.ynna === 'NA' && !!row.notes?.trim()));
      return { evaluable: true, satisfied };
    }
    case 'checklistHasSelection': {
      const rows = project.checklists[check.section] ?? [];
      return { evaluable: true, satisfied: rows.some((r) => r.status === 'Y') };
    }
    case 'registerHasRows': {
      const rows = project.registers[check.register] ?? [];
      return { evaluable: true, satisfied: rows.length > 0 };
    }
    case 'bomHasLines':
      return { evaluable: true, satisfied: project.bom.length > 0 };
    case 'bomIdentityComplete':
      return { evaluable: true, satisfied: project.bom.every((l) => !!l.inciName?.trim()) };
    case 'registerColumnFilled': {
      const rows = project.registers[check.register] ?? [];
      return { evaluable: true, satisfied: rows.every((r) => String(r[check.column] ?? '').trim() !== '') };
    }
    case 'registerRowsComplete': {
      const rows = project.registers[check.register] ?? [];
      // Unlike registerColumnFilled, an empty register must NOT vacuously
      // satisfy this — it backs sign-off-style hard blocks (NPD Front-End
      // Roadmap, 2026-07-24) where "no rows yet" must read as incomplete.
      if (rows.length === 0) return { evaluable: true, satisfied: false };
      // `when` (2026-08-11) narrows the check to the rows it applies to, so a
      // register whose rows are ALL skipped reports satisfied — correct, because
      // the requirement genuinely does not apply, and the paired registerHasRows
      // (required by sweep S2 whenever `when` is used) still guarantees the
      // register is not simply untouched.
      const scoped = check.when
        ? rows.filter((r) => !check.when!.notIn.includes(String(r[check.when!.column] ?? '').trim()))
        : rows;
      const satisfied = scoped.every((r) => check.columns.every((c) => String(r[c] ?? '').trim() !== ''));
      return { evaluable: true, satisfied };
    }
    case 'claimsRegulatoryReviewed': {
      const reviewable = (project.registers['claimEvidenceTraceability'] ?? []).filter(claimNeedsReview);
      // Satisfied when nothing is reviewable — correct, and not vacuous in
      // practice: the item only becomes mandatory when its trigger says at least
      // one claim IS reviewable.
      return {
        evaluable: true,
        // Recorded AND still current: a review whose wording has since been
        // edited does not count, or approving a safe wording and quietly
        // rewriting it afterwards would pass unnoticed.
        satisfied: reviewable.every(
          (row) =>
            CLAIM_REVIEW_COLUMNS.every((column) => String(row[column] ?? '').trim() !== '') &&
            !claimWordingChangedSinceReview(row),
        ),
      };
    }
    case 'vulnerableGroupsCovered': {
      const expected = new Set(
        (project.checklists['targetUsers'] ?? [])
          .filter((i) => i.selected)
          .map((i) => TARGET_USER_TO_VULNERABLE_GROUP[i.label])
          .filter((g): g is string => !!g),
      );
      const recorded = new Set(
        (project.registers['vulnerableUserAssessment'] ?? []).map((r) =>
          String(r['vulnerableGroup'] ?? '').trim(),
        ),
      );
      // Vacuously satisfied when no selected target user implies a vulnerable
      // group, which is correct — a general-adult project has nothing to cover.
      // The paired registerHasRows in the same item still forces the explicit
      // "none" row B5 demands, so this can never be the only thing standing
      // between an untouched register and a passed gate.
      return { evaluable: true, satisfied: [...expected].every((g) => recorded.has(g)) };
    }
    case 'requirementDone': {
      const row = (project.requirements[check.section] ?? []).find((r) => r.requirement === check.requirement);
      // Deliberately NOT widened to accept 'N/A' when question 21 introduced it:
      // the one row this kind reads today is "Must-have product requirements",
      // and the answer says that row "is always mandatory".
      return { evaluable: true, satisfied: row?.status === 'Completed' };
    }
    // Round 4 question 21's four hard conditions, in the answer's own order.
    // Vacuous only on a section with no rows, which cannot happen here: the rows
    // are scaffolded at project creation and `verify:scaffold` guards that.
    case 'requirementsDispositioned': {
      const rows = project.requirements[check.section] ?? [];
      return {
        evaluable: true,
        satisfied: rows.every((r) => {
          // "Every row must be reviewed."
          if (r.status === 'Not Started') return false;
          // "Every non-applicable row must be marked N/A with rationale."
          if (r.status === REQUIREMENT_NOT_APPLICABLE) return (r.naRationale ?? '').trim() !== '';
          // An applicable row carries a priority. The answer does not say this in
          // so many words — it says which values a priority takes and what each
          // one obliges — but "every Must requirement must be complete" cannot be
          // checked on rows nobody has prioritised, and question 36(b) reads the
          // same column to decide whether a project is commercially dependent
          // [ASSUMPTION: R5-Q23].
          if ((r.priority ?? '').trim() === '') return false;
          // "Every Must requirement must be complete."
          return r.priority !== 'Must' || r.status === 'Completed';
        }),
      };
    }
    // Question 21's fifth condition. Everything the row above lets through that is
    // still open — a Should or Could not yet Completed — lands here, where
    // `clearedByConditions` lets Proceed with Conditions carry it.
    case 'requirementsNoOpenDeferrals': {
      const rows = project.requirements[check.section] ?? [];
      return {
        evaluable: true,
        satisfied: rows.every(
          (r) =>
            r.priority === 'Must' || // already covered, strictly, above
            r.status === 'Completed' ||
            r.status === REQUIREMENT_NOT_APPLICABLE,
        ),
      };
    }
    // Round 4 question 22(b): exactly one SELECTED option is the Primary one.
    case 'checklistPrimarySelected': {
      const primary = (project.checklists[check.section] ?? []).filter((i) => i.isPrimary && i.selected);
      return { evaluable: true, satisfied: primary.length === 1 };
    }
    // Round 4 question 24: Countries / Markets, no longer guaranteed by the create
    // form, must be recorded before Gate 1 passes.
    case 'identityMarketsRecorded':
      return {
        evaluable: true,
        satisfied: project.identity.markets.some((m) => m.trim() !== ''),
      };
    // Round 4 question 36(b). 'Not Started' is the seeded default, so it is the one
    // value that cannot count as an answer; the N/A value names its own condition
    // ("N/A — rationale required"), so it needs the rationale field filled.
    case 'costingStatusRecorded': {
      const status = project.costing.feasibilityStatus?.trim() ?? '';
      if (status === '' || status === 'Not Started') return { evaluable: true, satisfied: false };
      if (status === COSTING_STATUS_NOT_APPLICABLE) {
        return { evaluable: true, satisfied: (project.costing.assumptions ?? '').trim() !== '' };
      }
      return { evaluable: true, satisfied: true };
    }
    case 'identityFieldFilled':
      return { evaluable: true, satisfied: !!project.identity[check.field]?.trim() };
    case 'formulaPropertyFilled':
      return { evaluable: true, satisfied: !!project.formulaProperties[check.field]?.trim() };
    case 'gateFieldFilled': {
      const record = project.gates.find((g) => g.gateId === `SG${check.gate}`);
      return { evaluable: true, satisfied: !!record?.[check.field]?.trim() };
    }
    case 'allOf': {
      const results = check.checks.map((c) => evaluateReadinessCheck(project, c, gateId));
      return { evaluable: results.every((r) => r.evaluable), satisfied: results.every((r) => r.satisfied) };
    }
    default:
      return { evaluable: false, satisfied: false };
  }
}

// ---------------------------------------------------------------------------
// Required-field UX helper (not a rule — a display aid for the Key Gate
// Checks table): which (gate, check) rows back a Mandatory F1/C7 readiness
// item, independent of any project's live data. Used to show a red asterisk
// on a required-but-empty field, regardless of which project is open.
// ---------------------------------------------------------------------------

// `allOf` merges several signals into ONE readiness item (e.g. Gate 2's
// "Target user and life stage" needs both the Key Gate Check ticked AND the
// underlying checklist actually touched, but the F1 appendix lists it as one
// item — 2026-07-26, user-requested). Expand it to its constituents so the
// mandatory-field UX helpers below still find every check a composite item
// is backed by, not just its top-level `allOf` wrapper.
function flattenChecks(check: ReadinessCheck): ReadinessCheck[] {
  return check.kind === 'allOf' ? check.checks.flatMap(flattenChecks) : [check];
}

const MANDATORY_CHECKS = Object.values(GATE_READINESS)
  .flat()
  .filter((r) => r.tier === 'Mandatory')
  .flatMap((r) => flattenChecks(r.check));

const MANDATORY_GATE_CHECK_KEYS = new Set(
  MANDATORY_CHECKS.filter(
    (c): c is { kind: 'gateCheckDone'; gate: string; check: string } => c.kind === 'gateCheckDone',
  ).map((c) => `${c.gate}|${c.check}`),
);

export function isMandatoryGateCheck(gate: string, check: string): boolean {
  return MANDATORY_GATE_CHECK_KEYS.has(`${gate}|${check}`);
}

// Same idea for `checklistHasSelection` requirements — which checklist
// section keys (e.g. 'targetUsers') back a Mandatory F1/C7 item.
const MANDATORY_CHECKLIST_SECTIONS = new Set(
  MANDATORY_CHECKS.filter(
    (c): c is { kind: 'checklistHasSelection'; section: string } => c.kind === 'checklistHasSelection',
  ).map((c) => c.section),
);

export function isMandatoryChecklistSection(section: string): boolean {
  return MANDATORY_CHECKLIST_SECTIONS.has(section);
}

// Same idea for `requirementDone` requirements — which (section, requirement)
// pairs back a Mandatory F1/C7 item.
const MANDATORY_REQUIREMENT_KEYS = new Set(
  MANDATORY_CHECKS.filter(
    (c): c is { kind: 'requirementDone'; section: string; requirement: string } => c.kind === 'requirementDone',
  ).map((c) => `${c.section}|${c.requirement}`),
);

export function isMandatoryRequirementRow(section: string, requirement: string): boolean {
  return MANDATORY_REQUIREMENT_KEYS.has(`${section}|${requirement}`);
}

export type ReadinessResult = 'Not Ready' | 'Ready with Conditions' | 'Ready for Decision' | 'Passed';

export interface EvaluatedRequirement {
  id: string;
  label: string;
  tier: ReadinessTier;
  active: boolean; // Conditional item whose trigger is on; Mandatory/Supporting are always active
  evaluable: boolean; // has a real data source (not a `manual` check)
  satisfied: boolean; // for evaluable checks; false/pending for manual checks
  blocking: boolean; // active + evaluable + Mandatory + not satisfied → hard block
}

export interface GateReadiness {
  gateId: string;
  requirements: EvaluatedRequirement[];
  blockingGaps: EvaluatedRequirement[]; // evaluable Mandatory failures (hard blocks)
  warnings: EvaluatedRequirement[]; // evaluable Conditional/Supporting failures
  pendingConfirmation: EvaluatedRequirement[]; // active manual items awaiting a wired data source
  result: ReadinessResult;
}

// Evaluate every readiness requirement declared for a gate. Pure over config +
// project data (no call to gateBlockers/isGatePassed) so gateBlockers can reuse
// it without recursion.
export function evaluateReadinessRequirements(
  project: ProjectData,
  gateId: string,
): EvaluatedRequirement[] {
  const reqs: ReadinessRequirement[] = GATE_READINESS[gateId] ?? [];
  return reqs.map((req) => {
    const active = req.trigger ? evaluateTrigger(project, req.trigger) === 'applies' : true;
    const { evaluable, satisfied } = evaluateReadinessCheck(project, req.check, gateId);
    return {
      id: req.id,
      label: req.label,
      tier: req.tier,
      active,
      evaluable,
      satisfied,
      blocking: active && evaluable && req.tier === 'Mandatory' && !satisfied,
    };
  });
}

// The Gate Readiness panel model (rule F1 / C7): mandatory items, conditional
// items triggered, blocking gaps, warnings, and an overall readiness result.
export function gateReadiness(project: ProjectData, gateId: string): GateReadiness {
  const requirements = evaluateReadinessRequirements(project, gateId);
  const blockingGaps = requirements.filter((r) => r.blocking);
  const warnings = requirements.filter(
    (r) => r.active && r.evaluable && r.tier !== 'Mandatory' && !r.satisfied,
  );
  const pendingConfirmation = requirements.filter((r) => r.active && !r.evaluable);
  const record = project.gates.find((g) => g.gateId === gateId);

  let result: ReadinessResult;
  if (isGatePassed(project, gateId)) {
    result = 'Passed';
  } else if (gateBlockers(project, gateId).length > 0) {
    result = 'Not Ready';
  } else if (
    record?.decision === 'Proceed with Conditions' ||
    pendingConfirmation.some((r) => r.tier === 'Mandatory') ||
    warnings.length > 0
  ) {
    // No hard block remains, but Mandatory items still need manual confirmation
    // (data source not yet wired) or Supporting/Conditional items are open.
    result = 'Ready with Conditions';
  } else {
    result = 'Ready for Decision';
  }

  return { gateId, requirements, blockingGaps, warnings, pendingConfirmation, result };
}

// ---------------------------------------------------------------------------
// Gate pass (rule B1 + C1 + F1/C7)
// ---------------------------------------------------------------------------

// A deep link to where a blocker should actually be resolved. `scrollToId`
// is a DOM anchor id (see PhasePage.tsx's `sec-*` anchors) the target page
// scrolls to and briefly highlights after navigation — used for sections
// that live inline on a phase page rather than their own route.
export interface GateBlockerLink {
  href: string;
  scrollToId?: string;
  // Every other link is relative to /projects/:id. Change Control is a GLOBAL
  // page, so its link must not be prefixed — without this the UI would build
  // /projects/MBC-2026-001/change-control, which does not exist.
  absolute?: boolean;
}

export interface GateBlocker {
  id: string;
  label: string;
  // True for blockers even "Proceed with Conditions" cannot clear (mirrors
  // the old hardGateBlockers/gateBlockers split, but carried per-item now
  // instead of requiring a separate string-identity comparison downstream).
  hardBlock: boolean;
  link?: GateBlockerLink;
}

// Every item bearing on this gate — both satisfied and unsatisfied — so the
// UI can keep showing a gate's full readiness checklist after it passes
// (satisfied items in green) instead of the list disappearing once nothing
// is left to complain about. `hardGateBlockers`/`gateBlockers` below are
// just this list filtered to `!satisfied`, so the two can never drift.
export interface GateReadinessItem extends GateBlocker {
  satisfied: boolean;
  // True for a Mandatory item whose check is still `manual` (no wired data
  // source yet). Shown on the readiness panel for visibility — the team
  // asked to see these too, not just the ones we can actually verify — but
  // rendered distinctly (amber, "not yet enforced") and NEVER treated as a
  // blocker: `hardGateBlockers`/`gateBlockers` explicitly exclude it, so a
  // manual item can never silently start blocking Proceed just by being
  // listed here. Only ever true when `satisfied` is false and `hardBlock` is
  // false.
  pending?: boolean;
  // See `ReadinessSource` on the config side — undefined for an item named in
  // the SME's own F1 appendix. Items grouped below the F1 ones (2026-07-26,
  // user-requested), so the panel visibly separates "what the SME asked for"
  // from everything else, instead of interleaving them with no distinction.
  source?: ReadinessSource;
  // True for a Conditional or Supporting tier item (2026-07-27) — these are
  // named in the F1 appendix same as Mandatory ones, but the confirmed rule
  // is they may be incomplete WITHOUT blocking the gate (Conditional: only
  // blocks once its trigger applies; Supporting: never blocks at all).
  // **2026-08-07:** a Conditional item that declares a `trigger` and whose
  // trigger is ACTIVE is no longer advisory — it blocks exactly like a
  // Mandatory item, which is what the confirmed definition always said. This
  // became enforceable only once the SME supplied a trigger condition per
  // item; before that no Conditional item had anything to evaluate, so all of
  // them were advisory and the only trigger-driven teeth in the system came
  // from the dedicated Skincare-for-Two item pushed above. A Conditional item
  // that still declares no `trigger` remains advisory for the same reason as
  // before. Previously these tiers were silently left off the
  // panel entirely (`gateReadinessChecklist` only walked Mandatory items),
  // which made several of the SME's own named Gate 3 items (e.g. "Competitor
  // or benchmark review where applicable") vanish rather than show as
  // non-blocking. Like `pending`, `hardGateBlockers`/`gateBlockers` exclude
  // it so it can never silently start blocking Proceed.
  advisory?: boolean;
  // The F1/C7 tier this item was declared at (2026-07-27) — lets the UI badge
  // each line with the SME's own 3-way classification (Mandatory/Conditional/
  // Supporting) rather than just implying it through color. Undefined for the
  // two Next Actions rows (rule B2/F8, not F1 evidence at all — no tier
  // applies). The Skincare for Two dedicated line is tagged 'Conditional'
  // since it stands in for the matching Conditional config item it replaces
  // in the loop below (a more specific message, same underlying tier).
  tier?: ReadinessTier;
  // Set when the app enforces only part of the rule (C1 today): the conditions it
  // cannot evaluate, so a green tick never reads as "the whole rule is met".
  coverageNote?: string;
}

// Resolve a per-gate phase-page anchor link for the phase that owns `gateId`.
function phaseSectionLink(gateId: string, scrollToId: string): GateBlockerLink | undefined {
  const phase = GATES.find((g) => g.id === gateId)?.phase;
  return phase ? { href: `/phase/${phase}`, scrollToId } : undefined;
}

// Where a `ReadinessCheck` should be resolved by a user — a register page,
// the Formula BOM page, or a specific section anchor on the gate's phase
// page. `manual` checks have no linked data source yet, so no link.
function resolveCheckLink(gateId: string, check: ReadinessCheck): GateBlockerLink | undefined {
  switch (check.kind) {
    case 'checklistHasSelection':
    case 'checklistPrimarySelected':
      return phaseSectionLink(gateId, `sec-checklist-${check.section}`);
    case 'requirementDone':
    case 'requirementSectionComplete':
    case 'requirementSectionDispositioned':
    case 'requirementsDispositioned':
    case 'requirementsNoOpenDeferrals':
      return phaseSectionLink(gateId, `sec-requirement-${check.section}`);
    case 'gateCheckDone':
      return phaseSectionLink(gateId, 'sec-gate-checks');
    case 'nextActionsClosed':
      return phaseSectionLink(gateId, 'sec-next-actions');
    case 'registerHasRows':
    case 'registerColumnFilled':
    case 'registerNoBadRows':
    case 'registerRowsComplete':
      return { href: `/registers/reg/${check.register}` };
    case 'vulnerableGroupsCovered':
      return { href: '/registers/reg/vulnerableUserAssessment' };
    case 'rmEvidenceDispositioned':
    case 'rmEvidenceNoneConditional':
    case 'rmEvidenceHasUsable':
    case 'rmEvidenceNonFormulaResolved':
      return { href: `/registers/reg/${RM_EVIDENCE_REGISTER}` };
    case 'watchlistDispositioned':
      return { href: `/registers/reg/${check.register}` };
    case 'safetyMatrixCoversFormula':
      return { href: `/registers/reg/${SAFETY_MATRIX_REGISTER}` };
    case 'watchlistReviewed':
    case 'watchlistNoneConditional':
      return { href: `/registers/reg/${WATCHLIST_REGISTER}` };
    case 'noOpenCriticalSafetyFinding':
    case 'noOpenMediumSafetyFinding':
      return { href: '/formulation-safety' };
    case 'marketChecklistRecorded':
      return { href: `/registers/reg/${MARKET_DOSSIER_REGISTER}` };
    case 'aseanChecklistComplete':
      return { href: `/registers/reg/${ASEAN_CHECKLIST_REGISTER}` };
    case 'changeControlNoHardImpact':
    case 'changeControlNoAdminImpact':
      // Change Control is a GLOBAL page, not per project — no project prefix.
      return { href: '/change-control', absolute: true };
    case 'claimsRegulatoryReviewed':
      return { href: '/evidence-claim-support' };
    case 'bomHasLines':
    case 'bomIdentityComplete':
    case 'bomReconciled':
      return { href: '/bom' };
    case 'skincareForTwo':
      return phaseSectionLink(gateId, 'sec-requirement-skincareForTwo');
    case 'identityFieldFilled':
      // The Gate 01 opportunity fields moved out of Project Identification into
      // their own card on 2026-08-11, so the blocker link follows them.
      return phaseSectionLink(gateId, 'sec-opportunity');
    case 'formulaPropertyFilled':
    case 'costingStatusRecorded':
      return { href: '/bom' };
    case 'identityMarketsRecorded':
      // Countries / Markets lives on the Project Identification card, not the
      // Gate 01 opportunity block the sibling identity check points at.
      return phaseSectionLink(gateId, 'sec-identification');
    case 'gateFieldFilled':
      return phaseSectionLink(gateId, 'sec-gate-flow');
    case 'allOf':
      // By convention the composite's LAST check is the more specific one
      // (e.g. [gateCheckDone, checklistHasSelection] — the detail checklist,
      // not the coarse Key Gate Check row) — link there.
      return resolveCheckLink(gateId, check.checks[check.checks.length - 1]);
    case 'manual':
    default:
      return undefined;
  }
}

// Every item that bears on whether this gate can pass — Critical next
// actions (F8), the Skincare for Two safety screen (C1), F1/C7 Mandatory
// evidence, and open non-critical next actions (B2) — each carrying whether
// it's currently satisfied. Always includes the always-applicable items
// (next actions) even when there's nothing open, so the UI has a full
// checklist to render (all green) rather than an empty list once the gate
// passes. `decisionOverride` lets a caller ask "if this decision were
// recorded, would the open-next-actions item still be unsatisfied?" without
// having committed it yet — used to validate a pending (unsaved) decision in
// the Phase Gate Flow draft before Save is enabled, and by the store guards
// before committing it. Defaults to the gate's currently committed decision
// when omitted.
export function gateReadinessChecklist(
  project: ProjectData,
  gateId: string,
  decisionOverride?: GateRecord['decision'],
): GateReadinessItem[] {
  const items: GateReadinessItem[] = [];

  // C1: Skincare for Two hard-blocks Gate 07 until the mandatory maternal and
  // infant-contact safety sections are fully completed — only shown at all
  // when actually triggered for this project (otherwise it isn't part of
  // this gate's readiness). Gives a detailed per-section message; the
  // equivalent F1 readiness check is skipped in the loop below to avoid a
  // duplicate, less specific line.
  if (gateId === 'SG07' && isSkincareForTwoTriggered(project)) {
    const incomplete = skincareForTwoIncompleteSections(project);
    items.push({
      id: 'skincare-for-two',
      label:
        incomplete.length > 0
          ? `Skincare for Two safety screen incomplete: ${incomplete.join('; ')}`
          : 'Skincare for Two safety screen complete',
      satisfied: incomplete.length === 0,
      hardBlock: true,
      tier: 'Conditional',
      link: phaseSectionLink(gateId, 'sec-requirement-skincareForTwo'),
    });
  }

  // F1 / C7: every item declared for this gate, always shown (2026-07-27:
  // previously a Conditional item whose trigger wasn't active was left off
  // the panel entirely — user-reported as confusing, since it looked like
  // the item was simply missing rather than "checked, and not applicable
  // here". Every item now shows; an inactive trigger reads as satisfied with
  // an explanation, not as absent). Mandatory ones always evaluated for
  // real; Conditional/Supporting ones are marked `advisory` (never blocks —
  // see that field's doc on GateReadinessItem). Two groups, each preserving
  // its own declared order (2026-07-26, user-requested): items the SME
  // actually named in the F1 appendix (`source` omitted) first, exactly as
  // they read it; anything else (`source` set — B3-derived, NPD Roadmap, or
  // a dev decision — see `ReadinessSource`) after. `manual` items (no data
  // source yet) are shown as `pending` instead (also never blocks). The
  // skincareForTwo check is already covered by the dedicated C1 item above,
  // at every tier.
  const relevantReqs = (GATE_READINESS[gateId] ?? []).filter((req) => req.check.kind !== 'skincareForTwo');
  const orderedReqs = [
    ...relevantReqs.filter((req) => !req.source),
    ...relevantReqs.filter((req) => req.source),
  ];
  for (const req of orderedReqs) {
    // Which items actually block (2026-08-07, rule A1/A3): Mandatory always;
    // Conditional ONLY once its declared trigger is active — which is what the
    // confirmed definition says ("hard-blocks only when its defined trigger
    // applies") and is now enforceable because the SME supplied a trigger
    // condition for every Conditional item. Until then no trigger condition
    // existed at all, so every Conditional item was left advisory; a
    // Conditional item that still declares no `trigger` keeps that treatment,
    // since there is nothing to evaluate. Supporting never blocks.
    // The inactive-trigger branch below returns early, so reaching the
    // evaluated push with a declared trigger means the trigger IS active.
    const blocks = req.tier === 'Mandatory' || (req.tier === 'Conditional' && !!req.trigger);
    const advisory = !blocks || undefined; // omit (not `false`) when it blocks, to keep satisfied items tidy
    const triggerState = req.trigger ? evaluateTrigger(project, req.trigger) : undefined;

    // Round 4 question 7, option (b): "not yet assessed" is NOT "does not apply".
    // A Mandatory or Conditional item whose trigger has never been evaluated
    // blocks — "we have not checked" cannot be a reason to pass. A Supporting one
    // warns instead, which is the answer's own carve-out.
    //
    // Rendered as unsatisfied and NOT `pending`: `pending` means "we have no data
    // source for this rule", which is a statement about the app. This is a
    // statement about the project — the data source exists and is empty — and the
    // fix is somebody filling it in, so it must not read as a gap in the software.
    if (triggerState === 'notAssessed') {
      items.push({
        id: req.id,
        label: `${req.label} — ${TRIGGER_UNASSESSED_EXPLANATIONS[req.trigger!]}, so this cannot be treated as not applicable`,
        satisfied: false,
        hardBlock: req.tier !== 'Supporting',
        advisory: req.tier === 'Supporting' || undefined,
        link: resolveCheckLink(gateId, req.check),
        source: req.source,
        tier: req.tier,
        coverageNote: req.coverageNote,
      });
      continue;
    }

    // Assessed, and the condition does not hold: automatically satisfied, with the
    // label saying exactly why, rather than being hidden — "not shown" used to read
    // as "forgotten", not "checked and not applicable here".
    //
    // This auto-generated explanation is exactly what Round 4 question 16
    // (2026-08-24) permits — "Users should not be required to retype a reason
    // already deterministically generated by the system" — but the same answer
    // adds that for a safety-, regulatory-, claims- or release-critical item the
    // generated rationale "must still be acknowledged by the responsible reviewer
    // before gate closure". Who the responsible reviewer of an ITEM is (as opposed
    // to a gate, which question 29 defines) is not settled [ASSUMPTION: R5-Q6].
    if (triggerState === 'doesNotApply') {
      items.push({
        id: req.id,
        label: `${req.label} — not triggered for this project (${TRIGGER_INACTIVE_EXPLANATIONS[req.trigger!]}), so this passes automatically`,
        satisfied: true,
        hardBlock: false,
        // Deliberately NOT `advisory` from `blocks` above: an item whose
        // trigger does not apply is genuinely non-blocking here, whatever its
        // tier, and rendering it as an ordinary blocking item that happens to
        // be satisfied would overstate what was checked.
        advisory: true,
        source: req.source,
        tier: req.tier,
        coverageNote: req.coverageNote,
      });
      continue;
    }
    if (req.check.kind === 'manual') {
      items.push({ id: req.id, label: req.label, satisfied: false, hardBlock: false, pending: true, advisory, source: req.source, tier: req.tier, coverageNote: req.coverageNote });
      continue;
    }
    // `clearedByConditions` (D4's conditional-acceptance route) gets exactly the
    // treatment the open-non-critical-next-action item below has always had:
    // hardBlock false, and satisfied once Proceed with Conditions is the decision
    // on the table. `decisionOverride` is what makes the Save-guard able to ask
    // "would the decision I am about to record be rejected?".
    const satisfiedNow = evaluateReadinessCheck(project, req.check, gateId).satisfied;
    const decisionOnTable =
      decisionOverride !== undefined ? decisionOverride : project.gates.find((g) => g.gateId === gateId)?.decision;
    items.push({
      id: req.id,
      label: req.clearedByConditions && !satisfiedNow ? `${req.label} — or record Proceed with Conditions` : req.label,
      satisfied:
        satisfiedNow || (req.clearedByConditions === true && decisionOnTable === 'Proceed with Conditions'),
      hardBlock: blocks && !req.clearedByConditions,
      advisory,
      link: resolveCheckLink(gateId, req.check),
      source: req.source,
      tier: req.tier,
      coverageNote: req.coverageNote,
    });
  }

  // Next Actions (B2 + F8) — kept last (user-requested, 2026-07-26): every
  // other item above is specific evidence tied to this gate's own subject
  // matter, while Next Actions are a general project-management backstop
  // that applies at every gate the same way. Two separate items, kept next
  // to each other, because they differ in severity: Critical ones hard-block
  // regardless of decision, while the rest only block a plain Proceed and
  // are specifically allowed to stay open under Proceed with Conditions.
  // Merging them into one item would hide which severity is actually the
  // problem and make the "clears with Proceed with Conditions" note (only
  // true for the non-critical item) ambiguous.
  const criticalOpen = openNextActions(project, gateId).filter((a) => a.priority === 'Critical');
  items.push({
    id: 'critical-next-actions',
    label:
      criticalOpen.length > 0
        ? `${criticalOpen.length} open Critical next action${criticalOpen.length > 1 ? 's' : ''} — must be closed before the gate can pass (Critical blocks even Proceed with Conditions)`
        : 'No open Critical next actions',
    satisfied: criticalOpen.length === 0,
    hardBlock: true,
    link: phaseSectionLink(gateId, 'sec-next-actions'),
  });

  const record = project.gates.find((g) => g.gateId === gateId);
  const decision = decisionOverride !== undefined ? decisionOverride : record?.decision;
  const otherOpen = openNextActions(project, gateId).filter((a) => a.priority !== 'Critical');
  items.push({
    id: 'open-next-actions',
    label:
      otherOpen.length > 0
        ? `${otherOpen.length} open next action${otherOpen.length > 1 ? 's' : ''} — complete them or record Proceed with Conditions`
        : 'No open next actions',
    satisfied: otherOpen.length === 0 || decision === 'Proceed with Conditions',
    hardBlock: false,
    link: phaseSectionLink(gateId, 'sec-next-actions'),
  });

  // Register closing (2026-08-27, user-requested) — kept last, alongside Next
  // Actions: a general precondition that applies the same way at every gate,
  // not evidence specific to this gate's own subject matter. Always a hard
  // block, never cleared by Proceed with Conditions — closing is the whole
  // point of the mechanism, not a soft nicety.
  items.push(...unclosedRegistersBlocking(project, gateId));

  return items;
}

// Every register whose OWN highest listed gate (gateRefHighestGateId) is at
// or before the gate being evaluated must be closed (Review owner + Co-sign
// both signed) before that gate may pass — closing is now a PRECONDITION for
// the gate, not a consequence of it having passed (contrast isGateRefLocked,
// which still applies independently — see the guard in setRegisterRows).
// Cumulative by design: once a register closes it can only reopen via
// Backtrack, which also reopens the gate range that depended on it, so an
// already-closed register showing satisfied at every later gate is the
// steady-state, not clutter — an unsatisfied item this far down the gate
// sequence means something is genuinely inconsistent (the same class of
// problem verify:scaffold's other sweeps exist to catch).
//
// [ASSUMPTION: R5-Q21] — the whole register-closing mechanism this function
// enforces is a new rule, not transcribed from the workbook; built on the
// project owner's own instruction before asking the SME team — see
// docs/rules/F1_Per_Gate_Open_Questions.md.
//
// ONE combined item, not one per register (2026-08-27, user-reported): a
// project that has closed nothing yet — the state of every project right
// after this feature ships — piled up 72 separate "must be closed..." lines
// on Gate 12 alone (68 closeable registers total), each repeating the same
// boilerplate sentence. The underlying rule stays exactly as strict (Gate 12
// genuinely cannot pass while any of them is open), only the PRESENTATION
// collapses to one line so the panel stays readable.
function unclosedRegistersBlocking(project: ProjectData, gateId: string): GateReadinessItem[] {
  const currentIdx = gateIndex(gateId);
  const relevant = REGISTER_CONFIGS.filter((config) => {
    const thresholdId = gateRefHighestGateId(config.gate);
    return !!thresholdId && gateIndex(thresholdId) <= currentIdx;
  });
  if (relevant.length === 0) return [];
  const unclosed = relevant.filter((config) => !isRegisterClosed(project.registerClosures[config.key]));
  if (unclosed.length === 0) {
    return [
      {
        id: 'unclosed-registers',
        label: `${relevant.length} register(s) closed (Review owner + Co-sign)`,
        satisfied: true,
        hardBlock: true,
      },
    ];
  }
  const shown = unclosed.slice(0, 8).map((c) => c.title);
  const names = shown.join(', ') + (unclosed.length > shown.length ? `, +${unclosed.length - shown.length} more` : '');
  return [
    {
      id: 'unclosed-registers',
      label: `${unclosed.length} of ${relevant.length} register(s) must be closed (Review owner + Co-sign) before this gate can pass: ${names}`,
      satisfied: false,
      hardBlock: true,
    },
  ];
}

// Blockers that even a "Proceed with Conditions" decision cannot clear —
// the `gateReadinessChecklist` items still unsatisfied, restricted to the
// ones that hard-block. Used by the UI to disable "Proceed with Conditions"
// too, not just plain "Proceed" — see `gateBlockers` below for the softer,
// PwC-clearable open-next-action case this deliberately excludes.
export function hardGateBlockers(project: ProjectData, gateId: string): GateBlocker[] {
  return gateReadinessChecklist(project, gateId)
    .filter((item) => item.hardBlock && !item.satisfied && !item.pending && !item.advisory)
    .map(({ satisfied: _satisfied, ...blocker }) => blocker);
}

// Reasons the gate cannot pass yet even with a positive decision recorded —
// every unsatisfied `gateReadinessChecklist` item (hard and soft alike).
// `decisionOverride` lets a caller ask "if this decision were recorded,
// would it still be blocked?" without having committed it yet — used to
// validate a pending (unsaved) decision in the Phase Gate Flow draft before
// Save is enabled, and by the store guards before committing it.
export function gateBlockers(
  project: ProjectData,
  gateId: string,
  decisionOverride?: GateRecord['decision'],
): GateBlocker[] {
  return gateReadinessChecklist(project, gateId, decisionOverride)
    .filter((item) => !item.satisfied && !item.pending && !item.advisory)
    .map(({ satisfied: _satisfied, ...blocker }) => blocker);
}

export function isGatePassed(project: ProjectData, gateId: string): boolean {
  const r = project.gates.find((g) => g.gateId === gateId);
  if (!(r?.status === 'Complete' && !!r.decision && PASSING_DECISIONS.includes(r.decision))) {
    return false;
  }
  return gateBlockers(project, gateId).length === 0;
}

// Work is marked Complete but a passing decision (Proceed / Proceed with
// Conditions) has not been recorded yet — the gate is Pending (rule B1).
export function isAwaitingDecision(project: ProjectData, gateId: string): boolean {
  const r = project.gates.find((g) => g.gateId === gateId);
  return r?.status === 'Complete' && !isGatePassed(project, gateId);
}

// ---------------------------------------------------------------------------
// Gate-level evidence edit lock (2026-07-23, user-requested)
// ---------------------------------------------------------------------------
//
// Once a gate has PASSED, the evidence tied to it is READ-ONLY: correcting a
// passed gate's data must go through Backtrack (which un-passes the gate and
// reopens it for rework), never a silent in-place edit ("no silent
// corrections", B4). Not-yet-passed gates (the current gate and future ones)
// stay editable, so entering data early / pre-work on later gates is still
// allowed. A page or register used across SEVERAL gates (config `gate` like
// '04/07' — e.g. Ingredient Substitution Evidence, used at Gate 04 and again
// at Gate 07) only locks once EVERY one of those gates has passed, so it stays
// editable through the last gate that still relies on it.
//
// `gateRef` is a config `gate` string: a single number ('04'), a slash list
// ('04/07', '05/07/10'), 'ALL', or undefined. 'ALL'/undefined never lock
// (cross-cutting evidence like the Evidence Summary or Change Control).
//
// Which gates a config `gate` string refers to, as gate ids. Empty for
// 'ALL'/undefined/unparseable (i.e. "not tied to specific gates" — never
// locks). Exported so the Gate Rules & Sheet Map page can display the same
// lock rule this function enforces without re-implementing the parsing.
// Accepts '/' and '-' as separators: phases.ts writes the Testing Families
// checklist section as '08-09' while every register uses '04/07' — both mean
// the same "these gates" list (fixed 2026-07-25: the dash form used to parse
// to nothing, so that one section could never lock).
export function gateRefGateIds(gateRef: string | undefined): string[] {
  if (!gateRef) return [];
  const ref = gateRef.trim();
  if (ref === '' || ref.toUpperCase() === 'ALL') return [];
  return ref
    .split(/[/-]/)
    .map((n) => GATES.find((g) => g.number === n.trim())?.id)
    .filter((id): id is string => !!id);
}

export function isGateRefLocked(project: ProjectData, gateRef: string | undefined): boolean {
  const gateIds = gateRefGateIds(gateRef);
  if (gateIds.length === 0) return false;
  return gateIds.every((id) => isGatePassed(project, id));
}

// The HIGHEST gate a config `gate` string refers to, by numeric position —
// NOT the last one written (a spec could in principle list them out of
// order) and NOT the same thing `isGateRefLocked` computes (that one needs
// EVERY listed gate passed; this needs just the furthest one). Added
// 2026-08-27 for register closing (below): a register must be CLOSED before
// this gate may pass, mirroring the same "the register stays relevant
// through its last listed gate" reasoning isGateRefLocked already uses for
// unlocking. Undefined for 'ALL'/unset — those never gate a closing
// requirement either, same as they never lock.
export function gateRefHighestGateId(gateRef: string | undefined): string | undefined {
  const gateIds = gateRefGateIds(gateRef);
  if (gateIds.length === 0) return undefined;
  return gateIds.reduce((highest, id) => (gateIndex(id) > gateIndex(highest) ? id : highest));
}

// ---------------------------------------------------------------------------
// Phase completion (rule B3)
// ---------------------------------------------------------------------------

export function isPhaseApproved(project: ProjectData, phase: number): boolean {
  const closure = project.phaseClosures[phase];
  if (!closure) return false;
  // D1: a signature is an authenticated act, so "approved" keys on the
  // server-recorded signer + timestamp, never on typed text (a name could be
  // typed by anyone, including for somebody else — see isSignedOff).
  return isSignedOff(closure.signOffs.find((s) => s.role === 'Approved by'));
}

export function isLastGateOfPhase(index: number): boolean {
  const meta = GATES[index];
  return !!meta && GATES[index + 1]?.phase !== meta.phase;
}

function phaseGateNumbers(phase: number): string[] {
  return GATES.filter((g) => g.phase === phase).map((g) => g.number);
}

export interface PhaseCompletionChecklist {
  gatesPassed: boolean;
  keyChecksDone: boolean; // every key gate check done/Y or justified N/A
  anglesCovered: boolean; // every angle covered/Y or justified N/A
  actionsClosed: boolean; // no open next actions, except under Proceed with Conditions
  // F13/B5: for phase > 1, the responsible owner must formally accept any
  // pre-work before the phase can close — always true for phase 1 (nothing
  // can be "pre-work" before the very first phase).
  preWorkAccepted: boolean;
  signOffsComplete: boolean; // Prepared + Reviewed + Approved all signed
  canSignOff: boolean; // sign-off unlocks only once the sections above are done
  complete: boolean;
}

export function phaseCompletionChecklist(project: ProjectData, phase: number): PhaseCompletionChecklist {
  const phaseGates = GATES.filter((g) => g.phase === phase);
  const gatesPassed = phaseGates.every((g) => isGatePassed(project, g.id));

  // N/A counts as complete only when justified (notes / comments recorded).
  const numbers = phaseGateNumbers(phase);
  const checks = project.gateChecks.filter(
    (c) => numbers.includes(c.gate) || (phase === 4 && c.gate === 'ALL'),
  );
  const keyChecksDone = checks.every(
    (c) => (c.done && c.ynna === 'Y') || (c.ynna === 'NA' && !!c.notes?.trim()),
  );

  const closure = project.phaseClosures[phase];
  const anglesCovered = (closure?.angles ?? []).every(
    (a) => (a.covered && a.ynna === 'Y') || (a.ynna === 'NA' && !!a.comments?.trim()),
  );

  const actionsClosed = phaseGates.every((g) => {
    const record = project.gates.find((r) => r.gateId === g.id);
    const open = openNextActions(project, g.id);
    // F8: a Critical action is never "closed enough" — it blocks even under
    // Proceed with Conditions.
    if (open.some((a) => a.priority === 'Critical')) return false;
    return open.length === 0 || record?.decision === 'Proceed with Conditions';
  });

  const signOffsComplete =
    (closure?.signOffs ?? []).length > 0 && (closure?.signOffs ?? []).every(isSignedOff);

  const preWorkAccepted = phase === 1 || !!closure?.preWork?.acceptedBy;

  const canSignOff = gatesPassed && keyChecksDone && anglesCovered && actionsClosed && preWorkAccepted;

  return {
    gatesPassed,
    keyChecksDone,
    anglesCovered,
    actionsClosed,
    preWorkAccepted,
    signOffsComplete,
    canSignOff,
    complete: canSignOff && signOffsComplete,
  };
}

export function isPhaseComplete(project: ProjectData, phase: number): boolean {
  return phaseCompletionChecklist(project, phase).complete;
}

// ---------------------------------------------------------------------------
// Sequential unlocking
// ---------------------------------------------------------------------------

// Index of the gate currently open for work: the first gate that is not yet
// passed, or a phase-closing gate whose phase is not yet fully complete.
export function currentGateIndex(project: ProjectData): number {
  for (let i = 0; i < GATES.length; i++) {
    const meta = GATES[i];
    if (!isGatePassed(project, meta.id)) return i;
    if (isLastGateOfPhase(i) && !isPhaseComplete(project, meta.phase)) return i;
  }
  return GATES.length;
}

// B4 ("no silent corrections"): only the single gate currently open for work
// may have its Phase Gate Flow fields edited directly. An already-PASSED
// gate is not "unlocked" for editing — correcting it must go through
// Backtrack (which snapshots the prior state and invalidates downstream
// approvals), never a silent direct edit. Previously this allowed any gate
// at or before the current index (`<=`), which let earlier passed gates be
// edited in place with no audit trail — tightened to `===` to match this
// function's own documented intent ("the single gate currently open for
// work", see CLAUDE.md).
export function isGateUnlocked(project: ProjectData, gateId: string): boolean {
  return gateIndex(gateId) === currentGateIndex(project);
}

// The gate `number` (e.g. '01') of the gate currently open for work, for UI
// highlighting — undefined once every gate has passed.
export function currentGateNumber(project: ProjectData): string | undefined {
  return GATES[currentGateIndex(project)]?.number;
}

export type GateState = 'passed' | 'current' | 'locked' | 'hold' | 'gap';

export function gateState(project: ProjectData, gateId: string): GateState {
  const record = project.gates.find((g) => g.gateId === gateId);
  if (record?.status === 'Hold') return 'hold';
  if (record?.status === 'Gap') return 'gap';
  if (isGatePassed(project, gateId)) return 'passed';
  const idx = gateIndex(gateId);
  const current = currentGateIndex(project);
  return idx > current ? 'locked' : 'current';
}

export type PhaseProgressState = 'completed' | 'current' | 'locked';

export interface PhaseProgress {
  state: PhaseProgressState;
  passedGates: number;
  totalGates: number;
  approved: boolean;
  awaitingApproval: boolean; // all gates passed but closure conditions/sign-off pending
}

export function phaseProgress(project: ProjectData, phase: number): PhaseProgress {
  const phaseGates = GATES.filter((g) => g.phase === phase);
  const passedGates = phaseGates.filter((g) => isGatePassed(project, g.id)).length;
  const checklist = phaseCompletionChecklist(project, phase);
  const allPassed = passedGates === phaseGates.length;
  const current = currentGateIndex(project);
  const firstIdx = gateIndex(phaseGates[0].id);

  let state: PhaseProgressState;
  if (checklist.complete) state = 'completed';
  else if (current >= firstIdx) state = 'current';
  else state = 'locked';

  return {
    state,
    passedGates,
    totalGates: phaseGates.length,
    approved: isPhaseApproved(project, phase),
    awaitingApproval: allPassed && !checklist.complete,
  };
}

export function hasReachedPhase(project: ProjectData, phase: number): boolean {
  return phaseProgress(project, phase).state !== 'locked';
}

export function positionSentence(project: ProjectData): string {
  const idx = currentGateIndex(project);
  if (idx >= GATES.length) return 'All 12 gates are complete.';
  const meta = GATES[idx];
  return `The project is currently at Gate ${meta.number} (Phase ${meta.phase}).`;
}
