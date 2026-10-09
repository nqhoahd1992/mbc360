// Verifies software rules SW-4 and SW-5 (docs/rules/Software_Rules.md): a register row
// belongs only to the gates that had not passed when it was created, and a passed gate
// freezes the cells it counted as evidence. Pure functions over hand-built rows and a
// hand-built set of passed gates — no database, no API. Run: npm run verify:freeze
import { GATE_READINESS } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS, getRegisterConfig } from '../src/config/registers';
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { currentGateIndex, gateRefHighestGateId, isGatePassed } from '../src/utils/gateProgress';
import { gateEvidenceSnapshot } from '../src/utils/gateSnapshot';
import { projectAsOfGate } from '../src/utils/registerRowBirth';
import {
  bornGateOf,
  cellFrozenBy,
  passedGateSet,
  registerFreezeViolations,
  rowRemovalBlock,
  stampRegisterRows,
} from '../src/utils/registerRowLocks';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) bad++; };
const claims = getRegisterConfig('claimEvidenceTraceability')!;   // gate 03/10/11
const art = getRegisterConfig('packagingSpecsArtwork')!;          // gate 06/10/11
const g3 = new Set(['SG01', 'SG02', 'SG03']);

const old: RegisterRow = { __rowId: 'a', claimId: 'C1', approvedWording: 'w', claimCategory: 'Cosmetic', notes: 'n' };
const late: RegisterRow = { __rowId: 'b', __bornAtGate: 'SG10', claimId: 'C2', approvedWording: '' };

// SW-5: gate-03 columns freeze for an old row once SG03 passed...
t('gate-03 column frozen on old row after SG03', cellFrozenBy(g3, claims, old, 'approvedWording') === 'SG03');
t('gate-03 column NOT frozen before SG03 passes', cellFrozenBy(new Set(['SG01', 'SG02']), claims, old, 'approvedWording') === undefined);
// ...but not on a row born at SG10 (it belongs to later gates only)
t('same column open on a row born at SG10', cellFrozenBy(g3, claims, late, 'approvedWording') === undefined);
t('late row column freezes once SG10 passes', cellFrozenBy(new Set([...g3, 'SG04','SG05','SG06','SG07','SG08','SG09','SG10']), claims, late, 'approvedWording') === 'SG10');
// an unattributed column keeps the old whole-register behaviour (frozen only when 03/10/11 all passed)
t('unattributed column open after SG03 only', cellFrozenBy(g3, claims, old, 'notes') === undefined);

// violations: editing a frozen cell
const edit = registerFreezeViolations(g3, claims, [old], [{ ...old, approvedWording: 'changed' }]);
t('editing a frozen cell is a violation', edit.length === 1 && edit[0].includes('SG03'));
t('editing an open cell is fine', registerFreezeViolations(g3, claims, [old], [{ ...old, notes: 'x' }]).length === 0);
t('new row filling the same column is fine', registerFreezeViolations(g3, claims, [old], [old, { claimId: 'C3', approvedWording: 'new' }]).length === 0);
// deletion
t('deleting an evidence row is refused', registerFreezeViolations(g3, claims, [old], []).length === 1);
t('deleting a row born after the gate passed is allowed while no later gate has passed', registerFreezeViolations(g3, claims, [old, late], [old]).length === 0);
t('row removal block names the gate', (rowRemovalBlock(g3, claims, old) ?? '').includes('SG03'));
// matching is by id, not position: reorder must not look like an edit
t('reordering rows is not an edit', registerFreezeViolations(g3, claims, [old, late], [late, old]).length === 0);
t('swapping which row has the frozen value IS an edit', registerFreezeViolations(g3, claims, [old, late], [{ ...late, __rowId: 'a' }, { ...old, __rowId: 'b' }]).length >= 1);

// stamping
let n = 0; const id = () => `new${++n}`;
const stamped = stampRegisterRows('SG07', claims, [old, late], [{ ...late, __bornAtGate: 'SG01' }, { ...old, __bornAtGate: 'SG12' }, { claimId: 'Z' }, { claimId: 'Y', __rowId: 'a' }], id);
t('client cannot change an existing row birth', stamped[0].__bornAtGate === 'SG10' && stamped[0].__rowId === 'b');
t('client cannot invent a birth on a legacy row', stamped[1].__bornAtGate === undefined && stamped[1].__rowId === 'a');
t('new row gets id and current gate', stamped[2].__rowId === 'new1' && stamped[2].__bornAtGate === 'SG07');
t('reusing an existing id on a second row makes it a NEW row', stamped[3].__rowId !== 'a' && stamped[3].__bornAtGate === 'SG07');
t('fixed registers are not stamped', stampRegisterRows('SG07', getRegisterConfig('prohibitedIngredients')!, [], [{ x: 1 }], id)[0].__rowId === undefined);

