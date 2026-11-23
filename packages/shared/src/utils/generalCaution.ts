// Round 5 question 16 (SME answer, 2026-11-05): the general restricted-and-caution assessment.
//
// (b) "Keep an explicit reviewed conclusion that screening was completed, including 'no restricted/caution issue identified' where supported. For a
//     product, this general assessment is mandatory: no findings means Complete with evidence, not N/A. An empty findings register is acceptable
//     only alongside that conclusion."  -> the Key Gate Check, which never accepts N/A and needs its evidence reference and initials.
// (c) "Use Gate 4 for initial screening/disposition and Gate 7 for final-formula closure, with reviewer trails for flagged issues."
// (d) "The five outcomes are usable. Add 'Further information required' and 'Considered - not selected'. At Gate 7, unresolved review/information
//     requirements block final safety closure unless a qualified reviewer explicitly accepts a non-critical residual action under Question 8.
//     'Restricted, reformulate' and prohibited use block until corrected. 'Within limit' needs concentration/exposure, market basis and evidence,
//     not only a status selection."
//
// What that comes to, row by row of the register (the readings are ours, [ASSUMPTION: R6-Q22]):
//   - a blank outcome is not a disposition, at either gate;
//   - "Restricted - reformulate" blocks at both gates until the row says something else (the formula was corrected);
//   - "Within limit - evidence linked" needs the formula percentage / exposure, the markets (the market basis) and the evidence link;
//   - the outcomes that name a review or ask for information (Needs Safety Review, Needs Regulatory Review, Further information required) are
//     flagged: at Gate 4 each needs its reviewer trail (assessment, reviewer, date, rationale) — an initial disposition; at Gate 7 each stays
//     blocking unless a qualified reviewer has accepted it as a non-critical residual action: the Non-critical assessment, the trail, and a
//     live controlled Next Action that carries it;
//   - "No issue identified" and "Considered - not selected" close a row.
import type { ProjectData, RegisterRow } from '../types';
import { WATCHLIST_ASSESSMENT_NON_CRITICAL } from '../config/registers';
import { isLiveControlledAction } from './controlledActions';
import { restrictedCautionLinkGap } from './restrictedCaution';

export const GENERAL_CAUTION_REGISTER = 'generalRestrictedCaution';

export const GC_NO_ISSUE = 'No issue identified';
export const GC_WITHIN_LIMIT = 'Within limit - evidence linked';
export const GC_RESTRICTED = 'Restricted - reformulate';
export const GC_NEEDS_SAFETY = 'Needs Safety Review';
export const GC_NEEDS_REGULATORY = 'Needs Regulatory Review';
export const GC_MORE_INFO = 'Further information required';
export const GC_NOT_SELECTED = 'Considered - not selected';

export const GENERAL_CAUTION_OUTCOMES = [GC_NO_ISSUE, GC_WITHIN_LIMIT, GC_RESTRICTED, GC_NEEDS_SAFETY, GC_NEEDS_REGULATORY, GC_MORE_INFO, GC_NOT_SELECTED] as const;

// The outcomes that name a review or ask for information: flagged findings.
const UNRESOLVED_OUTCOMES: readonly string[] = [GC_NEEDS_SAFETY, GC_NEEDS_REGULATORY, GC_MORE_INFO];

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const isUnresolvedOutcome = (outcome: unknown): boolean => UNRESOLVED_OUTCOMES.includes(text(outcome));

// The function(s) of whom ANY ONE may accept a flagged row as a non-critical residual action: the review the outcome names, and for a request
// for information either function. The same two authorities question 8 names for the watch-lists.
export type GeneralCautionAuthority = 'safety' | 'regulatory';
export function generalCautionAuthority(row: RegisterRow): GeneralCautionAuthority[] {
  const outcome = text(row.assessmentOutcome);
  if (outcome === GC_NEEDS_SAFETY) return ['safety'];
  if (outcome === GC_NEEDS_REGULATORY) return ['regulatory'];
  return ['safety', 'regulatory'];
}

