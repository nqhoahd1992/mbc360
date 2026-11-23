// Round 5 question 15 (SME answer, 2026-11-05).
//
// (a) "Create a controlled Next Action linked to the deferred requirement, with owner, due date, completion criteria and escalation. Gate 2
//     cannot pass conditionally without it. Must requirements cannot be deferred by relabelling them Should/Could; a changed requirement needs
//     an approved scope change and impact review."
// (b) "Yes. Every applicable requirement needs Must/Should/Could priority. N/A rows require rationale. A blank priority is incomplete."
//     (b) was built before the answer and is unchanged.
//
// Read here:
//   - A requirement is DEFERRED when it is applicable (not N/A), is a Should or a Could, and is not yet Complete when the gate is decided. A Must
//     is never deferred: the gate waits for it (requirementsDispositioned).
//   - A deferral is carried by a tracked Next Action: the row names an action (`deferralActionId`) of the row's own gate that has an owner, a
//     due date, completion criteria and an escalation trigger and has not been cancelled — the same test as a gap's action (controlledActions.ts).
//   - Once the requirements have been APPROVED — Gate 2 passed now, or passed once and reopened by a Backtrack — a change to a row's priority,
//     to what it says, or to whether it applies is a changed requirement, and needs a linked scope change (`scopeChangeId`): a Change Control
//     record approved to implement whose impact has been assessed. Relabelling a Must as a Should is such a change, so it cannot be used to
//     slip a Must out of the gate. Before the approval the list is still being drafted and is free to change.
// The readings are ours, [ASSUMPTION: R6-Q21].
import type { ProjectData, RequirementItem } from '../types';
import { REQUIREMENT_NOT_APPLICABLE } from '../config/gates';
import { isGateRecordedPassed } from './changeTriage';
import { changeLinkProblem, resolveChangeRef } from './changeLinks';
import { controlledActionGaps } from './controlledActions';
import { isDoneStatus } from './doneStatus';

export const DEFERRABLE_PRIORITIES: readonly string[] = ['Should', 'Could'];
export const REQUIREMENTS_SECTION = 'projectRequirements';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const isDeferrablePriority = (priority: string | undefined): boolean => DEFERRABLE_PRIORITIES.includes(text(priority));

// A requirement the project is carrying past the gate: applicable, a Should or a Could, not yet Complete.
export function isOpenDeferral(row: Pick<RequirementItem, 'priority' | 'status'>): boolean {
  return isDeferrablePriority(row.priority) && !isDoneStatus(row.status) && row.status !== REQUIREMENT_NOT_APPLICABLE;
}

export function openDeferrals(project: ProjectData, section: string = REQUIREMENTS_SECTION): RequirementItem[] {
  return (project.requirements[section] ?? []).filter(isOpenDeferral);
}

// Why this deferral is not carried by a tracked action yet, or undefined when it is.
export function deferralProblem(project: ProjectData, row: RequirementItem): string | undefined {
  const id = text(row.deferralActionId);
  if (id === '') return 'no tracked Next Action is linked';
  const action = project.nextActions.find((a) => a.id === id);
  if (!action) return 'the linked Next Action no longer exists';
  if (action.gateId !== `SG${row.gate}`) return `the linked Next Action belongs to ${action.gateId}, not Gate ${row.gate}`;
  if (action.status === 'Cancelled') return 'the linked Next Action was cancelled';
  const gaps = controlledActionGaps(action);
  return gaps.length > 0 ? `the linked Next Action still needs ${gaps.join(', ')}` : undefined;
}

export interface UntrackedDeferral {
  requirement: string;
  why: string;
}
export function untrackedDeferrals(project: ProjectData, section: string = REQUIREMENTS_SECTION): UntrackedDeferral[] {
  return openDeferrals(project, section).flatMap((row) => {
    const why = deferralProblem(project, row);
    return why ? [{ requirement: row.requirement, why }] : [];
  });
}

// The requirements are approved once Gate 2 has passed — now, or at some time before a Backtrack reopened it. The history the application keeps
// and never erases, like formulaWasApproved.
export function requirementsWereApproved(project: ProjectData): boolean {
  if (isGateRecordedPassed(project.gates.find((g) => g.gateId === 'SG02'))) return true;
  return project.backtrackEvents.some((e) => isGateRecordedPassed(e.previousGates.find((g) => g.gateId === 'SG02')));
}

export type RequirementChangeKind = 'priority' | 'wording' | 'applicability';

// What a proposed row changes against the stored one, in the three ways a requirement itself can change. Moving a row from Not Started to
// Complete is progress, not a changed requirement, and is none of these.
export function requirementChangeKinds(
  stored: Pick<RequirementItem, 'priority' | 'requirementText' | 'status'>,
  next: Pick<RequirementItem, 'priority' | 'requirementText' | 'status'>,
): RequirementChangeKind[] {
  const kinds: RequirementChangeKind[] = [];
  if (text(stored.priority) !== text(next.priority)) kinds.push('priority');
  if (text(stored.requirementText) !== text(next.requirementText)) kinds.push('wording');
  if ((stored.status === REQUIREMENT_NOT_APPLICABLE) !== (next.status === REQUIREMENT_NOT_APPLICABLE)) kinds.push('applicability');
  return kinds;
}

// Why a scope change named on a row does not serve ("approved to implement, impact assessed"), or undefined when it does.
export function scopeChangeProblem(project: ProjectData, ref: string | undefined): string | undefined {
  if (text(ref) === '') return 'no approved scope change is linked';
  const change = resolveChangeRef(project.changes, text(ref));
  if (change?.projectId && change.projectId !== project.identity.id) return 'it is not a Change Control record on this project';
  return changeLinkProblem(change, 'implementation');
}
