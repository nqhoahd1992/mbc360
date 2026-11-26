// Round 5 question 24: what an open Critical action blocks, and what it takes to cancel one. Pure functions on the real rule code.
// Run: npm run verify:critical-actions
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { actionCancellationGaps } from '../src/utils/actionVerification';
import { gateBlockers, hardGateBlockers } from '../src/utils/gateProgress';
import type { NextAction, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const action = (over: Partial<NextAction> = {}): NextAction => ({ id: 'A1', gateId: 'SG02', description: 'd', owner: 'O', status: 'Open', priority: 'Critical', ...over });
const project = (actions: NextAction[]): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  p.nextActions = actions;
  return p;
};
const blocks = (p: ProjectData, gate: string, decision: string, market?: string) => gateBlockers(p, gate, decision as never, market).some((b) => b.id === 'critical-next-actions');

// (a) an open Critical action blocks both passing decisions
t('an open Critical action blocks a plain Proceed', blocks(project([action()]), 'SG02', 'Proceed'));
t('...and Proceed with Conditions', blocks(project([action()]), 'SG02', 'Proceed with Conditions'));
t('...as a hard block that Proceed with Conditions does not clear', hardGateBlockers(project([action()]), 'SG02', 'Proceed with Conditions').some((b) => b.id === 'critical-next-actions'));
t('a non-Critical open action does not hold it', !blocks(project([action({ priority: 'High' })]), 'SG02', 'Proceed with Conditions'));
t('it blocks only its own gate', !blocks(project([action()]), 'SG03', 'Proceed with Conditions'));

// (b) once closed or cancelled it blocks nothing, and a gate that once carried one may pass on a plain Proceed
t('a Closed Critical action blocks nothing', !blocks(project([action({ status: 'Closed' })]), 'SG02', 'Proceed'));
t('a Cancelled Critical action blocks nothing', !blocks(project([action({ status: 'Cancelled' })]), 'SG02', 'Proceed'));

// scope: on a gate signed per market, a Critical action of one market holds that market's lane, one with no market holds every lane
{
  const p = project([action({ gateId: 'SG10', market: 'Vietnam' })]);
  t("a Critical action of one market holds that market's lane", blocks(p, 'SG10', 'Proceed with Conditions', 'Vietnam'));
  t("...and not another market's", !blocks(p, 'SG10', 'Proceed with Conditions', 'Australia'));
  t('one that names no market holds every lane', blocks(project([action({ gateId: 'SG10' })]), 'SG10', 'Proceed with Conditions', 'Australia'));
}

// cancelling a Critical action
{
  const cancelled = (over: Partial<NextAction> = {}) => action({ status: 'Cancelled', cancellationReason: 'r', cancellationImpact: 'i', ...over });
  t('a Critical action is not cancelled on a justification and impact review alone', actionCancellationGaps(cancelled()).length === 1);
  t('...it also needs the confirmation that no residual issue remains', actionCancellationGaps(cancelled({ cancellationNoResidual: true })).length === 0);
  t('a High action does not need that confirmation', actionCancellationGaps(cancelled({ priority: 'High' })).length === 0);
  t('nothing is asked of an action that is not being cancelled', actionCancellationGaps(action()).length === 0);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
