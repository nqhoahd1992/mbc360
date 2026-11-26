// Round 5 question 32 (SME answer, 2026-11-05): "For a change to a controlled/locked or released formula, yes: approve the linked master CHG before creating the
// controlled replacement formula version for implementation. Evaluation samples may be developed under the submitted CHG as clearly unapproved trials; they
// cannot overwrite or release the controlled version. Routine pre-lock development iterations use the iteration log; retain the Major-version CHG rule in
// Question 11. NP's required commercial approval and qualified technical approvals remain part of the controlled-change route.
// Record retrospective changes promptly and apply the same gate and release controls. Assess its actual impact, raise a deviation where necessary, and
// hold/reopen affected current readiness until it is reviewed. A late record must preserve the real implementation date and approval gap."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q40]`): a formula is "controlled" once it has been approved (Gate 05 passed, now or
// before a Backtrack — `formulaWasApproved`); "approved" for a version means the master change is approved to implement and has not been implemented yet; the
// trials are the iteration-log rows that name a change that is not approved; a retrospective record's reviewer states the deviation question in words, and a
// Material outcome needs a deviation record that names the change.
import type { ChangeRecord, ProjectData, RegisterRow } from '../types';
import { isChangeOpen } from '../config/changeTriggers';
import { areasAwaitingAssessment } from './changeAreaAssessments';
import { changeLinkProblem, resolveChangeRef } from './changeLinks';
import { isFormulationChange } from './changeViews';
import { formulaWasApproved } from './formulaBaseline';
import { TRIAGE_MATERIAL, isTriageRecorded } from './changeTriage';
import { VERSION_READY_STATUSES } from './changeOrderStatuses';

export { VERSION_READY_STATUSES };

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());

// A change that has been approved to implement and is being implemented — not one that is only submitted, and not one already implemented (Completed or
// waiting for verification, which a further version cannot start from).
export const isChangeApprovedToImplement = (c: ChangeRecord): boolean => VERSION_READY_STATUSES.includes(c.status) && isTriageRecorded(c);

// The formula is a controlled baseline: it has been approved once, whichever gate the project is on now.
export const formulaIsControlled = (project: ProjectData): boolean => formulaWasApproved(project);

// Why `ref` cannot be the change a new formula version implements, or undefined when it can. Read at the proposal and again at the confirmation.
export function versionChangeProblems(project: ProjectData, ref: string | undefined): string[] {
  const wanted = text(ref);
  if (wanted === '') {
    return [
      'a new version of an approved formula needs its approved master change record first: raise the change on Change Control, have its impact assessed and have it approved to implement, then propose the version against it',
    ];
  }
  const change = resolveChangeRef(project.changes.filter((c) => !c.projectId || c.projectId === project.identity.id), wanted);
  if (!change) return [`${wanted} is not a change record of this project`];
  const out: string[] = [];
  const link = changeLinkProblem(change, 'implementation');
  if (link) out.push(`${change.changeId}: ${link}`);
  if (!isFormulationChange(change)) out.push(`${change.changeId} is not a formulation change`);
  if (!VERSION_READY_STATUSES.includes(change.status) && !link) {
    out.push(`${change.changeId} is ${change.status}: the new version is created while the change is Approved – Implementation Pending or In Implementation`);
  }
  const waiting = areasAwaitingAssessment(change);
  if (waiting.length > 0) out.push(`${change.changeId}: ${waiting.join(', ')} still needs its assessment by the accountable function (NP's commercial approval does not stand in for it)`);
  const carried =
    project.formulaVersionHistory.find((v) => v.linkedChangeId === change.changeId)?.version ??
    (project.currentFormulaVersionRecord?.linkedChangeId === change.changeId ? project.formulaVersion : undefined);
  if (carried) out.push(`${change.changeId} already carries formula version ${carried}`);
  return out;
}

// Which master changes could carry a new version right now (for a picker).
export function changesAvailableForNewVersion(project: ProjectData): ChangeRecord[] {
  return project.changes
    .filter((c) => (!c.projectId || c.projectId === project.identity.id) && versionChangeProblems(project, c.changeId).length === 0)
    .sort((a, b) => a.changeId.localeCompare(b.changeId));
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Trials: iteration-log rows that name a change record that is not approved yet.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export const ITERATIONS_REGISTER = 'productDevelopmentIterations';
export const TRIAL_MARK = 'Unapproved trial — the change record is not approved';

export function trialChangeOf(project: ProjectData, row: RegisterRow): ChangeRecord | undefined {
  const ref = text(row.linkedChangeId);
  if (ref === '') return undefined;
  const change = resolveChangeRef(project.changes.filter((c) => !c.projectId || c.projectId === project.identity.id), ref);
  if (!change || !isChangeOpen(change.status) || isChangeApprovedToImplement(change)) return undefined;
  return change;
}

// What the row says about itself beside what a person typed.
export function deriveIterationRows(project: ProjectData, rows: RegisterRow[]): RegisterRow[] {
  return rows.map((row) => {
    const change = trialChangeOf(project, row);
    return { ...row, trialMark: change ? `${TRIAL_MARK} (${change.changeId}, ${change.status})` : '' };
  });
}

// An evaluation sample made under a submitted change can be recorded, kept and compared, but it cannot become the controlled formula: it cannot be
// adopted while the change is not approved.
export function iterationTrialProblems(project: ProjectData, rows: RegisterRow[]): string[] {
  const out: string[] = [];
  rows.forEach((row, i) => {
    const change = trialChangeOf(project, row);
    if (!change) return;
    if (text(row.decision) === 'Adopt this version' || text(row.status) === 'Adopted') {
      out.push(`row ${i + 1}${text(row.iterationNo) ? ` (iteration ${text(row.iterationNo)})` : ''}: an unapproved trial under ${change.changeId} (${change.status}) cannot be adopted — the controlled formula changes only once that change is approved`);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Retrospective changes: it happened before it was recorded.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export function retrospectiveProblems(change: ChangeRecord, today: string): string[] {
  if (!change.retrospective) return [];
  const out: string[] = [];
  const date = text(change.actualImplementationDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) out.push('the real implementation date');
  else if (date > today) out.push('a real implementation date that is not in the future');
  if (text(change.approvalGap) === '') out.push('the approval gap: what was missing when it was implemented, and who approved it and when');
  return out;
}

// The fields a retrospective record preserves exactly as first recorded.
export const RETROSPECTIVE_PRESERVED_FIELDS = ['retrospective', 'actualImplementationDate', 'approvalGap'] as const;

// A retrospective change is not settled until it has been reviewed, whatever its status says.
export const retrospectiveAwaitsReview = (c: ChangeRecord): boolean => !!c.retrospective && !isTriageRecorded(c);

// "Raise a deviation where necessary": the reviewer says in words whether one is needed (and which); a Material outcome needs a deviation record naming the change.
export function deviationRowsFor(project: ProjectData, change: ChangeRecord): RegisterRow[] {
  return (project.registers['deviationRecords'] ?? []).filter((r) => {
    const ref = text(r.changeId);
    return ref !== '' && resolveChangeRef([change], ref) !== undefined;
  });
}
export function retrospectiveReviewProblems(project: ProjectData, change: ChangeRecord, outcome: string, review: string): string[] {
  if (!change.retrospective) return [];
  const out: string[] = [];
  if (text(review) === '') out.push('whether a deviation is needed, and which one — or why not');
  if (outcome === TRIAGE_MATERIAL && deviationRowsFor(project, change).length === 0) {
    out.push(`a deviation record that names ${change.changeId} (Deviation Records → Change Control): a change that invalidates decisions was implemented without its approval`);
  }
  return out;
}
