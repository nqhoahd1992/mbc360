// SW-36: a register is closed per gate, and what a closing signature locks is the register's settled columns at that gate.
// Pure functions over a hand-built project; the API is exercised by `npm run verify:e2e`.
// Run: npm run verify:register-closure
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS, type RegisterConfig } from '../src/config/registers';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { registerClosureContent } from '../src/utils/registerClosureContent';
import {
  closureColumns,
  closureKey,
  isRegisterFullyClosed,
  registerClosureGateIds,
  registerLockViolations,
  registerLocks,
  requiredRegisterClosures,
} from '../src/utils/registerClosures';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const cfg = (key: string): RegisterConfig => REGISTER_CONFIGS.find((c) => c.key === key)!;
const signed = { signedByUserId: 'u', signedAt: '2026-01-01T00:00:00Z' };
const make = () =>
  createEmptyProject({ id: 'T', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const sign = (project: ReturnType<typeof make>, key: string, gate: string, both = true) => {
  project.registerClosures[closureKey(key, gate)] = {
    signOffs: both ? [{ role: 'Review owner', ...signed }, { role: 'Co-sign', ...signed }] : [{ role: 'Review owner', ...signed }],
  } as never;
};

// --- which gates a register is closed at --------------------------------------------------------
const watch = cfg('prohibitedIngredients');
const watchGates = registerClosureGateIds(watch);
t('a watch-list is closed at more than one gate (it is read earlier than it is finished)', watchGates.length >= 2, watchGates.join(','));
for (const gate of watchGates) {
  t(`closing ${gate} covers at least one column`, closureColumns(watch, gate).length > 0);
}
const covered = (gate: string) => new Set(closureColumns(watch, gate));
const first = watchGates[0];
const last = watchGates[watchGates.length - 1];
t('a later gate covers everything an earlier one does', [...covered(first)].every((k) => covered(last).has(k)));
t('...and more, since a later gate settles the columns that only it owns', covered(last).size > covered(first).size);
const fcr = cfg('formulationChangeRegister');
t(
  'a signature column is never part of a closure',
  fcr ? registerClosureGateIds(fcr).every((g) => closureColumns(fcr, g).every((k) => fcr.columns.find((c) => c.key === k)?.type !== 'signature')) : true,
);

// --- required closures per gate -----------------------------------------------------------------
for (const gate of watchGates) {
  t(`${gate} requires the watch-list closed`, requiredRegisterClosures(gate).some((r) => r.registerKey === 'prohibitedIngredients'));
}
const allGates = ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12'];
const outside = allGates.find((g) => !watchGates.includes(g))!;
t(`a gate outside its list (${outside}) does not require it`, !requiredRegisterClosures(outside).some((r) => r.registerKey === 'prohibitedIngredients'));

// --- the readiness item is per gate -------------------------------------------------------------
const project = make();
const item = (gate: string) => gateReadinessChecklist(project, gate).find((i) => i.id === 'unclosed-registers');
const rowOf = (gate: string) => item(gate)!.list!.rows.find((r) => r.key === 'prohibitedIngredients')!;
t(
  'nothing closed: the item blocks and lists every register the gate needs',
  !!item(first) && !item(first)!.satisfied && (item(first)!.list?.rows.length ?? 0) === requiredRegisterClosures(first).length,
);
sign(project, 'prohibitedIngredients', first);
t('closed for the gate: that row is done', rowOf(first).done === true);
t('...but a closure given for an EARLIER gate does not count for a later one', rowOf(last).done === false);
sign(project, 'prohibitedIngredients', first, false);
t('one signature of two is not a closed register', rowOf(first).done === false);

// --- what a standing signature locks --------------------------------------------------------------
const p2 = make();
t('nothing locked while nobody has signed (a gate passing is not a lock)', registerLocks(p2, watch).columns.size === 0 && !registerLocks(p2, watch).rows);
sign(p2, 'prohibitedIngredients', first, false);
const locks = registerLocks(p2, watch);
t('ONE standing signature already locks the covered columns', locks.columns.size === covered(first).size);
t('every locked column names the gate that locked it', [...locks.columns.values()].every((g) => g === first));
const rows = p2.registers['prohibitedIngredients'];
const later = [...covered(last)].find((k) => !covered(first).has(k))!;
const settled = [...covered(first)][0];
const edit = (patch: Record<string, unknown>) => rows.map((r, i) => (i === 0 ? { ...r, ...patch } : r));
t('changing a locked column is refused', registerLockViolations(p2, watch, rows, edit({ [settled]: 'changed' })).length === 1, settled);
t('changing a column only a LATER gate settles is allowed', registerLockViolations(p2, watch, rows, edit({ [later]: 'changed' })).length === 0, later);
t('an unchanged save is always fine', registerLockViolations(p2, watch, rows, rows.map((r) => ({ ...r }))).length === 0);
t('a fixed register keeps its rows: no row lock is imposed on it', locks.rows === undefined);

// A free-form register locks its rows once a closure stands.
const free = REGISTER_CONFIGS.find((c) => c.mode === 'register' && registerClosureGateIds(c).length > 0)!;
const p3 = make();
sign(p3, free.key, registerClosureGateIds(free)[0], false);
t(`a free-form register (${free.key}) cannot gain a row while a closure stands`, registerLockViolations(p3, free, [], [{ id: 'x' } as never]).length === 1);

// --- fully closed ----------------------------------------------------------------------------------
const p4 = make();
t('not fully closed at the start', !isRegisterFullyClosed(p4, watch));
for (const gate of watchGates) sign(p4, 'prohibitedIngredients', gate);
t('fully closed once every gate it belongs to has both signatures', isRegisterFullyClosed(p4, watch));

// --- one signature for a whole page (RegisterConfig.closedWith) ---------------------------------------
const anchor = cfg('productDevelopmentProfile');
const members = ['productDevelopmentIterations', 'productDevelopmentFeedback'].map(cfg);
const groupGate = registerClosureGateIds(anchor)[0];
t('the anchor of a page is closable', !!groupGate);
t('a member has no closing block of its own', members.every((m) => registerClosureGateIds(m).length === 0));
t('no gate requires a member closed separately', allGates.every((g) => !requiredRegisterClosures(g).some((r) => members.some((m) => m.key === r.registerKey))));
const g1 = make();
t('a member is not locked before the anchor is signed', members.every((m) => registerLocks(g1, m).columns.size === 0));
sign(g1, anchor.key, groupGate, false);
t('one standing signature on the anchor locks the members too', members.every((m) => closureColumns(m, groupGate).length > 0 && registerLocks(g1, m).columns.size > 0));
t('...and their rows, since they are free-form', members.filter((m) => m.mode === 'register').every((m) => registerLocks(g1, m).rows === groupGate));
t('the anchor is fully closed only once both signatures stand, and so are its members', !isRegisterFullyClosed(g1, anchor) && !isRegisterFullyClosed(g1, members[0]));
sign(g1, anchor.key, groupGate);
t('with both signatures the members read as closed', isRegisterFullyClosed(g1, members[0]));
const before = JSON.stringify(registerClosureContent(make(), anchor.key, groupGate));
const withRow = make();
withRow.registers[members[0].key] = [{ iteration: '1' } as never];
t('what the signature attests to includes the members', JSON.stringify(registerClosureContent(withRow, anchor.key, groupGate)) !== before);
t('an ordinary register carries no sections, so its hash is unchanged', registerClosureContent(make(), 'prohibitedIngredients', first)?.sections === undefined);

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
