// Round 5 question 21: which costing results let a Gate 5 decision go ahead on a commercially dependent project. Pure functions on the real config and
// rule code. Run: npm run verify:commercial-feasibility
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { COSTING_FEASIBILITY_STATUSES } from '../src/config/gates';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { costingCarriedGaps, costingNotApplicableGaps, costingPlainProceedOk } from '../src/utils/commercialFeasibility';
import { gateBlockers } from '../src/utils/gateProgress';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const action = (over: Record<string, unknown> = {}) => ({
  id: 'NA-1', gateId: 'SG05', description: 'Re-quote the filling line', completionCriteria: 'Quote within target', owner: 'O', dueDate: '2026-12-01',
  escalationTrigger: 'A week late', priority: 'High', status: 'Open', ...over,
});
const change = (over: Record<string, unknown> = {}) => ({ changeId: 'CHG-1', projectId: 'T', status: 'Approved - Implementation Pending', owner: 'Q', impactAreas: ['Formula'], impactTriage: 'Material impact', ...over });

// A project whose "Target cost or commercial boundary" requirement is a Must (so the commercial dependence applies).
const project = (costing: Record<string, unknown>, extra: Partial<ProjectData> = {}): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers: {} } as never);
  p.requirements = { ...p.requirements, projectRequirements: [{ requirement: 'Target cost or commercial boundary', priority: 'Must', status: 'Not Started' } as never] };
  p.costing = { ...p.costing, ...costing } as never;
  return { ...p, ...extra };
};
const ids = (list: { id: string }[]) => list.map((b) => b.id);
const plain = (p: ProjectData) => ids(gateBlockers(p, 'SG05', 'Proceed'));
const conditional = (p: ProjectData) => ids(gateBlockers(p, 'SG05', 'Proceed with Conditions'));

t('the two items exist at Gate 5, the second NOT cleared by Proceed with Conditions',
  GATE_READINESS.SG05.some((r) => r.id === 'sg05-costing-must' && r.clearedByConditions === true) && GATE_READINESS.SG05.some((r) => r.id === 'sg05-costing-must-carried' && !r.clearedByConditions));
t('the status list is the SME\'s own', COSTING_FEASIBILITY_STATUSES.join(' | ') === 'Not Started | In Progress | Commercially Feasible | Feasible with Conditions | Not Feasible | N/A — rationale required');

// --- plain Proceed -----------------------------------------------------------------------------------------------------------------------------------
t('only Commercially Feasible permits a plain Proceed', costingPlainProceedOk(project({ feasibilityStatus: 'Commercially Feasible' })) && ['Feasible with Conditions', 'In Progress', 'Not Feasible', 'Not Started', ''].every((s) => !costingPlainProceedOk(project({ feasibilityStatus: s }))));
t('...neither Feasible with Conditions nor In Progress does, whatever is recorded beside it', plain(project({ feasibilityStatus: 'Feasible with Conditions', commercialDecisionBy: 'CA', conditionActionId: 'NA-1' }, { nextActions: [action()] as never })).includes('sg05-costing-must')
  && plain(project({ feasibilityStatus: 'In Progress', riskBound: 'up to 3% of margin' })).includes('sg05-costing-must'));
t('a Commercially Feasible costing clears both items under a plain Proceed', !plain(project({ feasibilityStatus: 'Commercially Feasible' })).some((i) => i.startsWith('sg05-costing-must')));

// --- Feasible with Conditions -----------------------------------------------------------------------------------------------------------------------
{
  const fwc = (over: Record<string, unknown> = {}, actions: unknown[] = [action()]) => project({ feasibilityStatus: 'Feasible with Conditions', commercialDecisionBy: 'CA', conditionActionId: 'NA-1', ...over }, { nextActions: actions as never });
  t('Feasible with Conditions can be carried with the commercial acceptance and a controlled tracked action', costingCarriedGaps(fwc()).length === 0 && !conditional(fwc()).some((i) => i.startsWith('sg05-costing-must')), JSON.stringify(costingCarriedGaps(fwc())));
  t('...not without the commercial acceptance', costingCarriedGaps(fwc({ commercialDecisionBy: '' })).length === 1 && conditional(fwc({ commercialDecisionBy: '' })).includes('sg05-costing-must-carried'));
  t('...not without a tracked action', costingCarriedGaps(fwc({ conditionActionId: '' })).length === 1);
  t('...not when the action is not controlled, or was cancelled', costingCarriedGaps(fwc({}, [action({ completionCriteria: '' })])).length === 1 && costingCarriedGaps(fwc({}, [action({ status: 'Cancelled' })])).length === 1);
}

// --- In Progress ------------------------------------------------------------------------------------------------------------------------------------
t('In Progress is carried only when the outstanding risk is bounded, otherwise it is Hold', costingCarriedGaps(project({ feasibilityStatus: 'In Progress', riskBound: 'up to 3% of margin' })).length === 0
  && costingCarriedGaps(project({ feasibilityStatus: 'In Progress' })).length === 1 && conditional(project({ feasibilityStatus: 'In Progress' })).includes('sg05-costing-must-carried'));

// --- Not Feasible -----------------------------------------------------------------------------------------------------------------------------------
{
  const nf = (over: Record<string, unknown> = {}, changes: unknown[] = [change()]) => project({ feasibilityStatus: 'Not Feasible', commercialDecisionBy: 'CA', revisionChangeId: 'CHG-1', ...over }, { changes: changes as never });
  t('Not Feasible with a conditional signature alone stays blocked: Proceed with Conditions cannot declare a failed Must requirement met', conditional(project({ feasibilityStatus: 'Not Feasible' })).includes('sg05-costing-must-carried'));
  t('...it passes only with an authorised revision: the Commercial Approver and an approved Change Control record', costingCarriedGaps(nf()).length === 0, JSON.stringify(costingCarriedGaps(nf())));
  t('...not with the authorisation but no change, or a change not yet approved to implement', costingCarriedGaps(nf({ revisionChangeId: '' })).length >= 1 && costingCarriedGaps(nf({}, [change({ status: 'Under Review' })])).length >= 1);
}

// --- N/A and the unrecorded ----------------------------------------------------------------------------------------------------------------------------
{
  const na = (over: Record<string, unknown> = {}) => project({ feasibilityStatus: 'N/A — rationale required', ...over });
  t('N/A needs a justified scope decision: the rationale AND the Commercial Approver, not missing costing', costingNotApplicableGaps(na()).length === 2 && costingNotApplicableGaps(na({ assumptions: 'Out of scope', commercialDecisionBy: 'CA' })).length === 0);
  t('...a justified N/A permits a plain Proceed', costingPlainProceedOk(na({ assumptions: 'Out of scope', commercialDecisionBy: 'CA' })) && !costingPlainProceedOk(na({ assumptions: 'Out of scope' })));
  t('a costing never started is no answer, plain or carried', costingCarriedGaps(project({ feasibilityStatus: 'Not Started' })).length === 1 && costingCarriedGaps(project({})).length === 1);
}

// --- the items only apply when the commercial requirement is a Must ---------------------------------------------------------------------------------
{
  const p = project({ feasibilityStatus: 'Not Feasible' });
  p.requirements = { ...p.requirements, projectRequirements: [{ requirement: 'Target cost or commercial boundary', priority: 'Should', status: 'Not Started' } as never] };
  t('on a project where the commercial requirement is not a Must neither item blocks', !plain(p).some((i) => i.startsWith('sg05-costing-must')));
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
