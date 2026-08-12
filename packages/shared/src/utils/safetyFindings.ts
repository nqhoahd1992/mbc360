// Rule E1 (SME Round 3), Gate 7: "Please add a distinct safety-finding control
// rather than relying solely on the Final Safety Sign-off… Gate 7 cannot pass
// while any critical safety finding is open."
//
// Until 2026-08-12 `sg07-no-critical` shared `sg07-final-safety`'s check, so a
// green tick reading "no unresolved critical safety finding" only ever meant "the
// ten Final Safety Sign-off questions are Completed". E1 rejects exactly that
// reading, in its first sentence.
import type { ProjectData, RegisterRow } from '../types';
import { SAFETY_FINDING_STATUS_OPEN, SAFETY_FINDING_YES } from '../config/registers';

export const SAFETY_FINDINGS_REGISTER = 'criticalSafetyFindings';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function safetyFindingRows(project: ProjectData): RegisterRow[] {
  return project.registers[SAFETY_FINDINGS_REGISTER] ?? [];
}

// Three states block Gate 7, and only the first is E1's own words.
//
//   1. a row marked critical and still Open — E1 verbatim;
//   2. a row where nobody has said yet WHETHER it is critical. Not E1's words: it
//      says what an open critical finding does, not what an unjudged row does.
//      Treating "no judgement yet" as passable would let a finding be parked
//      unassessed and the gate close over it, which is the opposite of a control
//      [ASSUMPTION: R4-Q30];
//   3. a row marked critical and Closed with no reviewer conclusion or no
//      evidence. Also ours — borrowed from D3, where the team DID specify that
//      the analogous verdict "may be closed after reviewer rationale and evidence
//      are recorded" [ASSUMPTION: R4-Q30].
//
// A row marked NOT critical blocks nothing, whatever its status: E1's rule is
// about critical findings.
export function openCriticalSafetyFindings(project: ProjectData): RegisterRow[] {
  return safetyFindingRows(project).filter((row) => {
    const flag = text(row.criticalFinding);
    if (flag === '') return true;
    if (flag !== SAFETY_FINDING_YES) return false;
    if (text(row.findingStatus) === SAFETY_FINDING_STATUS_OPEN || text(row.findingStatus) === '') return true;
    return text(row.safetyReviewerConclusion) === '' || text(row.evidenceLink) === '';
  });
}

export function safetyFindingLabel(row: RegisterRow): string {
  return text(row.findingDescription).slice(0, 60) || '(no description)';
}
