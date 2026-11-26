// Round 5 question 26: deviation records — what holds Gate 11 and Gate 12, what an accepted one needs, what is preserved, and the content validity
// warnings. Pure functions on the real rule code. Run: npm run verify:deviations
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import {
  contentValidityWarnings,
  deviationAcceptanceGaps,
  deviationRecordViolations,
  deviationResolved,
  deviationRowGaps,
  deviationsAwaitingReview,
  unresolvedBlockingDeviations,
  unresolvedCriticalDeviations,
} from '../src/utils/deviations';
import { gateBlockers } from '../src/utils/gateProgress';
import type { NextAction, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const dev = (over: RegisterRow = {}): RegisterRow => ({
  deviationId: 'DEV-001', source: 'Published outside the workflow', discoveryDate: '2026-11-01', incidentDate: '2026-10-20', reporter: 'R', sku: 'S', market: 'Vietnam', channel: 'Website',
  contentDescription: 'A banner', evidenceLink: 'https://x', approvalExpected: 'Approved for Release', approvalActual: 'None', scopeOfUse: '2 weeks', issueType: 'Claims',
  severity: 'Medium', impactAssessment: 'Low reach', owner: 'O', dueDate: '2026-12-01', disposition: 'Open', ...over,
});
const action = (over: Partial<NextAction> = {}): NextAction => ({ id: 'A1', gateId: 'SG11', description: 'd', owner: 'O', dueDate: '2026-12-01', status: 'Open', priority: 'Medium', completionCriteria: 'c', escalationTrigger: 'e', ...over });
const project = (rows: RegisterRow[] = [], actions: NextAction[] = []): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  p.registers = { ...p.registers, deviationRecords: rows };
  p.nextActions = actions;
  return p;
};
const blocksGate11 = (p: ProjectData, market: string) => gateBlockers(p, 'SG11', 'Proceed with Conditions', market).some((b) => b.id === 'sg11-deviations');
const blocksGate12 = (p: ProjectData, market: string, id: string) => gateBlockers(p, 'SG12', 'Proceed with Conditions', market).some((b) => b.id === id);

// the record's content
t('a complete open deviation has no gap', deviationRowGaps(dev()).length === 0);
t('every field the answer lists is asked for', deviationRowGaps({ deviationId: 'DEV-002' }).length >= 12);
t('a High or Critical one also needs its root cause', deviationRowGaps(dev({ severity: 'High' })).length === 1 && deviationRowGaps(dev({ severity: 'High', rootCause: 'x' })).length === 0);
t('closing it needs the verification, the decision and the date', deviationRowGaps(dev({ disposition: 'Closed' })).length === 3);

// what resolves one
t('an open deviation is unresolved', !deviationResolved(dev(), project()));
t('a closed one, with its closure recorded, is resolved', deviationResolved(dev({ disposition: 'Closed', verification: 'v', closureDecision: 'd', closureDate: '2026-11-10' }), project()));
t('"Closed" without the closure is not', !deviationResolved(dev({ disposition: 'Closed' }), project()));
{
  const accepted = dev({ disposition: 'Accepted under controlled action', acceptedActionId: 'A1', acceptedBy: 'Q' });
  t('one accepted under a live controlled action, with an accepter, is resolved', deviationResolved(accepted, project([], [action()])));
  t('...not without the action, a Cancelled one, or an accepter', !deviationResolved(accepted, project()) && !deviationResolved(accepted, project([], [action({ status: 'Cancelled' })])) && !deviationResolved({ ...accepted, acceptedBy: '' }, project([], [action()])));
  t('...the carrying action must itself be a controlled one', deviationAcceptanceGaps(accepted, project([], [action({ completionCriteria: '' })])).length === 1);
  t('a Critical deviation cannot be carried under an accepted action', !deviationResolved({ ...accepted, severity: 'Critical' }, project([], [action()])));
}

// Gate 11: only the four kinds, only the market, only while unresolved
{
  const p = project([dev()]);
  t('an unresolved claims deviation holds Gate 11 for its market', blocksGate11(p, 'Vietnam') && unresolvedBlockingDeviations(p, 'Vietnam').length === 1);
  t('...and not for another market', !blocksGate11(p, 'Australia'));
  t('one that names no market holds every market of the project', blocksGate11(project([dev({ market: '' })]), 'Australia'));
  t('a deviation of kind "Other" holds nothing', !blocksGate11(project([dev({ issueType: 'Other' })]), 'Vietnam'));
  t('safety, compliance and version mismatch hold it too', ['Safety', 'Compliance', 'Version mismatch'].every((issueType) => blocksGate11(project([dev({ issueType })]), 'Vietnam')));
  t('once closed it no longer holds', !blocksGate11(project([dev({ disposition: 'Closed', verification: 'v', closureDecision: 'd', closureDate: '2026-11-10' })]), 'Vietnam'));
  t('a non-critical one carried by an accepted controlled action does not hold it', !blocksGate11(project([dev({ disposition: 'Accepted under controlled action', acceptedActionId: 'A1', acceptedBy: 'Q' })], [action()]), 'Vietnam'));
}