export const generalCautionLabel = (row: RegisterRow): string => text(row.ingredientInci) || '(unnamed row)';

// The reviewer trail every flagged row needs: who assessed it, when, and why.
function trailGaps(row: RegisterRow): string[] {
  return [
    ['Reviewer assessment', row.reviewerAssessment],
    ['Reviewer', row.reviewer],
    ['Review date', row.reviewDate],
    ['Rationale', row.reviewRationale],
  ]
    .filter(([, value]) => text(value) === '')
    .map(([label]) => label as string);
}

// Why this row blocks the gate, in the words of the field to fill in. Empty = it does not.
export function generalCautionGaps(project: ProjectData, row: RegisterRow, gateId: 'SG04' | 'SG07'): string[] {
  // SW-59: the row names the company list entry it was assessed against and stays in step with that entry.
  const linkGap = restrictedCautionLinkGap(row, project.reference?.restrictedCaution);
  const rest = generalCautionOutcomeGaps(project, row, gateId);
  return linkGap ? [linkGap, ...rest] : rest;
}

function generalCautionOutcomeGaps(project: ProjectData, row: RegisterRow, gateId: 'SG04' | 'SG07'): string[] {
  const outcome = text(row.assessmentOutcome);
  if (outcome === '') return ['Assessment outcome'];
  if (outcome === GC_RESTRICTED) return ['"Restricted - reformulate" blocks until the formula is corrected and the outcome changed'];
  if (outcome === GC_WITHIN_LIMIT) {
    return [
      ['Formula % / exposure', row.formulaExposure],
      ['Markets affected (the market basis)', row.markets],
      ['Evidence link', row.evidenceLink],
    ]
      .filter(([, value]) => text(value) === '')
      .map(([label]) => label as string);
  }
  if (!isUnresolvedOutcome(outcome)) return [];
  // Flagged: a reviewer trail at both gates; at Gate 7 also the qualified reviewer's acceptance as a non-critical residual action.
  const gaps = trailGaps(row);
  if (gateId === 'SG04') return gaps;
  if (text(row.reviewerAssessment) !== WATCHLIST_ASSESSMENT_NON_CRITICAL) {
    return [...gaps, 'unresolved: a qualified reviewer must accept it as a non-critical residual action (assessment Non-critical), or it is resolved'];
  }
  const linked = project.nextActions.find((a) => a.id === text(row.linkedNextActionId));
  if (!isLiveControlledAction(linked)) gaps.push('Linked Next Action (a tracked action with owner, due date, completion criteria and escalation)');
  return gaps;
}

export interface GeneralCautionBlocker {
  label: string;
  gaps: string[];
}
export function generalCautionBlockers(project: ProjectData, gateId: 'SG04' | 'SG07'): GeneralCautionBlocker[] {
  return (project.registers[GENERAL_CAUTION_REGISTER] ?? []).flatMap((row) => {
    const gaps = generalCautionGaps(project, row, gateId);
    return gaps.length > 0 ? [{ label: generalCautionLabel(row), gaps }] : [];
  });
}

// The rows a person just accepted as a non-critical residual action: the Non-critical assessment newly set. Acceptance needs the authority
// above, exercised by the person named as the row's reviewer. Matched by ingredient (the register is free-form, so rows have no other key).
export function newlyAcceptedGeneralCautionRows(committed: RegisterRow[], next: RegisterRow[]): RegisterRow[] {
  return next.filter((row) => {
    if (text(row.reviewerAssessment) !== WATCHLIST_ASSESSMENT_NON_CRITICAL) return false;
    if (!isUnresolvedOutcome(row.assessmentOutcome)) return false;
    const old = committed.find((c) => text(c.ingredientInci) === text(row.ingredientInci));
    return text(old?.reviewerAssessment) !== WATCHLIST_ASSESSMENT_NON_CRITICAL;
  });
}
