// Round 5 question 32: a change to a controlled formula is approved BEFORE its new version is created; evaluation samples under a submitted change are
// unapproved trials; a change recorded after it happened keeps its real date and approval gap and holds readiness until it is reviewed.
// Pure functions on the real rule code. Run: npm run verify:change-order
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { changesHoldingGate } from '../src/utils/changeTriage';
import { formulaChangeRequirement } from '../src/utils/formulaBaseline';
import { gateBlockers } from '../src/utils/gateProgress';
import {
  changesAvailableForNewVersion,
  deriveIterationRows,
  formulaIsControlled,
  isChangeApprovedToImplement,
  iterationTrialProblems,
  retrospectiveAwaitsReview,
  retrospectiveProblems,
  retrospectiveReviewProblems,
  versionChangeProblems,
} from '../src/utils/changeOrder';
import type { ChangeRecord, GateRecord, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const base = (): ProjectData => createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers: {} } as never);
const passed5: GateRecord = { gateId: 'SG05', status: 'Complete', decision: 'Proceed' };
const controlled = (over: Partial<ProjectData> = {}): ProjectData => {
  const p = base();
  p.gates = p.gates.map((g) => (g.gateId === 'SG05' ? passed5 : g));
  return { ...p, ...over };
};
const chg = (over: Partial<ChangeRecord> = {}): ChangeRecord => ({
  changeId: 'CHG-001', projectId: 'T', trigger: 'Ingredient added or removed', triggerId: 'formula-ingredient', productSku: 'T', affectedArea: 'Formula / ingredient',
  riskLevel: 'High', communicationRequired: false, status: 'Approved - Implementation Pending', owner: 'Sam', impactTriage: 'Material impact', ...over,
});
const withChanges = (p: ProjectData, ...c: ChangeRecord[]): ProjectData => ({ ...p, changes: c });

// ---- which formulas need the change first
t('a formula never approved is not controlled (its Major version raises its own change, as before)', !formulaIsControlled(base()));
t('a formula whose Gate 05 passed is controlled', formulaIsControlled(controlled()));

// ---- the precondition for a new version
{
  const p = controlled();
  t('a controlled formula\'s new version without a change record is refused, saying what to do', versionChangeProblems(p, undefined).length === 1 && /approved master change record/.test(versionChangeProblems(p, '')[0]));
  t('a change that does not exist on the project is refused', versionChangeProblems(p, 'CHG-404').length === 1);
  t('a change only Under Review is refused: it must be approved to implement first', versionChangeProblems(withChanges(p, chg({ status: 'Under Review', impactTriage: undefined })), 'CHG-001').length > 0);
  t('a change approved to implement is accepted', versionChangeProblems(withChanges(p, chg()), 'CHG-001').length === 0);
  t('...and so is one already In Implementation', versionChangeProblems(withChanges(p, chg({ status: 'In Implementation' })), 'CHG-001').length === 0);
  t('a change already implemented (Completed) cannot start another version', versionChangeProblems(withChanges(p, chg({ status: 'Completed' })), 'CHG-001').length > 0);
  t('a change that is not about the formula is refused', versionChangeProblems(withChanges(p, chg({ affectedArea: 'Artwork / label', triggerId: undefined })), 'CHG-001').length > 0);
  t('a change whose technical impact has not been assessed by the accountable function is refused (NP\'s approval does not stand in)',
    versionChangeProblems(withChanges(p, chg({ impactAreas: ['Safety'] })), 'CHG-001').some((m) => /assessment/.test(m)));
  t('a change that already carries a version cannot carry another',
    versionChangeProblems({ ...withChanges(p, chg()), formulaVersionHistory: [{ version: 'F1.1', previousVersion: 'F1.0', date: '2026-01-02', changeType: 'Major', reason: 'x', initiatedBy: 'a', linkedChangeId: 'CHG-001' } as never] }, 'CHG-001').some((m) => /already carries/.test(m)));
  t('an FC alias of the change resolves to it', versionChangeProblems(withChanges(p, chg({ aliasIds: ['FC-001'] })), 'FC-001').length === 0);
  t('the picker offers only changes that qualify', changesAvailableForNewVersion(withChanges(p, chg(), chg({ changeId: 'CHG-002', status: 'Draft', impactTriage: undefined }))).map((c) => c.changeId).join() === 'CHG-001');
}

