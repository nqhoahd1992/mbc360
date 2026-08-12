import type { GateRecord, NextAction, ProjectData, RegisterRow } from '../types';
import { NEXT_ACTION_TERMINAL_STATUSES } from '../types';
import { GATES } from '../config/gates';
import {
  CLAIM_CATEGORIES_NEEDING_REVIEW,
  CLAIM_REVIEWED_WORDING_COLUMN,
  CLAIM_REVIEW_COLUMNS,
  CLAIM_RISKS_NEEDING_REVIEW,
  CLAIM_WORDING_COLUMN,
} from '../config/claimReview';
import { TARGET_USER_TO_VULNERABLE_GROUP } from '../config/vulnerableGroups';
import { RM_EVIDENCE_REGISTER, conditionallyAcceptedRmRows, hasUsableRmRow, unresolvedRmRows } from './rmEvidence';
import { WATCHLIST_REGISTER, watchlistConditionalRows, watchlistHardBlockers } from './watchlistReview';
import { openCriticalSafetyFindings } from './safetyFindings';
import {
  GATE_READINESS,
  type ReadinessCheck,
  type ReadinessRequirement,
  type ReadinessSource,
  type ReadinessTier,
  type ReadinessTrigger,
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

// Is a named trigger active for this project? Conditional requirements only
// become mandatory (and only able to hard-block) when their trigger applies.
function isReadinessTriggerActive(project: ProjectData, trigger: ReadinessTrigger): boolean {
  switch (trigger) {
    case 'skincareForTwo':
      return isSkincareForTwoTriggered(project);

    // A3: mandatory "before ANY study involving human participants". Study
    // Protocol Setup is `mode: 'fixed'`, so its rows are seeded — the signal is
    // a row someone has actually filled a planned value into, never row count,
    // which would be true from creation [ASSUMPTION: R4-Q5].
    case 'humanStudyPlanned':
      return (project.registers['studyProtocolSetup'] ?? []).some(
        (r) => String(r.plannedValue ?? '').trim() !== '',
      );

    // A3, Gates 5 and 9. Only 'Susceptible' triggers; the other four values are
    // the N/A route the team allowed, and each already demands a rationale
    // before it can be saved.
    case 'microbiologicallySusceptible':
      return project.formulaProperties.microSusceptibility === 'Susceptible';

    // A3: "new product, claim extension, repositioning project,
    // customer/distributor-led request, or where a benchmark/reference product
    // is named. Not mandatory for a purely administrative change." Three
    // independent limbs, any one of which fires. Which project natures count as
    // administrative is our reading [ASSUMPTION: R4-Q7].
    //
    // The first two limbs read gate-01 CHECKLIST sections (2026-08-10, moved off
    // two single-valued identity fields — see config/phases.ts). Both use
    // `selected`, matching skincareForTwoTriggers above; ChecklistSection sets
    // status Y from the same tick, so the two signals move together.
    // C1: three of its seven conditions, the ones reading B7's per-claim
    // classification. The other four have no data source — they are listed on the
    // item itself (coverageNote) so a green tick never claims more than it checked.
    case 'claimNeedsRegulatoryReview':
      return (project.registers['claimEvidenceTraceability'] ?? []).some(claimNeedsReview);

    case 'newOrRepositionedProject': {
      const natures = selectedChecklistLabels(project, 'projectNature');
      const origins = selectedChecklistLabels(project, 'requestOrigin');
      const benchmark = (project.requirements['projectRequirements'] ?? []).find(
        (r) => r.requirement === 'Benchmark or reference product',
      );
      return (
        natures.some((n) => NEW_OR_REPOSITIONED_NATURES.includes(n)) ||
        origins.some((o) => CUSTOMER_LED_ORIGINS.includes(o)) ||
        !!benchmark?.notes?.trim()
      );
    }
  }
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

// The three project natures we read as NOT "a purely administrative change".
// `Packaging change` and `Lifecycle improvement` are treated as administrative;
// `Reformulation` is the genuinely unclear one and is currently excluded, so it
// does NOT force a competitor review [ASSUMPTION: R4-Q7].
const NEW_OR_REPOSITIONED_NATURES = ['New development', 'Claim change', 'Market extension'];

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
  claimNeedsRegulatoryReview:
    'no declared claim is borderline, therapeutic-adjacent, high risk, still unclassified, or reworded since its last review',
};

// Evaluate a requirement's check against live project data. `evaluable` is false
// for `manual` checks (no linked data source yet — shown for confirmation, never
// hard-blocks); when false, `satisfied` is meaningless (reported as false/pending).
function evaluateReadinessCheck(
  project: ProjectData,
  check: ReadinessCheck,
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
    case 'rmEvidenceDispositioned':
      return {
        evaluable: true,
        satisfied: unresolvedRmRows(project.registers[RM_EVIDENCE_REGISTER] ?? []).length === 0,
      };
    case 'rmEvidenceNoneConditional':
      return {
        evaluable: true,
        satisfied: conditionallyAcceptedRmRows(project.registers[RM_EVIDENCE_REGISTER] ?? []).length === 0,
      };
    case 'noOpenCriticalSafetyFinding':
      return { evaluable: true, satisfied: openCriticalSafetyFindings(project).length === 0 };
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
      const naAllowed =
        !check.naInvalidWhenTrigger || !isReadinessTriggerActive(project, check.naInvalidWhenTrigger);
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
      return { evaluable: true, satisfied: row?.status === 'Completed' };
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
      const results = check.checks.map((c) => evaluateReadinessCheck(project, c));
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
    const active = req.trigger ? isReadinessTriggerActive(project, req.trigger) : true;
    const { evaluable, satisfied } = evaluateReadinessCheck(project, req.check);
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
      return phaseSectionLink(gateId, `sec-checklist-${check.section}`);
    case 'requirementDone':
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
      return { href: `/registers/reg/${RM_EVIDENCE_REGISTER}` };
    case 'watchlistReviewed':
    case 'watchlistNoneConditional':
      return { href: `/registers/reg/${WATCHLIST_REGISTER}` };
    case 'noOpenCriticalSafetyFinding':
      return { href: '/formulation-safety' };
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
      return { href: '/bom' };
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
    // A Conditional item tied to a named trigger (only `skincareForTwo`
    // today, e.g. Gate 4's "Pregnancy/breastfeeding caution screen") that
    // ISN'T currently active for this project: automatically satisfied, with
    // the label saying exactly why, rather than being hidden — "not shown"
    // used to read as "forgotten", not "checked and not applicable here".
    if (req.trigger && !isReadinessTriggerActive(project, req.trigger)) {
      items.push({
        id: req.id,
        label: `${req.label} — not triggered for this project (${TRIGGER_INACTIVE_EXPLANATIONS[req.trigger]}), so this passes automatically`,
        satisfied: true,
        hardBlock: false,
        // Deliberately NOT `advisory` from `blocks` above: an item whose
        // trigger is inactive is genuinely non-blocking here, whatever its
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
    const satisfiedNow = evaluateReadinessCheck(project, req.check).satisfied;
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

  return items;
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

// ---------------------------------------------------------------------------
// Phase completion (rule B3)
// ---------------------------------------------------------------------------

export function isPhaseApproved(project: ProjectData, phase: number): boolean {
  const closure = project.phaseClosures[phase];
  if (!closure) return false;
  const approved = closure.signOffs.find((s) => s.role === 'Approved by');
  return !!(approved?.name?.trim() || approved?.initials?.trim());
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

  const signOffsComplete = (closure?.signOffs ?? []).every(
    (s) => !!(s.name?.trim() || s.initials?.trim()),
  );

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
