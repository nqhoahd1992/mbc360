// Round 5 question 25: updating the PIF of a market on sale — a draft revision under a Change Control record that leaves the approval in force, and the
// suspension of an approval. Pure functions on the real rule code. Run: npm run verify:pif-revisions
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { isApprovalSuspended, openPifRevision, pifRevisionNextStatuses, pifRevisionOpenProblems } from '../src/utils/pifRevisions';
import type { MarketTrack, PifRevision, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const track = (over: Partial<MarketTrack> = {}): MarketTrack => ({ market: 'Vietnam', formulaVersion: 'F1.0', pifStatus: 'Approved', regulatoryStatus: 'Approved', claimsApproval: 'Approved', launchApproval: 'Approved', ...over });
const rev = (over: Partial<PifRevision> = {}): PifRevision => ({ id: 'R1', market: 'Vietnam', formulaVersion: 'F1.0', changeId: 'CHG-001', reason: 'r', status: 'Draft', ...over });
const project = (revisions: PifRevision[] = []): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers: {} } as never);
  p.pifRevisions = revisions;
  return p;
};
const ok = { changeId: 'CHG-001', reason: 'update the PIF' };

t('a revision may be opened against an approved PIF, under a change record, with a reason', pifRevisionOpenProblems(project(), track(), ok).length === 0);
t('...not against a PIF that is not approved yet (its status is set directly until then)', pifRevisionOpenProblems(project(), track({ pifStatus: 'In Progress' }), ok).length === 1);
t('...it needs the change record and the reason', pifRevisionOpenProblems(project(), track(), { changeId: '', reason: '' }).length === 2);
t('...and not while another revision of the same PIF is in progress', pifRevisionOpenProblems(project([rev()]), track(), ok).length === 1);
t('...an approved or withdrawn revision no longer counts as in progress', pifRevisionOpenProblems(project([rev({ status: 'Approved' }), rev({ id: 'R2', status: 'Withdrawn' })]), track(), ok).length === 0);
t('a revision of another market or version does not hold this one', openPifRevision(project([rev({ market: 'Australia' }), rev({ formulaVersion: 'F2.0' })]), 'Vietnam', 'F1.0') === undefined);
t('the market must have a track', pifRevisionOpenProblems(project(), undefined, ok).length === 1);

t('a draft goes to review or is withdrawn, never straight to Approved', pifRevisionNextStatuses('Draft').join() === 'Under Review,Withdrawn');
t('a revision under review is approved, sent back or withdrawn', pifRevisionNextStatuses('Under Review').join() === 'Approved,Draft,Withdrawn');
t('an approved or withdrawn revision goes nowhere', pifRevisionNextStatuses('Approved').length === 0 && pifRevisionNextStatuses('Withdrawn').length === 0);

t('an approval Regulatory or Quality suspended reads as suspended while it is not Approved', isApprovalSuspended({ approvalSuspendedAt: '2026-11-26', launchApproval: 'Blocked' }));
t('...and not once it is Approved again, nor if it never was suspended', !isApprovalSuspended({ approvalSuspendedAt: '2026-11-26', launchApproval: 'Approved' }) && !isApprovalSuspended({ launchApproval: 'Blocked' }));

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
