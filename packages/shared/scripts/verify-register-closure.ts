// SW-36: a register is closed per gate, and what a closing signature locks is the register's settled columns at that gate.
// Pure functions over a hand-built project; the API is exercised by `npm run verify:e2e`.
// Run: npm run verify:register-closure
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS, type RegisterConfig } from '../src/config/registers';
import { registerClosureSignerRole } from '../src/config/reviewers';
import { isRegisterClosed } from '../src/types';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { registerClosureContent } from '../src/utils/registerClosureContent';
import {
  closureColumns,
  closureKey,
  closureNeedsIndependentReview,
  closureSignerConflict,
  closureSignersAreNominated,
  registerApprovalRequirement,
  registerReviewSpec,
  isRegisterFullyClosed,
  registerClosureGateIds,
  registerClosureRoles,
  registerLockViolations,
  registerLocks,
  requiredRegisterClosures,
} from '../src/utils/registerClosures';

// Closed at ONE gate (isRegisterFullyClosed asks for every gate the register is closed at).
const isRegisterFullyClosedAt = (project: ReturnType<typeof createEmptyProject>, config: RegisterConfig, gate: string) =>
  isRegisterClosed(project.registerClosures[closureKey(config.key, gate)], registerClosureRoles(config, gate));

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
// A later closing block must add a settled column: the same two people signing the same columns twice (Supplier & RM Evidence at
// Gates 7, 10 and 11; the Vulnerable-User Assessment at Gates 2 and 12) was the same block repeated on the page.
const repeatedBlocks = REGISTER_CONFIGS.flatMap((c) => {
  const gates = registerClosureGateIds(c);
  return gates.slice(1).filter((gate, i) => closureColumns(c, gate).every((k) => closureColumns(c, gates[i]).includes(k))).map((g) => `${c.key}@${g}`);
});
t('no register has a closing block that locks nothing its previous block did not', repeatedBlocks.length === 0, repeatedBlocks.join(', '));
t('Supplier & RM Evidence is closed at Gates 4 and 7 only', registerClosureGateIds(cfg('supplierRmEvidence')).join(',') === 'SG04,SG07', registerClosureGateIds(cfg('supplierRmEvidence')).join(','));
t('Vulnerable-User Assessment is closed once, at Gate 2', registerClosureGateIds(cfg('vulnerableUserAssessment')).join(',') === 'SG02', registerClosureGateIds(cfg('vulnerableUserAssessment')).join(','));
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
const anchor = cfg('competitorLandscape');
const members = ['competitorTestingProtocol', 'currentSolutionsStandardOfCare', 'competitorLandscapeSummary'].map(cfg);
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
withRow.registers[members[0].key] = [{ ...(withRow.registers[members[0].key]?.[0] ?? {}), competitor: 'edited' } as never];
t('what the signature attests to includes the members', JSON.stringify(registerClosureContent(withRow, anchor.key, groupGate)) !== before);
t('an ordinary register carries no sections, so its hash is unchanged', registerClosureContent(make(), 'prohibitedIngredients', first)?.sections === undefined);

// --- a page that carries the workbook's own sign-off block (RegisterConfig.closureRoles) -------------------------------------
const needsAnchor = cfg('needsExecutiveBrief');
const targetAnchor = cfg('targetProductProfile');
const needsRoles = ['Prepared by (R&I)', 'Reviewed by (Head of Dept)', 'Independent reviewer'];
const targetRoles = ['Project Manager', 'Head of Department', 'R&I'];
t('Needs is signed by the three roles of its workbook block', JSON.stringify(registerClosureRoles(needsAnchor)) === JSON.stringify(needsRoles));
t('Target Product is signed by the three roles of its workbook block', JSON.stringify(registerClosureRoles(targetAnchor)) === JSON.stringify(targetRoles));
t('their signers are nominated by the Lead', closureSignersAreNominated(needsAnchor) && closureSignersAreNominated(targetAnchor));
t('an ordinary register keeps Review owner + Co-sign, derived from its review owner', JSON.stringify(registerClosureRoles(watch)) === JSON.stringify(['Review owner', 'Co-sign']) && !closureSignersAreNominated(watch));
t('the typed Name + Date sign-off registers are gone', !REGISTER_CONFIGS.some((c) => c.key === 'needsSignOff' || c.key === 'targetProductSignOff'));
const nGate = registerClosureGateIds(needsAnchor)[0];
const n1 = make();
const two = needsRoles.slice(0, 2).map((role) => ({ role, ...signed }));
n1.registerClosures[closureKey(needsAnchor.key, nGate)] = { signOffs: two } as never;
t('Needs is NOT closed with two of its three roles signed', !isRegisterFullyClosed(n1, needsAnchor));
n1.registerClosures[closureKey(needsAnchor.key, nGate)] = { signOffs: needsRoles.map((role) => ({ role, ...signed })) } as never;
t('Needs is closed once all three roles have signed', isRegisterFullyClosed(n1, needsAnchor));
n1.registerClosures[closureKey(needsAnchor.key, nGate)] = { signOffs: [{ role: 'Review owner', ...signed }, { role: 'Co-sign', ...signed }] } as never;
t('the default pair of roles does NOT close a page that names its own', !isRegisterFullyClosed(n1, needsAnchor));
n1.registerClosures[closureKey(needsAnchor.key, nGate)] = { signOffs: [{ role: needsRoles[0], ...signed }] } as never;
t('one standing signature locks the whole Needs page, members included', ['needsResearchQuestions', 'needsLiteratureSearchMethod'].every((k) => registerLocks(n1, cfg(k)).columns.size > 0));

