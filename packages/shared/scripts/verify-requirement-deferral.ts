// Round 5 question 15: a deferred Should / Could requirement is carried by a tracked Next Action, a Must is never deferred, and once the requirements
// are approved a changed requirement needs an approved scope change. Pure functions over a hand-built project on the real rule engine.
// Run: npm run verify:requirement-deferral
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateBlockers, gateReadinessChecklist, hardGateBlockers } from '../src/utils/gateProgress';
import {
  deferralProblem,
  openDeferrals,
  requirementChangeKinds,
  requirementsWereApproved,
  scopeChangeProblem,
  untrackedDeferrals,
} from '../src/utils/requirementDeferral';
import type { ChangeRecord, NextAction, ProjectData, RequirementItem } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const SECTION = 'projectRequirements';
const base = (): ProjectData => createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const row = (p: ProjectData, requirement: string): RequirementItem => (p.requirements[SECTION] ?? []).find((r) => r.requirement === requirement)!;
const action = (over: Partial<NextAction> = {}): NextAction =>
  ({
    id: 'na-1', gateId: 'SG02', description: 'Finish the sensory brief', owner: 'Anna', dueDate: '2026-12-01', priority: 'Medium', status: 'Open',
    completionCriteria: 'Brief signed by marketing', escalationTrigger: 'Two weeks overdue', ...over,
  }) as NextAction;
const item = (id: string) => (p: ProjectData) => gateReadinessChecklist(p, 'SG02').find((i) => i.id === id);
const tracked = item('sg02-requirements-deferral-tracked');
const deferred = item('sg02-requirements-deferred');

// --- what is a deferral ---------------------------------------------------------------------------------------------------------------
{
  const p = base();
  t('nothing is deferred on a fresh project', openDeferrals(p).length === 0);
  row(p, 'Sensory requirements').priority = 'Should';
  t('a Should that is not Complete is a deferral', openDeferrals(p).length === 1);
  row(p, 'Sensory requirements').status = 'Complete' as never;
  t('...a Complete one is not', openDeferrals(p).length === 0);
  row(p, 'Sensory requirements').status = 'N/A' as never;
  t('...nor one that does not apply', openDeferrals(p).length === 0);
  const q = base();
  row(q, 'Sensory requirements').priority = 'Must';
  t('a Must is never a deferral: the gate waits for it', openDeferrals(q).length === 0);
  const r = base();
  row(r, 'Sensory requirements').priority = 'Could';
  t('a Could that is not Complete is a deferral too', openDeferrals(r).length === 1);
}

// --- a deferral needs a tracked action -----------------------------------------------------------------------------------------------------
{
  const p = base();
  row(p, 'Sensory requirements').priority = 'Should';
  t('an untracked deferral is listed', untrackedDeferrals(p).length === 1 && untrackedDeferrals(p)[0].requirement === 'Sensory requirements');
  t('...and the Gate 2 item for it blocks', tracked(p)?.satisfied === false);
  t('...as a hard block, not one Proceed with Conditions clears', tracked(p)?.hardBlock === true && !(tracked(p) as { clearedByConditions?: boolean }).clearedByConditions);
  t('...while the older item (a Should left open) is the one Proceed with Conditions clears', deferred(p)?.satisfied === false);

  p.nextActions = [action()];
  row(p, 'Sensory requirements').deferralActionId = 'na-1';
  t('linked to a controlled action of Gate 2, it is tracked', deferralProblem(p, row(p, 'Sensory requirements')) === undefined && tracked(p)?.satisfied === true);

  const problem = (over: Partial<NextAction>) => {
    p.nextActions = [action(over)];
    return deferralProblem(p, row(p, 'Sensory requirements'));
  };
  t('an action with no due date is not enough', /due date/.test(problem({ dueDate: '' }) ?? ''));
  t('an action with no owner is not enough', /owner/.test(problem({ owner: '' }) ?? ''));
  t('an action with no completion criteria is not enough', /completion criteria/.test(problem({ completionCriteria: '' }) ?? ''));
  t('an action with no escalation trigger is not enough', /escalation/.test(problem({ escalationTrigger: '' }) ?? ''));
  t('a cancelled action carries nothing', /cancelled/.test(problem({ status: 'Cancelled' }) ?? ''));
  t('an action of another gate does not count', /SG05/.test(problem({ gateId: 'SG05' }) ?? ''));
  p.nextActions = [];
  t('an action that no longer exists does not count', /no longer exists/.test(deferralProblem(p, row(p, 'Sensory requirements')) ?? ''));

  // Proceed with Conditions: the tracked item stays, the open-deferral item is what the conditions clear
  const q = base();
  row(q, 'Sensory requirements').priority = 'Should';
  const idsWith = (project: ProjectData) => hardGateBlockers(project, 'SG02', 'Proceed with Conditions').map((b) => b.id);
  t('Proceed with Conditions does not clear an untracked deferral', idsWith(q).includes('sg02-requirements-deferral-tracked'));
  q.nextActions = [action()];
  row(q, 'Sensory requirements').deferralActionId = 'na-1';
  t('...but carries it once an action is linked', !idsWith(q).includes('sg02-requirements-deferral-tracked') && !idsWith(q).includes('sg02-requirements-deferred'));
  t('a plain Proceed still waits for the Should to be completed', gateBlockers(q, 'SG02', 'Proceed').some((b) => b.id === 'sg02-requirements-deferred'));
}

