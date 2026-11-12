// Round 5 question 11 (SME answer, 2026-11-05): the master change record is the CHG, and "area-specific assessments/tasks" hang off it; the
// commercial approval of NP (the Final Approver) is not a substitute for the technical, safety, regulatory or quality assessments.
//
// Each technical impact area a change names needs an assessment recorded by the holder of the function accountable for that area. The holder
// records it as themselves (SW-57: an administrator or the Final Approver does not stand in unless they also hold the function). Which function
// answers for which area, and that an assessment of either outcome unblocks the change from being approved (the outcome says what must then be
// done, it is not a verdict on the change), are our readings. [ASSUMPTION: R6-Q17]
import type { ChangeRecord } from '../types';

export const AREA_ASSESSMENT_OUTCOMES = ['No concern', 'Action required'] as const;

// area -> the review functions (ReviewRole keys) any of whose holders may assess it.
export const CHANGE_AREA_FUNCTIONS: Record<string, readonly string[]> = {
  Formula: ['formulation'],
  Artwork: ['packaging'],
  Packaging: ['packaging'],
  Claims: ['technical-claims', 'regulatory-claims'],
  Safety: ['safety-scientific'],
  Regulatory: ['regulatory'],
  Release: ['quality'],
};

export interface ChangeAreaAssessment {
  area: string;
  outcome: string;
  note?: string;
  assessedBy: string;
  assessedAt: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The areas of this change that still have no assessment.
export function areasAwaitingAssessment(change: ChangeRecord): string[] {
  const done = new Set((change.areaAssessments ?? []).filter((a) => (AREA_ASSESSMENT_OUTCOMES as readonly string[]).includes(text(a.outcome))).map((a) => a.area));
  return (change.impactAreas ?? []).filter((a) => a in CHANGE_AREA_FUNCTIONS && !done.has(a));
}

// An area assessment's own problems (the function holder is checked by the server).
export function areaAssessmentProblems(change: ChangeRecord, area: string, outcome: string, note: string): string[] {
  const problems: string[] = [];
  if (!(change.impactAreas ?? []).includes(area) || !(area in CHANGE_AREA_FUNCTIONS)) problems.push(`an impact area of this change that has an assessment (not "${area}")`);
  if (!(AREA_ASSESSMENT_OUTCOMES as readonly string[]).includes(outcome)) problems.push(`the outcome (${AREA_ASSESSMENT_OUTCOMES.join(' / ')})`);
  if (text(note) === '') problems.push('the note: what was assessed and found');
  return problems;
}