// --- Round 5 question 13: which registers are closed, by whom, and one person is one person ----------------------------------------------
// (a) evidence used in a gate decision is closed; a register no gate reads has no close-out ceremony
const readByNoGate = REGISTER_CONFIGS.filter((c) => !c.closedWith && !c.closureRoles?.length && registerClosureGateIds(c).length === 0);
t('a register no gate reads has no closing gate', readByNoGate.length > 0 && readByNoGate.every((c) => registerApprovalRequirement(c).kind !== 'closure'));
t('...and no gate asks for its closure', REGISTER_CONFIGS.filter((c) => registerClosureGateIds(c).length === 0).every((c) => REGISTER_CONFIGS.length > 0 && ['SG01','SG02','SG03','SG04','SG05','SG06','SG07','SG08','SG09','SG10','SG11','SG12'].every((g) => !requiredRegisterClosures(g).some((r) => r.registerKey === c.key))));
t('a reference sheet nothing reads is not closed', registerClosureGateIds(cfg('templateIndex')).length === 0 && registerApprovalRequirement(cfg('templateIndex')).kind === 'none');
t('a derived view (the Formulation Change Register) is not closed twice', registerClosureGateIds(cfg('formulationChangeRegister')).length === 0);
t('a register with its own approval route is not closed a second time', ['publishedInfoApproval', 'studyProtocolSetup', 'formulationChangeRegister'].every((k) => registerClosureGateIds(cfg(k)).length === 0 && registerApprovalRequirement(cfg(k)).kind === 'own-route'));
t('the watch-lists, evidence read by a gate, are still closed', registerClosureGateIds(cfg('prohibitedIngredients')).length > 0 && registerApprovalRequirement(cfg('prohibitedIngredients')).kind === 'closure');
t('a page with the workbook\'s own sign-off block keeps its closing', registerApprovalRequirement(cfg('needsExecutiveBrief')).kind === 'own-block' && registerClosureGateIds(cfg('needsExecutiveBrief')).length > 0);
t('a member is closed with its page', registerApprovalRequirement(cfg('needsResearchQuestions')).kind === 'member');
// (b) the owner plus an independent reviewer where independence is required, the owner alone elsewhere
t('independence is required at the critical gates', ['SG03', 'SG04', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11'].every(closureNeedsIndependentReview));
t('...and not at the others', ['SG01', 'SG02', 'SG05', 'SG06', 'SG12'].every((g) => !closureNeedsIndependentReview(g)));
t('at a critical gate a register is signed by the owner and the Co-sign', JSON.stringify(registerClosureRoles(watch, 'SG04')) === JSON.stringify(['Review owner', 'Co-sign']));
t('at another gate the owner alone signs', JSON.stringify(registerClosureRoles(cfg('developmentBrief'), 'SG02')) === JSON.stringify(['Review owner']));
const briefGate = registerClosureGateIds(cfg('developmentBrief'))[0];
const b1 = make();
sign(b1, 'developmentBrief', briefGate, false);
t('...so the owner\'s signature alone closes it', isRegisterFullyClosed(b1, cfg('developmentBrief')));
const w1 = make();
sign(w1, 'prohibitedIngredients', 'SG04', false);
t('...but at a critical gate the owner alone does not', !isRegisterFullyClosedAt(w1, cfg('prohibitedIngredients'), 'SG04'));
// (c) one person signing twice is one person
const watchSpec = registerReviewSpec(watch)!;
const ownerKey = registerClosureSignerRole(watchSpec, 'Review owner');
const coKey = registerClosureSignerRole(watchSpec, 'Co-sign');
t('the watch-list has two different roles to resolve (so the test below means something)', ownerKey !== coKey, `${ownerKey} / ${coKey}`);
const people = (owner: string, co: string) => ({ [ownerKey]: owner, [coKey]: co });
const conflictAt = (gate: string, reviewers: Record<string, string>) => closureSignerConflict(watch, gate, reviewers);
t('the owner and the Co-sign being one person is a conflict at a critical gate', conflictAt('SG04', people('Anna', 'Anna')) === 'Anna');
t('...whatever the capitalisation', conflictAt('SG04', people('Anna', ' anna ')) === 'Anna');
t('two different people are not', conflictAt('SG04', people('Anna', 'Binh')) === undefined);
t('nobody assigned is not a conflict (it has its own message)', conflictAt('SG04', {}) === undefined);
t('at a gate that needs no independence there is nothing to conflict', conflictAt('SG02', people('Anna', 'Anna')) === undefined);
t('a page with its own nominated roles is not judged this way', closureSignerConflict(cfg('needsExecutiveBrief'), 'SG02', people('Anna', 'Anna')) === undefined);
// the Sheet Map's wording
const kinds = new Set(REGISTER_CONFIGS.map((c) => registerApprovalRequirement(c).kind));
t('the Sheet Map can name every kind', ['closure', 'own-block', 'own-route', 'member', 'none'].every((k) => kinds.has(k as never)), [...kinds].join(','));
console.log(`   ${REGISTER_CONFIGS.length} registers: ${['closure','own-block','own-route','member','none'].map((k) => `${k} ${REGISTER_CONFIGS.filter((c) => registerApprovalRequirement(c).kind === k).length}`).join(' · ')}`);

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
