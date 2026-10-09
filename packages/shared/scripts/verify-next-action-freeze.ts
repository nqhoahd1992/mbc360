// Verifies software rule SW-19 (docs/rules/Software_Rules.md): after a gate has passed, a
// closed or cancelled Next Action is frozen, and an open one (a condition the Approved
// signature accepted) can only have its Status, Owner and Due date changed —
// without un-passing the gate or turning its signatures stale.
//
// Runs the REAL readiness engine on a project whose gates SG01-SG03 have passed with
// three signatures each. The readiness lists of those gates are cut down to their
// sign-off item IN THIS PROCESS ONLY, so they can pass without every unrelated item.
// Run: npm run verify:actions
import { GATE_READINESS } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateRefHighestGateId, gateBlockers, gateSignOffStaleChanges, isGatePassed } from '../src/utils/gateProgress';
import { gateEvidenceSnapshot } from '../src/utils/gateSnapshot';
import { nextActionFreeze, nextActionFreezeViolation } from '../src/utils/nextActionAccess';
import type { NextAction, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) bad++;
};

for (const g of ['SG01', 'SG02', 'SG03']) GATE_READINESS[g] = GATE_READINESS[g].filter((r) => r.check.kind === 'gateSignedOff');
const base = createEmptyProject({ id: 'T', productCode: 'T', projectLead: 'x', markets: [], reviewers: {} } as never);
for (const g of ['SG01', 'SG02', 'SG03']) {
  const record = base.gates.find((x) => x.gateId === g)!;
  record.status = 'Complete';
  record.decision = 'Proceed with Conditions';
}
const signed = { signedByUserId: 'u', signedAt: '2026-01-01T00:00:00Z' };
for (const c of REGISTER_CONFIGS) {
  if (['SG01', 'SG02', 'SG03'].includes(gateRefHighestGateId(c.gate) ?? '')) {
    base.registerClosures[c.key] = { signOffs: [{ role: 'Review owner', ...signed }, { role: 'Co-sign', ...signed }] } as never;
  }
}
const act = (id: string, status: string, priority: string, extra: Partial<NextAction> = {}): NextAction =>
  ({ id, gateId: 'SG03', description: `action ${id}`, owner: 'Bob', status, priority, ...extra }) as NextAction;
base.nextActions = [
  act('open1', 'Open', 'Medium'),
  act('done1', 'Closed', 'Low', { dateCompleted: '2026-02-01', verifiedBy: 'V' }),
];
for (const g of ['SG01', 'SG02', 'SG03']) {
  const snapshot = gateEvidenceSnapshot(base, g);
  for (const role of ['Prepared by', 'Reviewed by', 'Approved by'] as const) {
    base.gateSignOffs.push({ gateId: g, role, ...signed, name: 'n', decision: 'Proceed with Conditions', snapshot } as never);
  }
}

t('baseline: SG03 has passed, signed, with one open condition and one closed action', isGatePassed(base, 'SG03'));

const vary = (fn: (actions: NextAction[]) => NextAction[]): ProjectData => ({
  ...base,
  nextActions: fn(base.nextActions.map((a) => ({ ...a }))),
});
const edit = (id: string, patch: Partial<NextAction>) => (actions: NextAction[]) =>
  actions.map((a) => (a.id === id ? { ...a, ...patch } : a));
const passes = (p: ProjectData) => isGatePassed(p, 'SG03');
const stale = (p: ProjectData) => gateSignOffStaleChanges(p, 'SG03', undefined, 'Approved by');

// --- what the ENGINE does (snapshot staleness + hard blocks) --------------------------
t('open condition: status Open -> In Progress keeps the gate passed', passes(vary(edit('open1', { status: 'In Progress' }))));
t('open condition: CLOSED keeps the gate passed and the signature current',
  passes(vary(edit('open1', { status: 'Closed', dateCompleted: '2026-03-01', verifiedBy: 'V' }))) &&
    stale(vary(edit('open1', { status: 'Closed', verifiedBy: 'V' }))).length === 0);
t('open condition: Cancelled keeps the gate passed', passes(vary(edit('open1', { status: 'Cancelled', verifiedBy: 'V' }))));
t('open condition: owner and due date change keeps the gate passed', passes(vary(edit('open1', { owner: 'Alice', dueDate: '2026-12-01' }))));
t('open condition: priority RAISED to High keeps the gate passed', passes(vary(edit('open1', { priority: 'High' }))));
t('open condition: reworded makes the signature stale and names it',
  !passes(vary(edit('open1', { description: 'reworded' }))) &&
    stale(vary(edit('open1', { description: 'reworded' }))).some((c) => c.startsWith('Condition reworded')));
t('open condition: priority LOWERED makes the signature stale',
  stale(vary(edit('open1', { priority: 'Low' }))).some((c) => c.startsWith('Condition priority lowered')));
