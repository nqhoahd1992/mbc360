// Verifies when a project may be stopped (SW-31): only while a gate carries a Critical gap
// assessment, never twice, never while archived, and never while a market is launched and not
// withdrawn. Pure functions; the API's Lead/admin check and the saved record are covered by hand
// against a one-off API.
// Run: npm run verify:project-stop
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { projectStopGrounds, stopRefusal } from '../src/utils/projectStop';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const fresh = (): ProjectData =>
  createEmptyProject({
    id: 'STOP-TEST', productCode: 'X', productSku: 'X', productGroup: 'X', projectLead: 'Lead Person',
    ownerDepartment: 'X', dateOpened: '2026-01-01', targetLaunchDate: '2027-01-01', markets: ['Vietnam'],
    reviewers: {},
  } as never);

const p0 = fresh();
t('a new project has no grounds', projectStopGrounds(p0).length === 0);
t('a new project cannot be stopped', stopRefusal(p0) !== null);

const p1 = fresh();
p1.gates[2] = { ...p1.gates[2], gapCriticality: 'High' };
t('a High gap is not a ground', projectStopGrounds(p1).length === 0);

const p2 = fresh();
p2.gates[2] = { ...p2.gates[2], status: 'Complete', gapCriticality: 'Critical', gapImpactCategory: 'Safety', gapRationale: 'Irritant', gapAssessor: 'Sam', gapAssessmentDate: '2026-10-10' };
const g2 = projectStopGrounds(p2);
t('a Critical gap is a ground even after the status left Gap', g2.length === 1 && g2[0].gateId === p2.gates[2].gateId);
t('the ground carries the assessment', g2[0]?.impactCategory === 'Safety' && g2[0]?.rationale === 'Irritant' && g2[0]?.assessor === 'Sam');
t('a project with a Critical gap can be stopped', stopRefusal(p2) === null, String(stopRefusal(p2)));

const p3 = fresh();
p3.gates[0] = { ...p3.gates[0], gapCriticality: 'Critical', gapImpactCategory: 'Safety', gapRationale: 'r', gapAssessor: 'Sam', gapAssessmentDate: '2026-10-10' };
p3.gates[5] = { ...p3.gates[5], gapCriticality: 'Critical', gapImpactCategory: 'Safety', gapRationale: 'r', gapAssessor: 'Sam', gapAssessmentDate: '2026-10-10' };
t('every Critical gap is listed', projectStopGrounds(p3).length === 2);

const bare = fresh();
bare.gates[1] = { ...bare.gates[1], gapCriticality: 'Critical' };
t('a bare Critical grade is not a ground', projectStopGrounds(bare).length === 0);
t('...and Stop says what is missing', /Impact category, Assessor, Assessment date, Rationale/.test(stopRefusal(bare) ?? ''), String(stopRefusal(bare)));

const archived = { ...p2, identity: { ...p2.identity, archived: { at: '2026-10-01' } } };
t('an archived project is refused', stopRefusal(archived) !== null);

const stopped = { ...p2, identity: { ...p2.identity, stopped: { at: '2026-10-14', comment: 'x', grounds: g2 } } };
t('a stopped project cannot be stopped again', (stopRefusal(stopped) ?? '').includes('already stopped'));

const launched = {
  ...p2,
  marketTracks: [{ ...p2.marketTracks[0], market: 'Vietnam', formulaVersion: p2.formulaVersion, actualLaunchDate: '2026-09-01' }],
};
t('a launched, unwithdrawn market blocks Stop', (stopRefusal(launched) ?? '').includes('Vietnam'));
const withdrawn = {
  ...p2,
  marketTracks: [{ ...launched.marketTracks[0], withdrawnDate: '2026-10-01' }],
};
t('a withdrawn market no longer blocks Stop', stopRefusal(withdrawn) === null, String(stopRefusal(withdrawn)));

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