// Gate 12: every deviation reviewed; Critical unresolved holds the closure
{
  t('an Open deviation, or one with no reviewer, is not reviewed', deviationsAwaitingReview(project([dev()]), 'Vietnam').length === 1 && deviationsAwaitingReview(project([dev({ disposition: 'Contained' })]), 'Vietnam').length === 1);
  t('with a reviewer and a disposition it is', deviationsAwaitingReview(project([dev({ disposition: 'Contained', reviewer: 'V' })]), 'Vietnam').length === 0);
  t('an unreviewed deviation holds the Gate 12 review of its market', blocksGate12(project([dev()]), 'Vietnam', 'sg12-deviations-reviewed') && !blocksGate12(project([dev()]), 'Australia', 'sg12-deviations-reviewed'));
  const critical = dev({ severity: 'Critical', rootCause: 'x', disposition: 'Contained', reviewer: 'V' });
  t('a Critical deviation not closed holds the closure of its market, even under Proceed with Conditions', blocksGate12(project([critical]), 'Vietnam', 'sg12-critical-deviation') && unresolvedCriticalDeviations(project([critical]), 'Vietnam').length === 1);
  t('an accepted action does not stand for a Critical one; closing it does', unresolvedCriticalDeviations(project([{ ...critical, disposition: 'Accepted under controlled action', acceptedActionId: 'A1', acceptedBy: 'Q' }], [action()]), 'Vietnam').length === 1 && unresolvedCriticalDeviations(project([{ ...critical, disposition: 'Closed', verification: 'v', closureDecision: 'd', closureDate: '2026-11-10' }]), 'Vietnam').length === 0);
  t('nothing recorded is a real answer: the three items are satisfied', !blocksGate11(project(), 'Vietnam') && !blocksGate12(project(), 'Vietnam', 'sg12-deviations-reviewed') && !blocksGate12(project(), 'Vietnam', 'sg12-critical-deviation'));
}

// preserved evidence
{
  const committed = [dev()];
  t('the original incident cannot change once saved', deviationRecordViolations(committed, [dev({ evidenceLink: 'https://other' })]).length === 1);
  t('what is decided afterwards can', deviationRecordViolations(committed, [dev({ severity: 'High', containment: 'taken down', disposition: 'Contained' })]).length === 0);
  t('a saved deviation cannot be removed', deviationRecordViolations(committed, []).length === 1);
  t('a new one can be added', deviationRecordViolations(committed, [dev(), dev({ deviationId: '' })]).length === 0);
}

// (d) content validity warnings
{
  const pi = (over: RegisterRow = {}): RegisterRow => ({ recordId: 'PI-001', workflowState: 'Released', contentOwner: 'Olga', market: 'Vietnam', expiryReviewDate: '2026-11-01', ...over });
  const withPi = (rows: RegisterRow[], claims: RegisterRow[] = []): ProjectData => {
    const p = project();
    p.registers = { ...p.registers, publishedInfoApproval: rows, claimEvidenceTraceability: claims };
    return p;
  };
  const w = contentValidityWarnings(withPi([pi()]), '2026-11-26');
  t('released content past its review date warns its owner, without calling it unlawful', w.length === 1 && w[0].kind === 'Review date due' && w[0].owner === 'Olga' && !w[0].promptContainment && !w[0].dispositioned);
  t('...not before the date, nor if it was never released', contentValidityWarnings(withPi([pi({ expiryReviewDate: '2026-12-31' })]), '2026-11-26').length === 0 && contentValidityWarnings(withPi([pi({ workflowState: 'Draft' })]), '2026-11-26').length === 0);
  t('a review recorded on or after the due date, with what was decided, closes the warning', contentValidityWarnings(withPi([pi({ validityReviewedDate: '2026-11-20', validityDisposition: 'Re-reviewed — still valid' })]), '2026-11-26')[0].dispositioned);
  t('a claim that is no longer Supported needs prompt containment', (() => {
    const x = contentValidityWarnings(withPi([pi({ claimId: 'CLM-1', expiryReviewDate: '' })], [{ claimId: 'CLM-1', status: 'Pending' }]), '2026-11-26');
    return x.length === 1 && x[0].kind === 'Claim no longer supported' && x[0].promptContainment;
  })());
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