// --- the requirements were approved ------------------------------------------------------------------------------------------------------
{
  const p = base();
  t('a project that never passed Gate 2 has not approved its requirements', !requirementsWereApproved(p));
  const passed = base();
  const g = passed.gates.find((x) => x.gateId === 'SG02')!;
  Object.assign(g, { status: 'Complete', decision: 'Proceed' });
  t('Gate 2 passed: approved', requirementsWereApproved(passed));
  const reopened = base();
  reopened.backtrackEvents = [{ id: 'b', reopenedGateIds: ['SG02'], previousGates: [{ ...g, gateId: 'SG02', status: 'Complete', decision: 'Proceed' }] } as never];
  t('...and still approved after a Backtrack reopened it (the history is never erased)', requirementsWereApproved(reopened));
}

// --- a changed requirement ------------------------------------------------------------------------------------------------------------------
{
  const stored = { priority: 'Must', requirementText: 'A gentle cream', status: 'In Progress' } as never;
  const k = (over: object) => requirementChangeKinds(stored, { priority: 'Must', requirementText: 'A gentle cream', status: 'In Progress', ...over } as never);
  t('nothing changed: no change', k({}).length === 0);
  t('relabelling a Must as a Should is a changed requirement', k({ priority: 'Should' }).join() === 'priority');
  t('rewording is', k({ requirementText: 'A rich cream' }).join() === 'wording');
  t('marking it not applicable is', k({ status: 'N/A' }).join() === 'applicability');
  t('moving it to Complete is progress, not a change', k({ status: 'Complete' }).length === 0);

  const p = base();
  t('no scope change linked: not allowed', /no approved scope change/.test(scopeChangeProblem(p, '') ?? ''));
  t('a change that is not in the log: not allowed', /not a Change Control record/.test(scopeChangeProblem(p, 'CHG-404') ?? ''));
  const change = (over: Partial<ChangeRecord>) => ({ changeId: 'CHG-9', owner: 'Anna', status: 'Under Review', ...over }) as ChangeRecord;
  p.changes = [change({})];
  t('a change still under review is not approved to implement', /not yet approved/.test(scopeChangeProblem(p, 'CHG-9') ?? ''));
  p.changes = [change({ status: 'Approved - Implementation Pending' })];
  t('an approved change whose impact was not assessed is not enough', /impact/.test(scopeChangeProblem(p, 'CHG-9') ?? ''));
  p.changes = [change({ status: 'Approved - Implementation Pending', impactTriage: 'No material impact' })];
  t('approved and impact assessed: it serves', scopeChangeProblem(p, 'CHG-9') === undefined);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
