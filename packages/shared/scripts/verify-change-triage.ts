// Verifies Round 5 question 10: a change awaiting impact triage holds the readiness of the gates it can affect (and only those that have
// not passed), a recorded triage lifts the hold, the scope starts from the trigger and widens only by Quality's confirmation, and a
// Rejected / Cancelled change needs the recorded confirmation that nothing was implemented before it counts as closed.
// Run: npm run verify:change-triage
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATES } from '../src/config/gates';
import type { ChangeRecord, ProjectData } from '../src/types';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { isChangeDispositionRecorded, missingDispositionFields } from '../src/utils/changeImpact';
import {
  CHANGE_STATUSES_NEEDING_TRIAGE,
  TRIAGE_ADMINISTRATIVE,
  TRIAGE_MATERIAL,
  TRIAGE_NOT_MATERIAL,
  changesHoldingGate,
  isTriagePending,
  isTriageRecorded,
  suggestedScopeGateIds,
  triageProblems,
} from '../src/utils/changeTriage';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const change = (over: Partial<ChangeRecord> = {}): ChangeRecord => ({
  changeId: 'CHG-014',
  trigger: 'Ingredient added or removed',
  triggerId: 'formula-ingredient',
  productSku: 'SKU',
  affectedArea: 'Formula / ingredient',
  riskLevel: 'High',
  communicationRequired: false,
  status: 'Under Review',
  owner: 'Sam',
  ...over,
});

const base: ProjectData = createEmptyProject({
  id: 'TRIAGE-TEST', productCode: 'X', productSku: 'X', productGroup: 'X', projectLead: 'Lead Person',
  ownerDepartment: 'X', dateOpened: '2026-01-01', targetLaunchDate: '2027-01-01', markets: ['Vietnam'],
  reviewers: {},
} as never);
const withChange = (c: ChangeRecord, passed: string[] = []): ProjectData => ({
  ...base,
  changes: [{ ...c, projectId: base.identity.id }],
  gates: base.gates.map((g) => (passed.includes(g.gateId) ? { ...g, status: 'Complete', decision: 'Proceed' } : g)),
});

const scope = suggestedScopeGateIds(change());
t('the trigger suggests a minimum scope of real gates', scope.length > 0 && scope.every((id) => GATES.some((g) => g.id === id)), scope.join(','));
const first = GATES.findIndex((g) => g.id === scope[0]);

const p = withChange(change());
t('an untriaged open change is pending', isTriagePending(p.changes[0]));
t('...and holds a gate from its earliest affected one onward', changesHoldingGate(p, GATES[first].id).length === 1);
t('...but not a gate before it', first === 0 || changesHoldingGate(p, GATES[first - 1].id).length === 0);
t('the hold shows in that gate\'s readiness as a hard block', gateReadinessChecklist(p, GATES[first].id).some((i) => i.id === 'change-hold' && i.hardBlock && !i.satisfied));
t('a gate recorded as passed keeps its record (it is reopened only when the impact is confirmed)', changesHoldingGate(withChange(change(), [GATES[first].id]), GATES[first].id).length === 0);

for (const outcome of [TRIAGE_NOT_MATERIAL, TRIAGE_ADMINISTRATIVE, TRIAGE_MATERIAL]) {
  const q = withChange(change({ impactTriage: outcome }));
  t(`a recorded triage (${outcome}) lifts the hold`, isTriageRecorded(q.changes[0]) && changesHoldingGate(q, GATES[first].id).length === 0);
}
t('a closed change holds nothing', changesHoldingGate(withChange(change({ status: 'Completed' })), GATES[first].id).length === 0);
t('two changes each hold, and triaging one leaves the other holding', (() => {
  const q: ProjectData = {
    ...base,
    changes: [
      { ...change({ changeId: 'CHG-1' }), projectId: base.identity.id },
      { ...change({ changeId: 'CHG-2' }), projectId: base.identity.id },
    ],
  };
  const after: ProjectData = { ...q, changes: q.changes.map((c) => (c.changeId === 'CHG-1' ? { ...c, impactTriage: TRIAGE_NOT_MATERIAL } : c)) };
  return changesHoldingGate(q, GATES[first].id).length === 2 && changesHoldingGate(after, GATES[first].id).map((c) => c.changeId).join() === 'CHG-2';
})());
t('a trigger that names every gate holds from Gate 1', (() => {
  const all = withChange(change({ triggerId: undefined }));
  return suggestedScopeGateIds(all.changes[0]).length === GATES.length && changesHoldingGate(all, GATES[0].id).length === 1;
})());

t('a Material triage needs a confirmed scope', triageProblems({ outcome: TRIAGE_MATERIAL, confirmedGates: [], reason: 'r' }).some((x) => x.includes('scope')));
t('every triage needs a reason', triageProblems({ outcome: TRIAGE_NOT_MATERIAL, confirmedGates: [], reason: ' ' }).some((x) => x.includes('reason')));
t('a triage names only markets of the project', triageProblems({ outcome: TRIAGE_MATERIAL, confirmedGates: ['SG10'], reason: 'r', confirmedMarkets: ['Atlantis'], projectMarkets: ['Vietnam'] }).some((x) => x.includes('Atlantis')) && triageProblems({ outcome: TRIAGE_MATERIAL, confirmedGates: ['SG10'], reason: 'r', confirmedMarkets: ['Vietnam'], projectMarkets: ['Vietnam'] }).length === 0);
t('an unknown outcome is refused', triageProblems({ outcome: 'Maybe', confirmedGates: [], reason: 'r' }).length > 0);
t('an unknown gate is refused', triageProblems({ outcome: TRIAGE_MATERIAL, confirmedGates: ['SG99'], reason: 'r' }).length > 0);
t('a complete Material triage has no problems', triageProblems({ outcome: TRIAGE_MATERIAL, confirmedGates: scope, reason: 'r' }).length === 0);
t('a not-material triage needs no scope', triageProblems({ outcome: TRIAGE_NOT_MATERIAL, confirmedGates: [], reason: 'r' }).length === 0);
t('approval to implement is a status that needs the triage first', CHANGE_STATUSES_NEEDING_TRIAGE.includes('Approved - Implementation Pending') && !CHANGE_STATUSES_NEEDING_TRIAGE.includes('Under Review'));

const closed = (status: ChangeRecord['status'], extra: Partial<ChangeRecord> = {}): ChangeRecord =>
  change({
    status,
    closureOutcome: 'o',
    closureImplementation: 'i',
    closureEvidence: 'e',
    closureImpactedVersions: 'v',
    closureVerifier: 'Sam',
    closedDate: '2026-11-01',
    ...extra,
  });
t('a Rejected change with every other part recorded is still incomplete without the restore confirmation', !isChangeDispositionRecorded(closed('Rejected')) && missingDispositionFields(closed('Rejected')).includes('restoreConfirmation'));
t('...and complete with it', isChangeDispositionRecorded(closed('Rejected', { restoreConfirmation: 'Nothing implemented; no residual impact' })));
t('a Cancelled change needs it too', !isChangeDispositionRecorded(closed('Cancelled')));
t('a Completed change does not', isChangeDispositionRecorded(closed('Completed')));

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