// ---- editing the controlled formula, and evaluation samples
{
  const p = controlled();
  t('a submitted change does not permit editing the controlled formula; the message points to unapproved trials', /unapproved trials/.test(formulaChangeRequirement(withChanges(p, chg({ status: 'Submitted', impactTriage: undefined }))) ?? ''));
  t('an approved one does', formulaChangeRequirement(withChanges(p, chg())) === undefined);
  const rows: RegisterRow[] = [{ iterationNo: '1', linkedChangeId: 'CHG-002', decision: 'Iterate again' }, { iterationNo: '2', linkedChangeId: 'CHG-001', decision: 'Adopt this version' }, { iterationNo: '3', decision: 'Adopt this version' }];
  const project = withChanges(p, chg(), chg({ changeId: 'CHG-002', status: 'Submitted', impactTriage: undefined }));
  const marked = deriveIterationRows(project, rows);
  t('an iteration under a submitted change is marked as an unapproved trial, one under an approved change or none is not', /Unapproved trial/.test(String(marked[0].trialMark)) && marked[1].trialMark === '' && marked[2].trialMark === '');
  t('an unapproved trial cannot be adopted', iterationTrialProblems(project, [{ ...rows[0], decision: 'Adopt this version' }]).length === 1);
  t('...nor set to Adopted', iterationTrialProblems(project, [{ ...rows[0], status: 'Adopted' }]).length === 1);
  t('a trial that is not adopted is fine, and so is adopting under an approved change', iterationTrialProblems(project, [rows[0], rows[1], rows[2]]).length === 0);
  t('isChangeApprovedToImplement needs the triage as well as the status', isChangeApprovedToImplement(chg()) && !isChangeApprovedToImplement(chg({ impactTriage: undefined })));
}

// ---- retrospective changes
{
  const today = '2026-11-26';
  const retro = (over: Partial<ChangeRecord> = {}) => chg({ retrospective: true, actualImplementationDate: '2026-10-01', approvalGap: 'Implemented on the line before approval; NP approved on 2026-10-20', status: 'Completed', impactTriage: undefined, ...over });
  t('a retrospective record needs its real implementation date and its approval gap', retrospectiveProblems(retro({ actualImplementationDate: '', approvalGap: '' }), today).length === 2);
  t('the real date cannot be in the future', retrospectiveProblems(retro({ actualImplementationDate: '2027-01-01' }), today).length === 1);
  t('a complete one is accepted; an ordinary record needs nothing', retrospectiveProblems(retro(), today).length === 0 && retrospectiveProblems(chg(), today).length === 0);
  const p = withChanges(base(), retro());
  t('it awaits its review although its status says Completed', retrospectiveAwaitsReview(retro()));
  t('...and holds a gate that has not passed until it is reviewed', changesHoldingGate(p, 'SG05').length === 1 && gateBlockers(p, 'SG05').some((b) => b.id === 'change-hold'));
  t('once reviewed it holds nothing more', changesHoldingGate(withChanges(base(), retro({ impactTriage: 'No material impact' })), 'SG05').length === 0);
  t('the review has to say whether a deviation is needed', retrospectiveReviewProblems(p, retro(), 'No material impact', '').length === 1 && retrospectiveReviewProblems(p, retro(), 'No material impact', 'No deviation: emergency instruction').length === 0);
  t('a Material outcome also needs a deviation record that names the change', retrospectiveReviewProblems(p, retro(), 'Material impact', 'DEV-001 raised').length === 1);
  const withDeviation = { ...p, registers: { ...p.registers, deviationRecords: [{ deviationId: 'DEV-001', changeId: 'CHG-001' }] } };
  t('...and is met once one does', retrospectiveReviewProblems(withDeviation, retro(), 'Material impact', 'DEV-001 raised').length === 0);
  t('an ordinary change needs none of this', retrospectiveReviewProblems(p, chg(), 'Material impact', '').length === 0);
}

if (bad > 0) {
  console.log(`\n${bad} case(s) failed`);
  process.exit(1);
}
console.log('\nAll change order cases passed');