t('open condition: deleted makes the signature stale', stale(vary((as) => as.filter((a) => a.id !== 'open1'))).some((c) => c.startsWith('Condition removed')));
t('a NEW open action makes the signature stale', stale(vary((as) => [...as, act('new1', 'Open', 'Low')])).some((c) => c.startsWith('New open action')));
t('a closed action re-opened makes the signature stale', stale(vary(edit('done1', { status: 'Open', verifiedBy: undefined }))).length > 0);
t('a NEW action that is already closed does not', stale(vary((as) => [...as, act('new2', 'Closed', 'Low')])).length === 0);
// Whether a Critical action still stops a gate carrying conditions is the engine's own
// call and is not decided by this rule [ASSUMPTION: R5-Q59 / R5-Q60].
t('open condition raised to Critical is left to the readiness engine (currently a hard block)',
  !passes(vary(edit('open1', { priority: 'Critical' }))) &&
    gateBlockers(vary(edit('open1', { priority: 'Critical' })), 'SG03').some((b) => b.id === 'critical-next-actions'));

// --- what the FREEZE function says (the server and the screen both call it) ------------
const open = act('open1', 'Open', 'Medium');
const closed = act('done1', 'Closed', 'Low', { dateCompleted: '2026-02-01', verifiedBy: 'V' });
const v = (before: NextAction, after: Partial<NextAction>) => nextActionFreezeViolation(before, { ...before, ...after });
t('nothing is frozen before the gate has passed', JSON.stringify(nextActionFreeze(open, false)) === JSON.stringify(nextActionFreeze(undefined, true)));
t('open: progressing status / owner / due date / notes is allowed',
  v(open, { status: 'In Progress' }) === undefined && v(open, { owner: 'Z' }) === undefined && v(open, { dueDate: '2027-01-01' }) === undefined);
t('open: closing it is allowed', v(open, { status: 'Closed', verifiedBy: 'V', dateCompleted: '2026-03-01' }) === undefined);
t('open: description is frozen', (v(open, { description: 'x' }) ?? '').includes('description'));
t('open: gate is frozen', (v(open, { gateId: 'SG04' }) ?? '').includes('gate'));
t('open: priority is frozen in BOTH directions (up would contradict the rule that let the gate pass)',
  v(open, { priority: 'Low' }) !== undefined && v(open, { priority: 'High' }) !== undefined && v(open, { priority: 'Critical' }) !== undefined && v(open, { priority: 'Medium' }) === undefined);
t('closed: every field is frozen',
  ['description', 'owner', 'dueDate', 'priority', 'status', 'dateCompleted', 'verifiedBy'].every((f) => {
    const patch = { [f]: f === 'priority' ? 'High' : f === 'status' ? 'Open' : 'changed' } as Partial<NextAction>;
    return v(closed, patch) !== undefined;
  }));
t('closed: saving it unchanged is fine', v(closed, {}) === undefined);
t('closed: moving between Closed and Cancelled is frozen too', v(closed, { status: 'Cancelled' }) !== undefined);
t('freeze tells the screen what to lock',
  nextActionFreeze(open, true).rewrite === true && nextActionFreeze(open, true).all === false &&
    nextActionFreeze(closed, true).all === true && nextActionFreeze(open, false).rewrite === false);


// --- BEFORE the gate passes: what open actions do to the decision ----------------------
// SG03's readiness list is emptied (it only carried the sign-off item, which is not what is
// under test here), and the gate is judged on its decision plus the engine's own Next
// Action items.
GATE_READINESS.SG03 = [];
const pre = (decision: string, actions: NextAction[]): ProjectData => {
  const p: ProjectData = { ...base, gates: base.gates.map((g) => ({ ...g })), nextActions: actions };
  const record = p.gates.find((g) => g.gateId === 'SG03')!;
  record.status = 'Complete';
  record.decision = decision as never;
  return p;
};
t('pre-pass: open non-Critical action + plain Proceed does NOT pass',
  !isGatePassed(pre('Proceed', [act('a', 'Open', 'High')]), 'SG03'));
t('pre-pass: open non-Critical action + Proceed with Conditions passes',
  isGatePassed(pre('Proceed with Conditions', [act('a', 'Open', 'High'), act('b', 'In Progress', 'Low')]), 'SG03'));
t('pre-pass: an open Critical action blocks Proceed with Conditions too',
  !isGatePassed(pre('Proceed with Conditions', [act('a', 'Open', 'Critical')]), 'SG03'));
t('pre-pass: one Critical among several non-Critical still blocks',
  !isGatePassed(pre('Proceed with Conditions', [act('a', 'Open', 'Low'), act('b', 'Ready for Verification', 'Critical')]), 'SG03'));
t('pre-pass: every action Closed or Cancelled passes on a plain Proceed',
  isGatePassed(pre('Proceed', [act('a', 'Closed', 'Critical', { dateCompleted: '2026-02-01', verifiedBy: 'V' }), act('b', 'Cancelled', 'High', { verifiedBy: 'V' })]), 'SG03'));
t('pre-pass: no actions at all passes on a plain Proceed', isGatePassed(pre('Proceed', []), 'SG03'));

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
