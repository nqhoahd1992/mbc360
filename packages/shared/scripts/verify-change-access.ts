// Verifies when a project may open a Change Control of a given type (SW-30): a trigger is
// available once the project has PASSED the earliest gate it names; `ALL` is always available;
// the gate merely open for work does not count. Pure functions over a hand-built project on
// the real rule engine; the API's refusal is exercised by `npm run verify:e2e`.
// Run: npm run verify:change-access
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { CHANGE_TRIGGERS, getChangeTrigger } from '../src/config/changeTriggers';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { changeTriggerAvailability, earliestTriggerGate } from '../src/utils/changeAccess';
import { isGatePassed } from '../src/utils/gateProgress';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

// Only the gate record is under test, not the evidence behind a pass: cut every readiness list and
// the register-closure requirement (in THIS process only) so Complete + Proceed is enough for `isGatePassed`.
for (const gate of Object.keys(GATE_READINESS)) GATE_READINESS[gate] = [];
REGISTER_CONFIGS.splice(0);

const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const pass = (p: ProjectData, ...numbers: string[]) => {
  for (const n of numbers) {
    const g = p.gates.find((x) => x.gateId === `SG${n}`);
    if (!g) throw new Error(`gate SG${n} not found`);
    g.status = 'Complete';
    g.decision = 'Proceed';
  }
};
const trig = (id: string) => {
  const x = getChangeTrigger(id);
  if (!x) throw new Error(`trigger ${id} not found`);
  return x;
};
const allowed = (p: ProjectData, id: string) => changeTriggerAvailability(p, trig(id)).allowed;

// --- every trigger names a real gate, or ALL: a typo would otherwise read as "always allowed" --------------
{
  const unreadable = CHANGE_TRIGGERS.filter((x) => !x.gates.includes('ALL') && !earliestTriggerGate(x));
  t('every trigger that is not ALL names at least one real gate', unreadable.length === 0, unreadable.map((x) => x.id).join(', '));
  t('earliest gate is the lowest-numbered one named', earliestTriggerGate(trig('formula-ingredient'))?.id === 'SG05' && earliestTriggerGate(trig('pif-any-change')) === undefined);
}

// --- a project that has passed nothing -----------------------------------------------------------------
{
  const p = fresh();
  t('Gate 1 project: a formula change (Gates 5, 8) is not available', !allowed(p, 'formula-ingredient'));
  const a = changeTriggerAvailability(p, trig('formula-ingredient'));
  t('...it says which gate has to pass first', a.requiresGateId === 'SG05' && /Gate 05 has not passed yet/.test(a.reason ?? ''), JSON.stringify(a));
  t('...a dossier change (Gates 10, 11) is not available either', !allowed(p, 'pif-launch'));
  t('a trigger naming ALL gates is always available', allowed(p, 'pif-any-change'));
}

// --- the gate that is merely open for work does not count ----------------------------------------------
{
  const p = fresh();
  pass(p, '01', '02', '03', '04'); // Gate 05 is now the open one
  t('Gate 05 is the OPEN gate (not passed): its formula changes are still edited directly, so not available', !isGatePassed(p, 'SG05') && !allowed(p, 'formula-ingredient'));
  t('a trigger whose earliest gate (03) HAS passed is available, though its later gate (10) has not', allowed(p, 'artwork-claim-copy') && !allowed(p, 'pif-test-report'));
}

// --- once the earliest gate passes ---------------------------------------------------------------------
{
  const p = fresh();
  pass(p, '01', '02', '03', '04', '05');
  t('after Gate 05 passes the formula change is available — the Gate 8 it also names has not been reached, and need not be', allowed(p, 'formula-ingredient'));
  t('...a dossier change (earliest Gate 10) still is not', !allowed(p, 'pif-launch'));
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
