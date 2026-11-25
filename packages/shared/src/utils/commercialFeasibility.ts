// Round 5 question 21 (SME answer, 2026-11-05): which costing results let a Gate 5 decision go ahead on a commercially dependent project (the
// Phase 1 requirement "Target cost or commercial boundary" is a Must).
//
//   "Neither Feasible with Conditions nor In Progress demonstrates unconditional achievement of a Must cost target; neither permits plain Proceed.
//    Feasible with Conditions can use Proceed with Conditions with commercial acceptance and tracked actions. In Progress needs enough assessed
//    costing to bound the outstanding risk, otherwise Hold. Not Feasible normally means Hold or an explicit authorised revision of the commercial
//    requirement/business decision; a conditional signature alone cannot declare a failed Must requirement met. N/A requires a justified scope
//    decision, not missing costing."
//
// Two questions, kept apart because Proceed with Conditions clears one and not the other:
//   - what a PLAIN Proceed needs: Commercially Feasible, or an N/A whose scope decision is recorded;
//   - what a Proceed with Conditions may CARRY: the status's own supports below. The Commercial Approver's decision (acceptance, authorised revision,
//     scope decision) is `commercialDecisionBy`, written by the server from the project's Commercial Approver. What counts as "enough assessed
//     costing to bound the risk" is a recorded bound (`riskBound`); the answer does not say what the minimum is [ASSUMPTION: R6-Q29].
import type { ProjectData } from '../types';
import { COSTING_STATUS_NOT_APPLICABLE } from '../config/gates';
import { controlledActionGaps } from './controlledActions';
import { changeLinkProblem } from './changeLinks';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const COSTING_FEASIBLE = 'Commercially Feasible';
export const COSTING_FEASIBLE_WITH_CONDITIONS = 'Feasible with Conditions';
export const COSTING_IN_PROGRESS = 'In Progress';
export const COSTING_NOT_FEASIBLE = 'Not Feasible';

export function costingStatusOf(project: ProjectData): string {
  return text(project.costing.feasibilityStatus);
}

// "N/A requires a justified scope decision, not missing costing": a rationale AND the Commercial Approver's decision that it is out of scope.
export function costingNotApplicableGaps(project: ProjectData): string[] {
  const gaps: string[] = [];
  if (text(project.costing.assumptions) === '') gaps.push('why costing does not apply (in Assumptions or conditions)');
  if (text(project.costing.commercialDecisionBy) === '') gaps.push('the scope decision, recorded by the Commercial Approver');
  return gaps;
}

// What a plain Proceed accepts. A status that is blank or Not Started is no answer.
export function costingPlainProceedOk(project: ProjectData): boolean {
  const status = costingStatusOf(project);
  if (status === COSTING_FEASIBLE) return true;
  if (status === COSTING_STATUS_NOT_APPLICABLE) return costingNotApplicableGaps(project).length === 0;
  return false;
}

// What a Proceed with Conditions still lacks to carry this costing; empty when it can (including when the costing is already feasible).
export function costingCarriedGaps(project: ProjectData): string[] {
  const status = costingStatusOf(project);
  const c = project.costing;
  if (status === '' || status === 'Not Started') return ['a costing status'];
  if (status === COSTING_FEASIBLE) return [];
  if (status === COSTING_STATUS_NOT_APPLICABLE) return costingNotApplicableGaps(project);
  if (status === COSTING_FEASIBLE_WITH_CONDITIONS) {
    const gaps: string[] = [];
    if (text(c.commercialDecisionBy) === '') gaps.push('the commercial acceptance of the conditions, recorded by the Commercial Approver');
    const action = project.nextActions.find((a) => a.id === text(c.conditionActionId));
    const missing = action && action.status !== 'Cancelled' ? controlledActionGaps(action) : ['a tracked Next Action'];
    if (missing.length > 0) gaps.push(`a tracked action carrying the conditions (needs ${missing.join(', ')})`);
    return gaps;
  }
  if (status === COSTING_IN_PROGRESS) {
    return text(c.riskBound) === '' ? ['the outstanding costing risk and its bound — without it the decision is Hold'] : [];
  }
  if (status === COSTING_NOT_FEASIBLE) {
    const gaps: string[] = [];
    if (text(c.commercialDecisionBy) === '') gaps.push('the authorisation of the Commercial Approver');
    const change = project.changes.find((x) => x.changeId === text(c.revisionChangeId));
    const problem = changeLinkProblem(change, 'implementation');
    if (problem) gaps.push(`the Change Control record that revises the commercial requirement (${problem})`);
    return gaps;
  }
  return [];
}
