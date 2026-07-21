import type { NextAction, ProjectData } from '../types';
import { NEXT_ACTION_TERMINAL_STATUSES } from '../types';
import { GATES } from '../config/gates';
import {
  GATE_READINESS,
  type ReadinessCheck,
  type ReadinessRequirement,
  type ReadinessTier,
  type ReadinessTrigger,
} from '../config/gateReadiness';

// Progression rules (confirmed by the subject-matter team — see
// docs/Business_Rules_Confirmation_EN.md, decisions B1-B4/C1):
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
    default:
      return false;
  }
}

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
    default:
      return { evaluable: false, satisfied: false };
  }
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

// Reasons the gate cannot pass yet even with a positive decision recorded.
export function gateBlockers(project: ProjectData, gateId: string): string[] {
  const blockers: string[] = [];
  const record = project.gates.find((g) => g.gateId === gateId);

  // B2 + F8: open next actions block a plain Proceed. Under Proceed with
  // Conditions non-critical actions are tracked but allowed to stay open — but a
  // CRITICAL action blocks gate closure even under Proceed with Conditions (F8).
  const open = openNextActions(project, gateId);
  const criticalOpen = open.filter((a) => a.priority === 'Critical');
  const otherOpen = open.filter((a) => a.priority !== 'Critical');
  if (criticalOpen.length > 0) {
    blockers.push(
      `${criticalOpen.length} open Critical next action${criticalOpen.length > 1 ? 's' : ''} — must be closed before the gate can pass (Critical blocks even Proceed with Conditions)`,
    );
  }
  if (otherOpen.length > 0 && record?.decision !== 'Proceed with Conditions') {
    blockers.push(
      `${otherOpen.length} open next action${otherOpen.length > 1 ? 's' : ''} — complete them or record Proceed with Conditions`,
    );
  }

  // C1: Skincare for Two hard-blocks Gate 07 until the mandatory maternal and
  // infant-contact safety sections are fully completed. (This gives a detailed
  // per-section message; the equivalent F1 readiness check is skipped in the
  // loop below to avoid a duplicate, less specific line.)
  if (gateId === 'SG07') {
    const incomplete = skincareForTwoIncompleteSections(project);
    if (incomplete.length > 0) {
      blockers.push(`Skincare for Two safety screen incomplete: ${incomplete.join('; ')}`);
    }
  }

  // F1 / C7: Mandatory evidence requirements with a wired data source hard-block
  // the gate when unsatisfied. Manual (unwired) requirements never hard-block —
  // they surface on the Gate Readiness panel for confirmation instead. The
  // skincareForTwo check is already covered by the dedicated C1 block above.
  for (const req of evaluateReadinessRequirements(project, gateId)) {
    if (req.blocking && GATE_READINESS[gateId]?.find((r) => r.id === req.id)?.check.kind !== 'skincareForTwo') {
      blockers.push(req.label);
    }
  }

  return blockers;
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

  const canSignOff = gatesPassed && keyChecksDone && anglesCovered && actionsClosed;

  return {
    gatesPassed,
    keyChecksDone,
    anglesCovered,
    actionsClosed,
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

export function isGateUnlocked(project: ProjectData, gateId: string): boolean {
  return gateIndex(gateId) <= currentGateIndex(project);
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