// SW-4 view
const project = { registers: { claimEvidenceTraceability: [old, late], other: [old] } } as unknown as ProjectData;
t('gate 03 does not see a row born at SG10', projectAsOfGate(project, 'SG03').registers.claimEvidenceTraceability.length === 1);
t('gate 10 sees it', projectAsOfGate(project, 'SG10').registers.claimEvidenceTraceability.length === 2);
t('legacy row visible to every gate', projectAsOfGate(project, 'SG01').registers.claimEvidenceTraceability.length === 1);
t('untouched project returned as-is', projectAsOfGate({ registers: { a: [old] } } as unknown as ProjectData, 'SG03') !== undefined);
t('artwork register: gate-06 column frozen after SG06', cellFrozenBy(new Set(['SG06']), art, old, 'compatibilityEvidence') === 'SG06');

// ---------------------------------------------------------------------------------------
// A real project with gates that have genuinely PASSED, evaluated by the real engine.
// Readiness lists of SG01-SG03 are emptied in THIS process only (the same trick the manual
// API run used) so those gates can pass on decision + register closure alone; nothing in
// config is changed on disk. This is the regression test for the bug found 2026-10-09:
// a row created while a gate has passed but its phase is not yet closed was stamped with
// the PASSED gate and froze immediately.
// ---------------------------------------------------------------------------------------
const originalSg03 = [...GATE_READINESS.SG03];
for (const g of ['SG01', 'SG02', 'SG03']) GATE_READINESS[g].length = 0;
const identity = { id: 'T-1', productCode: 'T', projectLead: 'x', markets: [], reviewers: {} } as unknown as Parameters<typeof createEmptyProject>[0];
const live = createEmptyProject(identity);
t('empty project: no gate passed, a new row is born at SG01', bornGateOf(live) === 'SG01');
for (const g of ['SG01', 'SG02', 'SG03']) {
  const rec = live.gates.find((x) => x.gateId === g)!;
  rec.status = 'Complete';
  rec.decision = 'Proceed';
}
const signed = { signedByUserId: 'u', signedAt: '2026-01-01T00:00:00Z' };
for (const cfg of REGISTER_CONFIGS) {
  if (['SG01', 'SG02', 'SG03'].includes(gateRefHighestGateId(cfg.gate) ?? '')) {
    live.registerClosures[cfg.key] = { signOffs: [{ role: 'Review owner', ...signed }, { role: 'Co-sign', ...signed }] } as never;
  }
}
t('SG01-SG03 really pass on the real engine', ['SG01', 'SG02', 'SG03'].every((g) => isGatePassed(live, g)));
t('...while the phase is not closed, currentGateIndex still sits on SG03', currentGateIndex(live) === 2);
t('a row created now is born at SG04, NOT at the passed SG03', bornGateOf(live) === 'SG04');

const passed = passedGateSet(live);
const oldRow: RegisterRow = { __rowId: 'o', __bornAtGate: 'SG01', claimId: 'C-1', approvedWording: 'signed text' };
const newRow: RegisterRow = { __rowId: 'n', __bornAtGate: bornGateOf(live), claimId: 'C-2', approvedWording: 'draft' };
t('real engine: row from before the pass is frozen on its gate-03 cell', cellFrozenBy(passed, claims, oldRow, 'approvedWording') === 'SG03');
t('real engine: row created after the pass is not frozen by SG03', cellFrozenBy(passed, claims, newRow, 'approvedWording') === undefined);
t('real engine: the new row can be deleted, the old one cannot',
  registerFreezeViolations(passed, claims, [oldRow, newRow], [oldRow]).length === 0 &&
    registerFreezeViolations(passed, claims, [oldRow, newRow], [newRow]).length === 1);

// SW-4 on the signature snapshot: a late row must not turn a gate's signatures stale.
// The snapshot digests only registers the gate's readiness READS, so SG03's real list is put
// back first — with it emptied this section would pass for the wrong reason.
GATE_READINESS.SG03.push(...originalSg03);
live.registers.claimEvidenceTraceability = [oldRow];
t('SG03 snapshot does digest the claim register (test is not vacuous)', 'claimEvidenceTraceability' in gateEvidenceSnapshot(live, 'SG03').registers);
const before = JSON.stringify(gateEvidenceSnapshot(live, 'SG03'));
live.registers.claimEvidenceTraceability = [oldRow, newRow];
t('SG03 snapshot ignores a row created after SG03 passed', JSON.stringify(gateEvidenceSnapshot(live, 'SG03')) === before);
live.registers.claimEvidenceTraceability = [oldRow, { claimId: 'C-9', approvedWording: 'unstamped legacy' }];
t('...but an unstamped legacy row still changes it (belongs to every gate)', JSON.stringify(gateEvidenceSnapshot(live, 'SG03')) !== before);
console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`); process.exit(bad === 0 ? 0 : 1);
