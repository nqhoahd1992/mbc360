// Round 5 question 1(d): impact assessments raised by changes to the company lists, and the hold a Critical one puts on release.
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { IMPACT_FUNCTIONS, heldMarkets, impactConclusionProblem, impactHolds, isImpactOverdue } from '../src/utils/impactAssessments';
import { entryTouchesProject, projectHasPassedGate } from '../src/utils/referenceSnapshot';
import type { ImpactAssessmentRecord, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra?: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const assessment = (over: Partial<ImpactAssessmentRecord> = {}): ImpactAssessmentRecord => ({
  id: 'a1',
  dataset: 'rm-risk',
  subject: 'RM-1',
  summary: 'x',
  critical: true,
  dueDate: '2026-12-01',
  raisedBy: 'someone',
  raisedAt: '2026-11-06T00:00:00.000Z',
  functionKeys: [...IMPACT_FUNCTIONS['rm-risk']],
  markets: ['Vietnam', 'Australia'],
  conclusions: [],
  ...over,
});
const project = (list: ImpactAssessmentRecord[]): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  p.impactAssessments = list;
  return p;
};
const item = (p: ProjectData, gate: string) => gateReadinessChecklist(p, gate).find((i) => i.id === 'impact-hold');

t('no assessments, no hold', impactHolds(project([])).length === 0 && heldMarkets(project([])).length === 0);
t('a Critical open assessment holds', impactHolds(project([assessment()])).length === 1);
t('a non-Critical one never holds', impactHolds(project([assessment({ critical: false })])).length === 0);
t('a concluded one no longer holds', impactHolds(project([assessment({ concludedAt: '2026-11-07T00:00:00.000Z' })])).length === 0);
t('a material change holds every market of the project', heldMarkets(project([assessment()])).sort().join() === 'Australia,Vietnam');
t('a market change holds only that market', heldMarkets(project([assessment({ dataset: 'market-profile', subject: 'Vietnam', markets: ['Vietnam'] })])).join() === 'Vietnam');

{
  const held = project([assessment()]);
  t('Gate 10 is blocked while a Critical assessment is open', item(held, 'SG10')?.satisfied === false);
  t('...Gate 11 and Gate 12 too', item(held, 'SG11')?.satisfied === false && item(held, 'SG12')?.satisfied === false);
  t('...and it is a hard block, which Proceed with Conditions does not clear', item(held, 'SG10')?.hardBlock === true);
  t('earlier gates carry no such item', item(held, 'SG07') === undefined && item(held, 'SG09') === undefined);
  t('with nothing held the item reads satisfied', item(project([]), 'SG10')?.satisfied === true);
  t('...and so does one that is only a notice', item(project([assessment({ critical: false })]), 'SG10')?.satisfied === true);
}

t('overdue only while open and past due', isImpactOverdue(assessment(), '2027-01-01') && !isImpactOverdue(assessment(), '2026-11-30') && !isImpactOverdue(assessment({ concludedAt: 'x' }), '2027-01-01'));

{
  const changes = ['CHG-1'];
  const ok = (c: string, r: string, l?: string) => impactConclusionProblem({ conclusion: c, rationale: r, linkedChangeId: l }, changes);
  t('"No impact" with a rationale is fine', ok('No impact', 'why') === null);
  t('...without one it is not', ok('No impact', '  ') !== null);
  t('an unknown conclusion is refused', ok('Maybe', 'why') !== null);
  t('an impact must name a Change Control record', ok('Impact on this project', 'why') !== null);
  t('...one that exists on this project', ok('Impact on this project', 'why', 'CHG-9') !== null);
  t('an impact with a real record is fine', ok('Impact on this project', 'why', 'CHG-1') === null);
}

{
  const p = project([]);
  p.bom = [{ rmCode: 'RM-1', ingredient: 'x', percent: 1 } as never];
  t('a material in the formula touches the project', entryTouchesProject(p, 'Raw Material Risk Overlay', 'RM-1'));
  t('one that is not does not', !entryTouchesProject(p, 'Raw Material Risk Overlay', 'RM-2'));
  t('a market the project is sold in touches it', entryTouchesProject(p, 'Market profile', 'Vietnam') && !entryTouchesProject(p, 'Market profile', 'Japan'));
  t('a project with no passed gate needs no assessment', !projectHasPassedGate(p));
  const g = p.gates.find((x) => x.gateId === 'SG01')!;
  g.status = 'Complete' as never;
  g.decision = 'Proceed' as never;
  t('...and one with a passed gate does', projectHasPassedGate(p));
}

if (bad > 0) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log('\nall passed');
