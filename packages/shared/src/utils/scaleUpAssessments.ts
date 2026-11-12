import { validChangeRefs } from './changeLinks';
import type { ProjectData, ScaleUpAssessment } from '../types';
import { SCALE_UP_RISK_OPTIONS, SCALE_UP_TIMINGS } from '../types';
import { SCALE_UP_AREA_NONE, SCALE_UP_OPEN_AREA, SCALE_UP_REVIEW_AREAS } from '../config/assessments';

// The scale-up / pilot assessment of Gate 9 as a LIST, one entry per affected area (Round 5 question 7). What is wrong with an entry is
// decided here, once, for the screen and the API. The details the answer leaves open are our readings [ASSUMPTION: R6-Q13].

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const isNoAffectedArea = (e: Pick<ScaleUpAssessment, 'area'>): boolean => text(e.area) === SCALE_UP_AREA_NONE;
export const isScaleUpPending = (e: Pick<ScaleUpAssessment, 'answer'>): boolean => {
  const a = text(e.answer);
  return a === '' || a === 'Pending assessment';
};

// Question 7(b)/(c): "New development" in either primary or secondary scope — a new formula.
export function isNewFormula(project: Pick<ProjectData, 'checklists'>): boolean {
  return (project.checklists['projectNature'] ?? []).some((i) => i.selected && i.label === 'New development');
}

// The three people a waiver of a separate pilot needs (question 7(c)): "Quality, Manufacturing and R&I". Each is a self-attested name and
// the person must hold that function on the project. Function keys are the review-area keys of config/reviewers.ts.
export const SCALE_UP_WAIVER_ROLES = [
  { field: 'waiverQualityBy', label: 'Quality', functionKey: 'quality' },
  { field: 'waiverManufacturingBy', label: 'Manufacturing', functionKey: 'manufacturing' },
  { field: 'waiverRiBy', label: 'R&I', functionKey: 'ri' },
] as const;

export interface ScaleUpContext {
  changeIds: readonly string[];
  // A new formula: a No cannot switch the assessment off.
  newFormula: boolean;
  // Whether the waiver of a separate pilot has to be COMPLETE. Gate 9 needs it; a save does not — Quality, Manufacturing and R&I confirm one
  // at a time, each saving as themselves, so a save that demanded all three could never be made by any of them.
  requireWaiver?: boolean;
}

// What is wrong with the entries, one sentence each. An entry still Pending needs only to say WHICH area (and describe the open-ended
// one): the rest is the answer's job, and a Pending entry blocks Gate 9 until it has been given.
export function scaleUpAssessmentProblems(entries: readonly ScaleUpAssessment[], ctx: ScaleUpContext): string[] {
  const out: string[] = [];
  const known: readonly string[] = [...SCALE_UP_REVIEW_AREAS, SCALE_UP_AREA_NONE];
  entries.forEach((e, i) => {
    const label = `Assessment ${i + 1}`;
    const area = text(e.area);
    if (area === '') return void out.push(`${label}: choose the affected area`);
    if (!known.includes(area)) return void out.push(`${label}: "${area}" is not one of the areas`);
    if (area === SCALE_UP_OPEN_AREA && text(e.description) === '') {
      out.push(`${label}: this area is open-ended — describe the change`);
    }
    const answer = text(e.answer);
    if (answer !== '' && !(SCALE_UP_RISK_OPTIONS as readonly string[]).includes(answer)) {
      return void out.push(`${label}: the answer must be Yes, No or Pending assessment`);
    }
    if (isScaleUpPending(e)) return;
    if (text(e.rationale) === '') out.push(`${label}: give the reason for the answer`);
    if (text(e.assessor) === '') out.push(`${label}: record who assessed it`);
    if (text(e.assessedDate) === '') out.push(`${label}: record the assessment date`);
    if (isNoAffectedArea(e)) {
      // The reviewed "nothing is affected" record is a No, and nothing else.
      if (answer !== 'No') out.push(`${label}: "no affected area" is answered No`);
    } else {
      const timing = text(e.timing);
      if (timing === '') {
        out.push(`${label}: say whether the change was before or after the formula lock`);
      } else if (!(SCALE_UP_TIMINGS as readonly string[]).includes(timing)) {
        out.push(`${label}: unknown timing`);
      } else if (timing === 'After formula lock') {
        // "Post-lock changes link the assessment to CHG."
        const linked = text(e.linkedChangeId);
        if (linked === '') out.push(`${label}: a change after the formula lock links its Change Control record`);
        else if (!ctx.changeIds.includes(linked)) out.push(`${label}: "${linked}" is not a Change Control record on this project`);
      }
    }
    // "any Yes requires the specified verification."
    if (answer === 'Yes' && text(e.verification) === '') out.push(`${label}: a Yes names the pilot or verification it requires`);
    // "A bare No cannot waive manufacture-readiness evidence": on a new formula a No is a waiver of the separate pilot.
    if (answer === 'No' && ctx.newFormula && ctx.requireWaiver) {
      const missing: string[] = [];
      if (text(e.waiverJustification) === '') missing.push('the justification (equivalence to a qualified process)');
      if (text(e.waiverEvidenceLink) === '') missing.push('the supporting verification');
      for (const r of SCALE_UP_WAIVER_ROLES) if (text(e[r.field]) === '') missing.push(`${r.label}'s confirmation`);
      if (missing.length > 0) out.push(`${label}: on a new formula a No needs ${missing.join(', ')}`);
    }
  });
  return out;
}

export type ScaleUpListState = 'empty' | 'pending' | 'incomplete' | 'complete';

// Where the list stands, for the readiness check and the status tag: an empty list is incomplete (question 7(a)); any Pending entry
// blocks Gate 9; and an entry that is answered but not properly recorded is not an assessment yet.
export function scaleUpListState(project: ProjectData): ScaleUpListState {
  const list = project.scaleUpAssessments ?? [];
  if (list.length === 0) return 'empty';
  if (list.some(isScaleUpPending)) return 'pending';
  const problems = scaleUpAssessmentProblems(list, {
    changeIds: validChangeRefs(project, 'assessment'),
    newFormula: isNewFormula(project),
    requireWaiver: true,
  });
  return problems.length > 0 ? 'incomplete' : 'complete';
}

// The areas ticked: a real area (not the reviewed "none" record) is what triggers an assessment.
export const hasAffectedArea = (project: ProjectData): boolean => (project.scaleUpAssessments ?? []).some((e) => text(e.area) !== '' && !isNoAffectedArea(e));
