// Verifies the acknowledgement of auto-generated "not applicable" reasons on CRITICAL
// readiness items (Round 4 question 16; who and which is our reading, R5-Q6).
// Pure functions over a hand-built project on the real rule engine; no database, no API —
// the endpoint's own guards are exercised by `npm run verify:e2e`. Run: npm run verify:ack
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { LEAD_ASSIGNABLE_ROLE_KEYS, REVIEW_ROLES, ownerFunctionWithPeople } from '../src/config/reviewers';
import { PROJECT_WIDE_AUTHORITY, independentFunctionsByGate, roleMatrix } from '../src/utils/roleMatrix';
import { CRITICAL_GATES } from '../src/config/gateSignOff';
import { acknowledgementsVoidedByTargetUsers, evaluateTrigger, gateCheckExemption, foreseeableContactAskedFor, foreseeableContactExcluded, voidedAcknowledgementsMessage } from '../src/utils/gateProgress';
import { acknowledgementBasis } from '../src/utils/readinessAck';
import {
  TRIGGER_DEDICATED_SECTIONS,
  acknowledgementHome,
  gateReadinessChecklist,
  gateBlockers,
  generatedNaEntries,
  hardGateBlockers,
  requirementSectionLockedAsNotApplicable,
  requirementSectionRowsWithData,
  registerLockedAsNotApplicable,
  registerRowsWithData,
  clearRegisterEnteredColumns,
} from '../src/utils/gateProgress';
import { PHASE_CONFIGS } from '../src/config/phases';
import {
  CRITICAL_ITEM_OVERRIDES,
  acknowledgementState,
  isCriticalForAcknowledgement,
  ACKNOWLEDGEMENT_FUNCTIONS,
  holdsRole,
  acknowledgementSlots,
} from '../src/utils/readinessAck';
import type { ProjectData, ReadinessAcknowledgement } from '../src/types';
import { UNSTRUCTURED_PMS_CONDITIONS } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
// A project on which the three answers Round 5 question 1(d) asks a person for have been given as "does not apply": no maternal or
// infant contact is reasonably foreseeable and the conditions the application cannot read do not apply. Without them those triggers
// read "not yet assessed" (tested below), which is not what most of this file is about.
const fresh = (): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  answerAll(p);
  return p;
};
// The six answers, each No with its reason.
function answerAll(p: ProjectData): void {
  p.assessments.foreseeableContactRationale = 'adult product';
  p.assessments.foreseeableContactConfirmedBy = 'Reggie';
  for (const c of UNSTRUCTURED_PMS_CONDITIONS) {
    p.assessments[c.answer] = 'No';
    p.assessments[c.rationale] = 'checked';
    p.assessments[c.confirmer] = 'Reggie';
  }
}
const bareProject = (): ProjectData =>
  createEmptyProject({ id: 'T-2', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const item = (p: ProjectData, gate: string, id: string) => gateReadinessChecklist(p, gate).find((i) => i.id === id);
const ack = (p: ProjectData, gateId: string, itemId: string, by: string, byId: string, n: number, functionKey = 'safety-scientific'): ReadinessAcknowledgement => {
  const rationale = item(p, gateId, itemId)!.acknowledgement!.rationale;
  return {
    id: `a${n}`, gateId, itemId, functionKey, rationale,
    acknowledgedByUserId: byId, acknowledgedByName: by, acknowledgedAs: functionKey,
    acknowledgedAt: `2026-10-13T0${n}:00:00.000Z`,
  };
};

// Critical: on a critical gate. Not critical: not. Both are items that carry a generated N/A on a
// project with no pregnancy/breastfeeding user and a confirmed product form.
const CRIT_GATE = 'SG07';
const CRIT = 'sg07-maternal-caution';
const NON_CRIT_GATE = 'SG05';
const NON_CRIT = 'sg05-product-form';

// --- the classification is the rule we say it is --------------------------------------------------------
{
  const gatesWithTrigger = new Map<string, string[]>();
  for (const [g, items] of Object.entries(GATE_READINESS))
    for (const r of items) if (r.tier === 'Conditional' && r.trigger) gatesWithTrigger.set(g, [...(gatesWithTrigger.get(g) ?? []), r.id]);
  const all = [...gatesWithTrigger.values()].flat();
  t('31 Conditional items with a trigger — the table in question 1 lists exactly these', all.length === 31, `got ${all.length}`);
  t('SG11 has no such item (question 1 says so)', !gatesWithTrigger.has('SG11'));

  // The team's own classification (Round 5 question 1(a), reply of 2026-11-05), one row per item in the order
  // of the table they were sent. true = an N/A rationale on this item needs acknowledgement.
  const TEAM_TABLE: [string, string, boolean][] = [
    ['SG02', 'sg02-product-form-action', false], ['SG02', 'sg02-infant-context', true],
    ['SG03', 'sg03-benchmark', false], ['SG03', 'sg03-reg-claims', true],
    ['SG04', 'sg04-pb-screen', true], ['SG04', 'sg04-allergen', true], ['SG04', 'sg04-infant-suitability', true],
    ['SG05', 'sg05-product-form', false], ['SG05', 'sg05-preservative', true], ['SG05', 'sg05-infant-formula', true],
    ['SG05', 'sg05-costing-must', false],
    ['SG06', 'sg06-infant-packaging', true], ['SG06', 'sg06-market-pack', true],
    ['SG07', 'sg07-bom-matches-pb', true], ['SG07', 'sg07-maternal-caution', true], ['SG07', 'sg07-maternal-infant', true],
    ['SG07', 'sg07-infant-safety', true],
    ['SG08', 'sg08-infant-testing', true], ['SG08', 'sg08-human-study', true],
    ['SG09', 'sg09-pet', true], ['SG09', 'sg09-scaleup', true], ['SG09', 'sg09-infant-testing', true],
    ['SG10', 'sg10-checklist-asean', true], ['SG10', 'sg10-pif-mapped', true], ['SG10', 'sg10-infant-pif', true],
    ['SG10', 'sg10-performance-evidence', true],
    ['SG12', 'sg12-feedback-review', true], ['SG12', 'sg12-pms-baseline', true], ['SG12', 'sg12-pv-pms', true],
    ['SG12', 'sg12-performance', true], ['SG12', 'sg12-change-links', true],
  ];
  t('the team table covers exactly the 31 items', TEAM_TABLE.length === 31 && TEAM_TABLE.every(([g, id]) => gatesWithTrigger.get(g)?.includes(id)), `rows ${TEAM_TABLE.length}`);
  const wrong = TEAM_TABLE.filter(([g, id, want]) => isCriticalForAcknowledgement(g, id) !== want).map(([, id]) => id);
  t('every item is classified exactly as the team answered', wrong.length === 0, wrong.join(', '));
  t('27 of the 31 are critical (the team marked rows 1, 3, 8 and 11 not critical)', TEAM_TABLE.filter(([, , c]) => c).length === 27);
  t('the eleven overrides are the only places the team differs from the gate-based default', Object.keys(CRITICAL_ITEM_OVERRIDES).length === 11);
}

// --- every item whose "not applicable" the system generated links to the block that holds its data ---------
// (a generated-N/A item once shipped without a link, so clicking it in the readiness list did nothing)
{
  const p = fresh();
  const noLink: string[] = [];
  for (const [g, items] of Object.entries(GATE_READINESS))
    for (const r of items)
      if (r.tier === 'Conditional' && r.trigger) {
        const it = item(p, g, r.id);
        if (it?.acknowledgement && !it.link) noLink.push(r.id);
      }
  t('every critical item that carries a generated N/A has a link to where its data lives', noLink.length === 0, noLink.join(', '));
  const ordinary = item(p, 'SG05', 'sg05-product-form');
  t('...and so does a non-critical generated N/A', !!ordinary?.link, JSON.stringify(ordinary));
}

// --- the entries a block shows are exactly the ones the engine waits on, and each has a home ----------------
{
  const p = fresh();
  const fromEngine = new Set<string>();
  for (const g of Object.keys(GATE_READINESS))
    for (const i of gateReadinessChecklist(p, g)) if (i.acknowledgement) fromEngine.add(`${g}|${i.id}`);
  const entries = generatedNaEntries(p);
  const fromEntries = new Set(entries.map((e) => `${e.gateId}|${e.itemId}`));
  const onlyEngine = [...fromEngine].filter((k) => !fromEntries.has(k));
  const onlyEntries = [...fromEntries].filter((k) => !fromEngine.has(k));
  t('the acknowledgement blocks list exactly what the readiness engine waits on', onlyEngine.length === 0 && onlyEntries.length === 0, `engine only: ${onlyEngine.join(', ')} · blocks only: ${onlyEntries.join(', ')}`);
  t('"Maternal and infant-contact assessment" (Gate 7) is among them — it used to be skipped by the engine', fromEngine.has('SG07|sg07-maternal-infant'));
  t('every one of them has a home block to be acknowledged in', entries.every((e) => !!e.home), entries.filter((e) => !e.home).map((e) => e.itemId).join(', '));
  // ... and the same is true of every critical item, whatever the project looks like
  const homeless: string[] = [];
  for (const [g, items] of Object.entries(GATE_READINESS))
    for (const r of items)
      if (r.tier === 'Conditional' && r.trigger && isCriticalForAcknowledgement(g, r.id) && !acknowledgementHome(r.check)) homeless.push(r.id);
  t('every critical item has a home block', homeless.length === 0, homeless.join(', '));
}

// --- a table that exists only for a trigger: read-only while the trigger does not apply, cleared by acknowledging (SW-56) ---
{
  const sections = Object.values(PHASE_CONFIGS).flatMap((ph) => ph.requirementSections).map((x) => x.key);
  t('every dedicated section is a real requirement section', Object.keys(TRIGGER_DEDICATED_SECTIONS).every((k) => sections.includes(k)), Object.keys(TRIGGER_DEDICATED_SECTIONS).filter((k) => !sections.includes(k)).join(', '));

  const p = fresh();
  t('no infant use: the infant tables are locked', Object.keys(TRIGGER_DEDICATED_SECTIONS).every((k) => requirementSectionLockedAsNotApplicable(p, k)));
  t('a section that is not dedicated to a trigger is never locked', !requirementSectionLockedAsNotApplicable(p, 'humanStudy') && !requirementSectionLockedAsNotApplicable(p, 'stabilityRelease') && !requirementSectionLockedAsNotApplicable(p, 'dossierEvidence'));

  // an infant target user: the trigger applies, so the tables open
  const q = fresh();
  const infantUser = (q.checklists['targetUsers'] ?? []).find((i) => /^Infant/.test(i.label));
  if (!infantUser) throw new Error('target user "Infant 0+" not found');
  infantUser.selected = true;
  t('an Infant 0+ target user opens every infant table', Object.keys(TRIGGER_DEDICATED_SECTIONS).every((k) => !requirementSectionLockedAsNotApplicable(q, k)));

  // family use with no confirmed age groups: NOT YET ASSESSED, which is not "does not apply" — the tables stay editable
  const u = fresh();
  const family = (u.checklists['targetUsers'] ?? []).find((i) => i.label === 'Family use');
  if (!family) throw new Error('target user "Family use" not found');
  family.selected = true;
  t('"not yet assessed" does not lock the tables (the answer that decides it may not be in yet)', Object.keys(TRIGGER_DEDICATED_SECTIONS).every((k) => !requirementSectionLockedAsNotApplicable(u, k)));

  // what an acknowledgement would clear
  const rows = p.requirements['infantUseContext'] ?? [];
  t('a fresh table has no data to clear', requirementSectionRowsWithData(p, 'infantUseContext') === 0);
  rows[0].status = 'Completed';
  rows[2].notes = 'typed before';
  const entry = generatedNaEntries(p).find((e) => e.itemId === 'sg02-infant-context');
  t('the entry names the table and counts the rows that hold data', entry?.dedicatedSection?.key === 'infantUseContext' && entry.dedicatedSection.rowsWithData === 2, JSON.stringify(entry?.dedicatedSection));
  t('a block shared with applicable work (Supplier & RM Evidence) still clears nothing', generatedNaEntries(p).find((e) => e.itemId === 'sg04-allergen')?.dedicatedSection === undefined);

  // The Pregnancy / Breastfeeding Caution Limits register IS the maternal pathway (project owner, 2026-11-06): read-only while no
  // maternal target user applies, and acknowledging the generated "not applicable" clears what was entered in it.
  const reg = 'pbCautionLimits';
  const mq = fresh();
  t('the caution register is locked while no maternal user applies', registerLockedAsNotApplicable(mq, reg));
  t('...but the other watch-list is not (it serves every product)', !registerLockedAsNotApplicable(mq, 'prohibitedIngredients'));
  t('a fresh register holds no entered data (seeded statuses are not data)', registerRowsWithData(mq, reg) === 0);
  const regRows = mq.registers[reg] ?? [];
  regRows[0].productStatus = 'Within limit - evidence linked';
  regRows[2].formulaExposure = '0.5 %';
  t('typed values count as data, two rows here', registerRowsWithData(mq, reg) === 2, String(registerRowsWithData(mq, reg)));
  const regEntry = generatedNaEntries(mq).find((e) => e.itemId === 'sg07-maternal-caution');
  t('the entry names the register, says it is one, and counts the rows with data', regEntry?.dedicatedSection?.kind === 'register' && regEntry.dedicatedSection.key === reg && regEntry.dedicatedSection.rowsWithData === 2, JSON.stringify(regEntry?.dedicatedSection));
  const reference = regRows[0].ingredientGroup;
  const wiped = clearRegisterEnteredColumns(reg, regRows);
  t('clearing puts the entered columns back to an untouched row', wiped.rows[0].productStatus === 'Not assessed' && !wiped.rows[2].formulaExposure);
  t('...keeps the workbook reference cells', wiped.rows[0].ingredientGroup === reference && wiped.rows.length === regRows.length);
  t('...and reports what was cleared, for the audit event', wiped.cleared.length === 2 && wiped.cleared[0].was.productStatus === 'Within limit - evidence linked');
  const maternal = fresh();
  const pregnancy = (maternal.checklists['targetUsers'] ?? []).find((i) => i.label === 'Pregnancy');
  if (pregnancy) pregnancy.selected = true;
  t('a maternal target user unlocks it again', !registerLockedAsNotApplicable(maternal, reg));
}

// --- the readiness list marks every critical item, whatever state it is in -------------------------------------------
{
  const p = fresh();
  const flagged: string[] = [];
  const wrong: string[] = [];
  for (const [g, reqs] of Object.entries(GATE_READINESS)) {
    const list = gateReadinessChecklist(p, g);
    for (const r of reqs) {
      const should = r.tier === 'Conditional' && !!r.trigger && isCriticalForAcknowledgement(g, r.id);
      const it = list.find((i) => i.id === r.id);
      if (it?.critical) flagged.push(r.id);
      if (it && !!it.critical !== should) wrong.push(r.id);
    }
  }
  t('27 items carry the Critical mark in the readiness list', flagged.length === 27, `got ${flagged.length}`);
  t('...and it is on exactly the items the team classified as critical, and on no other', wrong.length === 0, wrong.join(', '));
}

// --- a critical item's generated N/A needs an acknowledgement; a non-critical one does not ---------------
{
  const p = fresh();
  const c = item(p, CRIT_GATE, CRIT);
  t('critical auto-N/A carries an acknowledgement block', !!c?.acknowledgement, JSON.stringify(c));
  t('…not yet acknowledged', c?.acknowledgement?.state === 'missing');
  t('…and BLOCKS (not satisfied, hard)', c?.satisfied === false && c?.hardBlock === true && !c?.advisory);
  t('…it appears in hardGateBlockers, which Proceed with Conditions does NOT clear', hardGateBlockers(p, CRIT_GATE).some((b) => b.id === CRIT));
  t('…and in gateBlockers', gateBlockers(p, CRIT_GATE).some((b) => b.id === CRIT));
  t('the label says what is being waited for', /must acknowledge this reason/.test(c?.label ?? ''));

  const n = item(p, NON_CRIT_GATE, NON_CRIT);
  t('a NON-critical auto-N/A is unchanged: passes by itself, no acknowledgement block', n?.satisfied === true && !n?.acknowledgement, JSON.stringify(n));
}

// --- acknowledging it ------------------------------------------------------------------------------------
{
  const p = fresh();
  p.readinessAcknowledgements = [ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1)];
  const c = item(p, CRIT_GATE, CRIT);
  t('acknowledged: satisfied and no longer a blocker', c?.satisfied === true && c?.hardBlock === false && c?.acknowledgement?.state === 'acknowledged');
  t('…and says by whom', c?.acknowledgement?.by === 'Sekar');
  t('…no longer in hardGateBlockers', !hardGateBlockers(p, CRIT_GATE).some((b) => b.id === CRIT));
  t('an acknowledgement of one item does not satisfy another', item(p, 'SG04', 'sg04-pb-screen')?.satisfied === false);
  t('…nor the same item id at another gate', item(p, 'SG04', CRIT) === undefined);
}

// --- one entry per item, edited in place; there is no way to record a refusal --------------------------------
{
  const p = fresh();
  const row = ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1);
  p.readinessAcknowledgements = [row];
  t('one row per (gate, item): the item reads it', item(p, CRIT_GATE, CRIT)?.acknowledgement?.by === 'Sekar');

  // The next holder of the function overwrites the same row (the audit trail, not extra rows, keeps what it said before).
  Object.assign(row, { acknowledgedByName: 'Chris', acknowledgedByUserId: 'u-chris' });
  t('edited in place by the next holder: the item reads the new name', item(p, CRIT_GATE, CRIT)?.acknowledgement?.by === 'Chris' && p.readinessAcknowledgements.length === 1);

  const c = item(p, CRIT_GATE, CRIT);
  t('an acknowledged item is satisfied and says who acknowledged it', c?.satisfied === true && c?.acknowledgement?.state === 'acknowledged' && c?.acknowledgement?.by === 'Chris', JSON.stringify(c));
  t('acknowledgementState agrees', acknowledgementState(p, CRIT_GATE, CRIT, row.rationale).state === 'acknowledged');

  // No row at all: the only other thing an item can be. It blocks, and nothing says anyone refused.
  p.readinessAcknowledgements = [];
  const none = item(p, CRIT_GATE, CRIT);
  t('with no acknowledgement the item is missing and blocks (Proceed with Conditions does not clear it)', none?.acknowledgement?.state === 'missing' && none?.satisfied === false && hardGateBlockers(p, CRIT_GATE).some((b) => b.id === CRIT));
  t('there is no "rejected" state any more', !('rejected' as string === (none?.acknowledgement?.state as string)) && acknowledgementState(p, CRIT_GATE, CRIT, row.rationale).state === 'missing');

  // Acknowledgement of OLD wording is stale like any other.
  p.readinessAcknowledgements = [{ ...row, rationale: 'older wording' }];
  t('an acknowledgement of wording that no longer exists is stale', item(p, CRIT_GATE, CRIT)?.acknowledgement?.state === 'stale');
}

// --- it counts only while the reason it acknowledged is still the reason -----------------------------------
{
  const p = fresh();
  const stale = { ...ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1), rationale: 'an older wording of the reason' };
  p.readinessAcknowledgements = [stale];
  const c = item(p, CRIT_GATE, CRIT);
  t('an assessment of different wording is STALE and blocks again', c?.acknowledgement?.state === 'stale' && c?.satisfied === false && c?.hardBlock === true);
  t('…and the label says it has to be acknowledged again', /must be acknowledged again/.test(c?.label ?? ''));
  t('acknowledgementState agrees', acknowledgementState(p, CRIT_GATE, CRIT, 'something else').state === 'stale');

  // The facts change: a pregnancy target user is ticked, so the item APPLIES and the generated
  // reason no longer exists — an old acknowledgement must not leave the real item looking closed.
  const q = fresh();
  q.readinessAcknowledgements = [ack(q, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1)];
  const row = (q.checklists['targetUsers'] ?? []).find((i) => i.label === 'Pregnancy');
  if (!row) throw new Error('target user "Pregnancy" not found');
  row.selected = true;
  const applied = item(q, CRIT_GATE, CRIT);
  t('once the item APPLIES, the acknowledgement no longer closes it (it is judged on the real evidence)', !!applied && applied.satisfied === false && !applied.acknowledgement, JSON.stringify(applied));
}

// --- the overrides are the one place the team's answer lands -------------------------------------------------
{
  const p = fresh();
  CRITICAL_ITEM_OVERRIDES[CRIT] = false;
  t('override false: the item stops needing an acknowledgement', !item(p, CRIT_GATE, CRIT)?.acknowledgement && item(p, CRIT_GATE, CRIT)?.satisfied === true);
  delete CRITICAL_ITEM_OVERRIDES[CRIT];
  CRITICAL_ITEM_OVERRIDES[NON_CRIT] = true;
  t('override true: a non-critical-gate item starts needing one', !!item(p, NON_CRIT_GATE, NON_CRIT)?.acknowledgement);
  delete CRITICAL_ITEM_OVERRIDES[NON_CRIT];
  t('removing the overrides restores the default', !item(p, NON_CRIT_GATE, NON_CRIT)?.acknowledgement);
}

// --- who acknowledges: the function the review team names, held by a named person on the project ---------------
{
  // The team's table, row by row (Round 5 question 1(a), "Acknowledgement function"). Each inner array is one thing that
  // has to be acknowledged; any holder of the keys inside it may do so. Where the answer is conditional or uses "/", the
  // reading is ours [ASSUMPTION: R5-Q6] and is spelled out in readinessAck.ts.
  const QM = 'quality-microbiology', QP = 'quality-post-market', QC = 'quality-change-control';
  const S = 'safety-scientific', R = 'regulatory', Q = 'quality', TC = 'technical-claims', TCR = 'technical-claims-reviewer', HSR = 'human-study-reviewer', SSR = 'safety-study-reviewer', M = 'manufacturing', RI = 'ri';
  const TEAM_FUNCTIONS: Record<string, string[][]> = {
    'sg02-infant-context': [[S]], 'sg03-reg-claims': [[R]], 'sg04-pb-screen': [[S]], 'sg04-allergen': [[S], [R]],
    'sg04-infant-suitability': [[S]], 'sg05-preservative': [[QM]], 'sg05-infant-formula': [[S]],
    'sg06-infant-packaging': [[S], [Q]], 'sg06-market-pack': [[R]],
    'sg07-bom-matches-pb': [[S]], 'sg07-maternal-caution': [[S]], 'sg07-maternal-infant': [[S]], 'sg07-infant-safety': [[S]],
    'sg08-infant-testing': [[SSR]], 'sg08-human-study': [[HSR]],
    'sg09-pet': [[QM]], 'sg09-scaleup': [[Q], [M, RI]], 'sg09-infant-testing': [[Q], [S]],
    'sg10-checklist-asean': [[R]], 'sg10-pif-mapped': [[R]], 'sg10-infant-pif': [[S], [R]], 'sg10-performance-evidence': [[TCR]],
    'sg12-feedback-review': [[QP]], 'sg12-pms-baseline': [[QP]], 'sg12-pv-pms': [[S], [R]], 'sg12-performance': [[Q], [TC]], 'sg12-change-links': [[QC]],
  };
  const critical = Object.entries(GATE_READINESS).flatMap(([g, reqs]) => reqs.filter((r) => r.tier === 'Conditional' && !!r.trigger && isCriticalForAcknowledgement(g, r.id)).map((r) => r.id));
  t('the function table has exactly the 27 critical items', critical.length === 27 && critical.every((id) => TEAM_FUNCTIONS[id]) && Object.keys(TEAM_FUNCTIONS).length === 27, `critical ${critical.length}, table ${Object.keys(TEAM_FUNCTIONS).length}`);
  const wrongFn = critical.filter((id) => JSON.stringify(ACKNOWLEDGEMENT_FUNCTIONS[id]) !== JSON.stringify(TEAM_FUNCTIONS[id]));
  t('every item names exactly the functions the team answered', wrongFn.length === 0, wrongFn.join(', '));
  const knownKeys = new Set(REVIEW_ROLES.map((r) => r.key));
  t('every function named is a role a project can assign', Object.values(ACKNOWLEDGEMENT_FUNCTIONS).flat(2).every((k) => knownKeys.has(k)));
  t('...and none is required at creation except the area roles R&I, Quality and Regulatory (a project may leave the other functions Unassigned)', Object.values(ACKNOWLEDGEMENT_FUNCTIONS).flat(2).filter((k) => !REVIEW_ROLES.find((r) => r.key === k)?.optional).every((k) => ['ri', 'quality', 'regulatory'].includes(k)));

  // A qualified name is its own function, worded exactly as the team wrote it (not plain Quality).
  // (the slots depend only on the item, so they are read directly: a fresh project may not generate these items' N/A)
  const labelOf = (itemId: string, gate: string) => acknowledgementSlots(fresh(), gate, itemId, 'x').map((x) => x.label).join(' + ');
  t('Preservative strategy reads "Quality / microbiology reviewer"', labelOf('sg05-preservative', 'SG05') === 'Quality / microbiology reviewer', labelOf('sg05-preservative', 'SG05'));
  t('Preservative efficacy status reads "Quality / microbiology reviewer"', labelOf('sg09-pet', 'SG09') === 'Quality / microbiology reviewer', labelOf('sg09-pet', 'SG09'));
  t('Baseline post-market surveillance reads "Quality / post-market reviewer"', labelOf('sg12-pms-baseline', 'SG12') === 'Quality / post-market reviewer', labelOf('sg12-pms-baseline', 'SG12'));
  t('Change-control links reads "Quality / change-control reviewer"', labelOf('sg12-change-links', 'SG12') === 'Quality / change-control reviewer', labelOf('sg12-change-links', 'SG12'));
  t('plain Quality is still its own function (Quality with Safety)', labelOf('sg09-infant-testing', 'SG09') === 'Quality + Safety / Scientific Review', labelOf('sg09-infant-testing', 'SG09'));
  t('the Quality holder is not one of those who acknowledge a microbiology item (only the specialist is)', !ACKNOWLEDGEMENT_FUNCTIONS['sg05-preservative'].flat().includes('quality'));
  t('Quality, Packaging / Artwork and Regulatory are the area roles themselves (no second optional field)', !REVIEW_ROLES.some((r) => ['quality-function', 'packaging-artwork', 'regulatory-function'].includes(r.key)) && REVIEW_ROLES.find((r) => r.key === 'regulatory')?.label === 'Regulatory' && REVIEW_ROLES.find((r) => r.key === 'quality')?.label === 'Quality' && REVIEW_ROLES.find((r) => r.key === 'packaging')?.label === 'Packaging / Artwork');
  t('the four specialists name their parent function', ['quality-microbiology', 'quality-post-market', 'quality-change-control'].every((k) => REVIEW_ROLES.find((r) => r.key === k)?.parent === 'quality') && REVIEW_ROLES.find((r) => r.key === 'safety-study-reviewer')?.parent === 'safety-scientific');

  // One function: Gate 2's infant-use context is Safety's.
  const p = fresh();
  const g = 'SG02', id = 'sg02-infant-context';
  let c = item(p, g, id);
  t('Gate 2 infant-use context waits for ONE function: Safety / Scientific Review', c?.acknowledgement?.slots.length === 1 && c.acknowledgement.slots[0].label === 'Safety / Scientific Review');
  t('nobody holds Safety: the slot is Unassigned (empty holders) and the item blocks', c?.acknowledgement?.slots[0].holders.length === 0 && c.satisfied === false && c.hardBlock === true);
  t('the label names the function, not a phase sign-off', /Safety \/ Scientific Review must acknowledge/.test(c?.label ?? '') && !/Reviewed by/.test(c?.label ?? ''));
  p.identity.reviewers = { 'safety-scientific': 'Sekar' };
  c = item(p, g, id);
  t('once someone holds Safety the slot names them', c?.acknowledgement?.slots[0].holders[0]?.name === 'Sekar' && c.satisfied === false);
  t('...an acknowledgement given as a DIFFERENT function does not count', (() => { const q = fresh(); q.identity.reviewers = { 'safety-scientific': 'Sekar', quality: 'Quynh' }; q.readinessAcknowledgements = [ack(q, g, id, 'Quynh', 'u-q', 1, 'quality')]; return item(q, g, id)?.satisfied === false; })());
  p.readinessAcknowledgements = [ack(p, g, id, 'Sekar', 'u-sekar', 1, 'safety-scientific')];
  c = item(p, g, id);
  t('acknowledged as Safety: satisfied, says by whom', c?.satisfied === true && c.acknowledgement?.state === 'acknowledged' && c.acknowledgement.by === 'Sekar');
  t('...and leaves hardGateBlockers', !hardGateBlockers(p, g).some((b) => b.id === id));

  // Two functions: both conclusions are recorded.
  const q = fresh();
  const g7 = 'SG10';
  // sg10-infant-pif needs Safety AND Regulatory; it only generates an N/A when the infant trigger does not apply.
  const twin = item(q, g7, 'sg10-infant-pif');
  t('a two-function item has two slots', twin?.acknowledgement?.slots.length === 2, JSON.stringify(twin?.acknowledgement?.slots.map((x) => x.label)));
  q.identity.reviewers = { 'safety-scientific': 'Sekar', regulatory: 'Reggie' };
  q.readinessAcknowledgements = [ack(q, g7, 'sg10-infant-pif', 'Sekar', 'u-sekar', 1, 'safety-scientific')];
  let tw = item(q, g7, 'sg10-infant-pif');
  t('only Safety acknowledged: the item still blocks and says Regulatory is waiting', tw?.satisfied === false && tw.acknowledgement?.slots.find((x) => x.label === 'Regulatory')?.state === 'missing');
  q.readinessAcknowledgements.push(ack(q, g7, 'sg10-infant-pif', 'Reggie', 'u-reggie', 2, 'regulatory'));
  tw = item(q, g7, 'sg10-infant-pif');
  t('both acknowledged: satisfied, and both names are recorded', tw?.satisfied === true && /Sekar/.test(tw.acknowledgement?.by ?? '') && /Reggie/.test(tw.acknowledgement?.by ?? ''));

  // Three reviewer titles are each their OWN function, worded as the team wrote them (nothing says they are the nearest
  // existing function; when the team says so, merge them then).
  const e = fresh();
  t('"Safety / study reviewer" is its own function, not Safety', labelOf('sg08-infant-testing', 'SG08') === 'Safety / study reviewer', labelOf('sg08-infant-testing', 'SG08'));
  t('"Authorised human-study reviewer" is its own function, not Clinical / Study Coordinator', labelOf('sg08-human-study', 'SG08') === 'Authorised human-study reviewer', labelOf('sg08-human-study', 'SG08'));
  t('"Technical claims reviewer" is its own function, not Technical Claims', labelOf('sg10-performance-evidence', 'SG10') === 'Technical claims reviewer', labelOf('sg10-performance-evidence', 'SG10'));
  e.identity.reviewers = { 'safety-scientific': 'Sekar', 'clinical-study': 'Stu' };
  e.readinessAcknowledgements = [ack(e, 'SG08', 'sg08-infant-testing', 'Sekar', 'u-sekar', 1, 'safety-scientific')];
  t('...so Safety alone does not acknowledge "Safety / study reviewer"', item(e, 'SG08', 'sg08-infant-testing')?.satisfied === false);
  e.identity.reviewers = { 'safety-study-reviewer': 'Stu' };
  e.readinessAcknowledgements = [ack(e, 'SG08', 'sg08-infant-testing', 'Stu', 'u-stu', 2, 'safety-study-reviewer')];
  t('...and the person holding that exact function does', item(e, 'SG08', 'sg08-infant-testing')?.satisfied === true);

  // The Lead, an administrator and the phase's Reviewed by have no standing of their own.
  const h = fresh();
  h.identity.projectLead = 'Lena';
  const row = h.phaseClosures[3].signOffs.find((x) => x.role === 'Reviewed by');
  if (row) { row.assignedToUserId = 'u-lena'; row.assignedToName = 'Lena'; }
  const slot = item(h, 'SG07', 'sg07-maternal-caution')?.acknowledgement?.slots[0];
  t('the Lead and the phase "Reviewed by" are NOT substituted for an unassigned function', slot?.holders.length === 0);

  // Re-assigning moves who may acknowledge; the earlier row stays until it goes stale.
  const m = fresh();
  m.identity.reviewers = { 'safety-scientific': 'Sekar' };
  m.readinessAcknowledgements = [ack(m, 'SG07', 'sg07-maternal-caution', 'Sekar', 'u-sekar', 1)];
  m.identity.reviewers = { 'safety-scientific': 'Chris' };
  t('re-assigning Safety changes who is named...', item(m, 'SG07', 'sg07-maternal-caution')?.acknowledgement?.slots[0].holders[0]?.name === 'Chris');
  t('...and leaves the earlier acknowledgement standing until the facts change', item(m, 'SG07', 'sg07-maternal-caution')?.satisfied === true);
}

// --- Round 5 question 37: an Owner cell names a FUNCTION; a similar job title is never taken for it ----------------
{
  const people = { quality: 'Sankar', packaging: 'Lily', ri: 'George' };
  t('Quality is the Quality area role itself — a person, never Unassigned', ownerFunctionWithPeople('Quality', people) === 'Quality — Sankar', ownerFunctionWithPeople('Quality', people));
  t('Packaging and Artwork are the Packaging / Artwork area role', ownerFunctionWithPeople('Packaging', people) === 'Packaging — Lily' && ownerFunctionWithPeople('Artwork', people) === 'Artwork — Lily');
  const tech = { formulation: 'Tuan' };
  t('Formulation and NPD both read as the Formulation role', ownerFunctionWithPeople('Formulation', tech) === 'Formulation — Tuan' && ownerFunctionWithPeople('NPD', tech) === 'Formulation — Tuan');
  t('the four area labels are the workbook\'s own words', ['formulation|Formulation', 'quality-gmp|Quality & GMP', 'raw-material|Raw Material Operations', 'supply-chain|Supply Chain'].every((p) => REVIEW_ROLES.find((r) => r.key === p.split('|')[0])?.label === p.split('|')[1]));
  t('"Formulation / NPD" names the Formulation role once', ownerFunctionWithPeople('Formulation / NPD', tech) === 'Formulation — Tuan', ownerFunctionWithPeople('Formulation / NPD', tech));
  t('"NPD (Tuan) / Project owner" style joint cells keep every other function', ownerFunctionWithPeople('R&I / NPD', { ri: 'George', formulation: 'Tuan' }) === 'R&I — George / Formulation — Tuan');
  t('Sales & Marketing is a role of its own, not the project Lead', REVIEW_ROLES.find((r) => r.key === 'sales-marketing')?.label === 'Sales & Marketing' && !REVIEW_ROLES.some((r) => r.label === 'Project Lead'));
  // Project owner is its own role, named by the Lead — not the Project Manager and not the project Lead.
  const po = REVIEW_ROLES.find((r) => r.key === 'project-owner');
  t('Project owner is a required review-area role with no seeded account', !!po && !po.optional && !po.workbookName && po.label === 'Project owner');
  t('the Owner cell reads the Project owner', ownerFunctionWithPeople('Project owner', { 'project-owner': 'Olga' }) === 'Project owner — Olga');
  t('...and is Unassigned, never the Project Manager, when nobody is named (a project from before the field)', ownerFunctionWithPeople('Project owner', { 'project-manager': 'Chris' }) === 'Project owner — Unassigned');
  t('the Lead may assign the functions and the Project owner after creation, not the other areas', LEAD_ASSIGNABLE_ROLE_KEYS.includes('project-owner') && LEAD_ASSIGNABLE_ROLE_KEYS.includes('safety-scientific') && !LEAD_ASSIGNABLE_ROLE_KEYS.includes('quality') && !LEAD_ASSIGNABLE_ROLE_KEYS.includes('regulatory'));
  // Who holds a role: an assignment carries the account, a role named on the Create form carries only the name.
  t('holding a role named with an account is decided by the account', holdsRole({ userId: 'u1', name: 'Sekar' }, { id: 'u1', displayName: 'Someone else' }) && !holdsRole({ userId: 'u1', name: 'Sekar' }, { id: 'u2', displayName: 'Sekar' }));
  t('a role named on the Create form (a name only) is held by the person of that name, case-insensitive', holdsRole({ userId: null, name: ' Quynh ' }, { id: 'u9', displayName: 'quynh' }) && !holdsRole({ name: 'Quynh' }, { id: 'u9', displayName: 'Someone' }));
  t('a function nobody holds says Unassigned (Safety)', ownerFunctionWithPeople('Safety', {}) === 'Safety — Unassigned', ownerFunctionWithPeople('Safety', {}));
  t('R&I keeps the nominated R&I reviewer', ownerFunctionWithPeople('R&I', people) === 'R&I — George');
  t('a joint Owner cell names every function, each with its own holder or Unassigned', ownerFunctionWithPeople('R&I / Safety', people) === 'R&I — George / Safety — Unassigned', ownerFunctionWithPeople('R&I / Safety', people));
  t('"Claims" is left as written: it could be Technical or Regulatory Claims', ownerFunctionWithPeople('Claims', people) === 'Claims');
}

// --- the authorised role matrix is generated from what the rules use, and cannot disagree with it -------------------
{
  const p = fresh();
  p.identity.reviewers = { regulatory: 'Reggie', 'safety-scientific': 'Sekar' };
  const rows = roleMatrix(p);
  const row = (key: string) => rows.find((r) => r.key === key)!;
  t('one row per role a project can name, in the form\'s order', rows.length === REVIEW_ROLES.length && rows.every((r, i) => r.key === REVIEW_ROLES[i].key));
  t('the people on the project show beside their role; a role nobody holds has none (Unassigned)', row('regulatory').holder === 'Reggie' && row('safety-scientific').holder === 'Sekar' && row('finance').holder === undefined);
  t('required-at-creation is exactly the area roles', rows.every((r) => r.requiredAtCreation === !REVIEW_ROLES.find((x) => x.key === r.key)?.optional));
  t('a specialist names the function it sits inside', row('quality-microbiology').kind === 'specialist' && row('quality-microbiology').parentLabel === 'Quality' && row('safety-study-reviewer').parentLabel === 'Safety / Scientific Review');
  const listed = new Set(rows.flatMap((r) => r.acknowledges.map((a) => a.gateId + '|' + a.itemId)));
  t('every one of the 27 critical items is listed under at least one role', listed.size === 27, String(listed.size));
  t('Gate 5 Preservative strategy is listed under the microbiology specialist and NOT under the Quality holder', row('quality-microbiology').acknowledges.some((a) => a.itemId === 'sg05-preservative') && !row('quality').acknowledges.some((a) => a.itemId === 'sg05-preservative'));
  t('a two-function item names the other function ("Safety with Regulatory")', (row('safety-scientific').acknowledges.find((a) => a.itemId === 'sg12-pv-pms')?.togetherWith ?? []).join() === 'Regulatory');
  t('an either-or item names the alternative (Manufacturing / R&I)', (row('manufacturing').acknowledges.find((a) => a.itemId === 'sg09-scaleup')?.orInstead ?? []).join() === 'R&I');
  t('market approvals: Regulatory and Project Manager only', rows.filter((r) => r.alsoAuthorised.some((s) => s.includes('market'))).map((r) => r.key).sort().join() === 'project-manager,regulatory');
  t('the Project Manager co-signs every sheet the others own or co-review', row('project-manager').sheetsCoSigned >= row('regulatory').sheetsOwned);
  t('the project-wide authority list names the seven rules and each says who may', PROJECT_WIDE_AUTHORITY.length === 7 && PROJECT_WIDE_AUTHORITY.every((a) => a.action && a.whoMay));
  t('the independent function is listed for exactly the critical gates', independentFunctionsByGate().map((g) => g.gateId).join() === CRITICAL_GATES.join() && independentFunctionsByGate().every((g) => g.function !== '—'));
}

// --- a target user that would void an acknowledgement cannot be ticked while it stands (project owner, 2026-11-06) --------
{
  const p = fresh();
  p.identity.reviewers = { 'safety-scientific': 'Sekar' };
  const maternal = [{ label: 'Pregnancy', selected: true }];
  t('with nothing acknowledged, ticking a pregnancy user is free', acknowledgementsVoidedByTargetUsers(p, maternal).length === 0);
  p.readinessAcknowledgements = [
    ack(p, 'SG04', 'sg04-pb-screen', 'Sekar', 'u-s', 1),
    ack(p, 'SG07', 'sg07-bom-matches-pb', 'Sekar', 'u-s', 2),
    ack(p, 'SG07', 'sg07-maternal-caution', 'Sekar', 'u-s', 3),
  ];
  const voided = acknowledgementsVoidedByTargetUsers(p, maternal);
  t('once the maternal items are acknowledged, ticking a pregnancy user would void all three', voided.length === 3, JSON.stringify(voided.map((v) => v.itemId)));
  t('...breastfeeding and postpartum are the same', acknowledgementsVoidedByTargetUsers(p, [{ label: 'Breastfeeding', selected: true }]).length === 3 && acknowledgementsVoidedByTargetUsers(p, [{ label: 'Postpartum', selected: true }]).length === 3);
  t('...an unrelated target user is not blocked', acknowledgementsVoidedByTargetUsers(p, [{ label: 'General adult', selected: true }]).length === 0);
  t('...the message names the items and who acknowledged them', /Withdraw the acknowledgement first/.test(voidedAcknowledgementsMessage(voided)) && /Sekar/.test(voidedAcknowledgementsMessage(voided)));
  p.readinessAcknowledgements = [];
  t('withdrawing them frees the target user again', acknowledgementsVoidedByTargetUsers(p, maternal).length === 0);
}

// --- an acknowledgement stands on the facts it was given against (Round 5 question 1(c)) --------------------------------
{
  const mk = (): ProjectData => {
    const p = fresh();
    p.identity.reviewers = { 'safety-scientific': 'Sekar' };
    p.identity.markets = ['Vietnam'];
    p.formulaVersion = 'F1.0';
    p.readinessAcknowledgements = [{ ...ack(p, 'SG07', 'sg07-maternal-caution', 'Sekar', 'u-s', 1), basis: acknowledgementBasis(p) }];
    return p;
  };
  const state = (p: ProjectData) => item(p, 'SG07', 'sg07-maternal-caution')?.acknowledgement;
  t('an acknowledgement given against the current facts stands', state(mk())?.state === 'acknowledged');

  const reworded = mk();
  reworded.readinessAcknowledgements[0].rationale = 'an earlier wording of the same reason';
  t('a change to the wording alone keeps it standing (editorial), and says so', state(reworded)?.state === 'acknowledged' && !!state(reworded)?.slots[0].reworded);

  const market = mk();
  market.identity.markets = ['Vietnam', 'Australia'];
  t('a market added makes it stale, because the facts changed', state(market)?.state === 'stale' && state(market)?.slots[0].staleBecause === 'facts' && item(market, 'SG07', 'sg07-maternal-caution')?.satisfied === false);

  const minor = mk();
  minor.formulaVersion = 'F1.1';
  t('a MINOR formula version does not void it (a passed gate must not be silently reopened)', state(minor)?.state === 'acknowledged');

  const major = mk();
  major.formulaVersion = 'F2.0';
  t('a MAJOR formula version does', state(major)?.state === 'stale' && state(major)?.slots[0].staleBecause === 'facts');

  const ages = mk();
  ages.assessments.familyUseAgeGroups = 'Infant 0+';
  t('the family-use age groups are part of the facts', state(ages)?.state === 'stale');

  const stamped = mk();
  const g7 = stamped.gates.find((g) => g.gateId === 'SG07');
  if (g7) { g7.status = 'Complete'; g7.decision = 'Proceed'; }
  stamped.identity.markets = ['Vietnam', 'Australia'];
  t('once the gate is stamped passed, a later market does not void what was acknowledged', state(stamped)?.state === 'acknowledged');

  const legacy = mk();
  delete legacy.readinessAcknowledgements[0].basis;
  t('an acknowledgement from before the basis existed is judged by its wording, as it always was', state(legacy)?.state === 'acknowledged');
  legacy.readinessAcknowledgements[0].rationale = 'something else';
  t('...and goes stale when that wording differs, for the wording and not the facts', state(legacy)?.state === 'stale' && state(legacy)?.slots[0].staleBecause === 'wording');

  const remarked = mk();
  const reread = acknowledgementBasis(remarked);
  t('the basis is the same string for the same facts, whatever the order they were entered in', reread === acknowledgementBasis({ ...remarked, identity: { ...remarked.identity, markets: [...remarked.identity.markets].reverse() } }));
}

// --- maternal and infant contact is ONE written reason; surveillance exclusions need a person's answer (Round 5 question 1(d)) ----
{
  const p = bareProject();
  t('no maternal or infant user ticked and no reason: NOT assessed (a missing tick is not an exclusion)', evaluateTrigger(p, 'skincareForTwo') === 'notAssessed' && evaluateTrigger(p, 'infantContact') === 'notAssessed');
  p.assessments.foreseeableContactRationale = '   ';
  t('a blank reason is no reason', evaluateTrigger(p, 'skincareForTwo') === 'notAssessed' && foreseeableContactExcluded(p) === false);
  p.assessments.foreseeableContactRationale = 'adult product';
  t(
    'a written reason nobody has confirmed is a claim, not an exclusion: still NOT assessed',
    evaluateTrigger(p, 'skincareForTwo') === 'notAssessed' && evaluateTrigger(p, 'infantContact') === 'notAssessed' && foreseeableContactExcluded(p) === false,
  );
  p.assessments.foreseeableContactConfirmedBy = 'Reggie';
  t('a written reason, confirmed: neither pathway applies', evaluateTrigger(p, 'skincareForTwo') === 'doesNotApply' && evaluateTrigger(p, 'infantContact') === 'doesNotApply');
  p.assessments.foreseeableContactConfirmedBy = '   ';
  t('a blank confirmer is no confirmer', foreseeableContactExcluded(p) === false);

  const ticked = bareProject();
  const pregnancy = (ticked.checklists['targetUsers'] ?? []).find((i) => i.label === 'Pregnancy');
  if (pregnancy) pregnancy.selected = true;
  ticked.assessments.foreseeableContactRationale = 'kept but hidden';
  t('a ticked pregnancy user applies whatever the reason says', evaluateTrigger(ticked, 'skincareForTwo') === 'applies');
  t('...and the question is no longer asked', foreseeableContactAskedFor(ticked) === false);
  t('...so a hidden reason is not consulted for the infant pathway either: it does not apply from the ticks', evaluateTrigger(ticked, 'infantContact') === 'doesNotApply');
  ticked.assessments.foreseeableContactRationale = '';
  t('...and a hidden blank does not block it either', evaluateTrigger(ticked, 'infantContact') === 'doesNotApply');

  const i = bareProject();
  const infant = (i.checklists['targetUsers'] ?? []).find((x) => x.label === 'Infant 0+');
  if (infant) infant.selected = true;
  t('an infant user ticked applies the infant pathway and asks no question', evaluateTrigger(i, 'infantContact') === 'applies' && foreseeableContactAskedFor(i) === false);
  t('...and with only an infant ticked there is no maternal contact to assess: does not apply, not "not assessed"', evaluateTrigger(i, 'skincareForTwo') === 'doesNotApply');

  const unticked = bareProject();
  const adult = (unticked.checklists['targetUsers'] ?? []).find((x) => x.label !== 'Pregnancy' && x.label !== 'Infant 0+');
  if (adult) adult.selected = true;
  t('an unrelated user ticked still asks the question', foreseeableContactAskedFor(unticked) === true);

  const family = bareProject();
  const fam = (family.checklists['targetUsers'] ?? []).find((x) => x.label === 'Family use');
  if (fam) fam.selected = true;
  family.assessments.foreseeableContactRationale = 'adult product';
  family.assessments.foreseeableContactConfirmedBy = 'Reggie';
  t('a Family use product with no confirmed age groups is still not assessed, whatever else is answered', evaluateTrigger(family, 'infantContact') === 'notAssessed');

  const pms = bareProject();
  t('nothing the application can read applies and nobody assessed the rest: enhanced surveillance NOT assessed', evaluateTrigger(pms, 'pvPmsRequired') === 'notAssessed');
  for (const c of UNSTRUCTURED_PMS_CONDITIONS.slice(0, 3)) {
    pms.assessments[c.answer] = 'No';
    pms.assessments[c.rationale] = 'checked';
    pms.assessments[c.confirmer] = 'Reggie';
  }
  t('three of the four conditions answered: still NOT assessed (one answer cannot stand for four)', evaluateTrigger(pms, 'pvPmsRequired') === 'notAssessed');
  const last = UNSTRUCTURED_PMS_CONDITIONS[3];
  pms.assessments[last.answer] = 'No';
  t('the fourth answered No with no reason: NOT assessed', evaluateTrigger(pms, 'pvPmsRequired') === 'notAssessed');
  pms.assessments[last.rationale] = 'checked';
  t('the fourth answered No with a reason but nobody confirming it: NOT assessed', evaluateTrigger(pms, 'pvPmsRequired') === 'notAssessed');
  pms.assessments[last.confirmer] = 'Reggie';
  t('all four No with reasons and confirmed: does not apply', evaluateTrigger(pms, 'pvPmsRequired') === 'doesNotApply');
  pms.assessments[UNSTRUCTURED_PMS_CONDITIONS[1].answer] = 'Yes';
  t('any one Yes applies, with or without a reason', evaluateTrigger(pms, 'pvPmsRequired') === 'applies');
  const partial = bareProject();
  partial.assessments[UNSTRUCTURED_PMS_CONDITIONS[2].answer] = 'Yes';
  t('a Yes applies even while the others are unanswered', evaluateTrigger(partial, 'pvPmsRequired') === 'applies');
  const ng = acknowledgementsVoidedByTargetUsers(ackedProject(), [], { foreseeableContactRationale: '' });
  t('while the maternal items are acknowledged, deleting the reason is held until the acknowledgement is withdrawn', ng.length === 3, JSON.stringify(ng.map((x) => x.itemId)));
  t('...and rewording the reason is not held', acknowledgementsVoidedByTargetUsers(ackedProject(), [], { foreseeableContactRationale: 'reworded' }).length === 0);
}
function ackedProject(): ProjectData {
  const p = fresh();
  p.identity.reviewers = { 'safety-scientific': 'Sekar' };
  p.readinessAcknowledgements = [
    ack(p, 'SG04', 'sg04-pb-screen', 'Sekar', 'u-s', 1),
    ack(p, 'SG07', 'sg07-bom-matches-pb', 'Sekar', 'u-s', 2),
    ack(p, 'SG07', 'sg07-maternal-caution', 'Sekar', 'u-s', 3),
  ];
  return p;
}

// --- trigger corrections from Round 5 question 1(d) -------------------------------------------------------------------
{
  const p = fresh();
  t('no development / change type recorded: the competitor-review trigger is NOT assessed (it used to pass on its own)', evaluateTrigger(p, 'newOrRepositionedProject') === 'notAssessed');
  const nature = (p.checklists['projectNature'] ?? [])[0];
  if (nature) nature.selected = true;
  t('a recorded development / change type makes it apply', evaluateTrigger(p, 'newOrRepositionedProject') === 'applies');
  p.assessments.administrativeOnly = 'Yes';
  p.assessments.administrativeOnlyConfirmedBy = 'Reggie';
  t('Yes and a confirmer but no reason is not an exemption (Round 4 question 11: nothing in the second list of that answer changes)', evaluateTrigger(p, 'newOrRepositionedProject') === 'applies');
  p.assessments.administrativeOnlyRationale = 'Spelling correction; no claim or meaning changes';
  t('confirmed administrative-only by a named person, with the reason, is a recorded answer that it does not apply', evaluateTrigger(p, 'newOrRepositionedProject') === 'doesNotApply');
  p.assessments.administrativeOnlyConfirmedBy = '';
  t('...and without the confirmer it applies again', evaluateTrigger(p, 'newOrRepositionedProject') === 'applies');
  // The Gate 03 row that carries the benchmark review is not required while the exemption stands, and nothing else changes.
  const row = (q: ProjectData) => q.gateChecks.find((c) => c.gate === '03' && c.check === 'Concept direction and benchmark/competitor review recorded');
  const q = fresh();
  t('before any exemption the benchmark row is required: Product concept is not met', item(q, 'SG03', 'sg03-concept')?.satisfied === false && gateCheckExemption(q, '03', row(q)!.check) === undefined);
  q.assessments.administrativeOnly = 'Yes';
  q.assessments.administrativeOnlyRationale = 'Spelling correction; no claim or meaning changes';
  t('Yes with a reason but no confirmer: the row is still required', item(q, 'SG03', 'sg03-concept')?.satisfied === false && gateCheckExemption(q, '03', row(q)!.check) === undefined);
  q.assessments.administrativeOnlyConfirmedBy = 'Reggie';
  t('confirmed: the row is exempt, with the reason to show', !!gateCheckExemption(q, '03', row(q)!.check) && /Reggie/.test(gateCheckExemption(q, '03', row(q)!.check) ?? ''));
  t('...and Product concept and the benchmark item are both met without the row being touched', item(q, 'SG03', 'sg03-concept')?.satisfied === true && item(q, 'SG03', 'sg03-benchmark')?.satisfied === true && row(q)!.done === false);
  t('...but only that row is exempt', gateCheckExemption(q, '03', 'Claim/benefit areas selected and evidence route identified') === undefined);
  q.assessments.administrativeOnlyConfirmedBy = '';
  t('withdrawing the confirmation brings the row back', item(q, 'SG03', 'sg03-concept')?.satisfied === false && gateCheckExemption(q, '03', row(q)!.check) === undefined);
  const bare = fresh();
  bare.assessments.administrativeOnly = 'Yes';
  bare.assessments.administrativeOnlyRationale = 'Spelling correction; no claim or meaning changes';
  bare.assessments.administrativeOnlyConfirmedBy = 'Reggie';
  t('...even with no type recorded', evaluateTrigger(bare, 'newOrRepositionedProject') === 'doesNotApply');

  const m = fresh();
  t('nothing classified: the preservative trigger is not assessed', evaluateTrigger(m, 'microbiologicallySusceptible') === 'notAssessed');
  m.formulaProperties.microSusceptibility = 'Anhydrous';
  t('an anhydrous formula with NO documented conclusion is still not assessed (no waiver)', evaluateTrigger(m, 'microbiologicallySusceptible') === 'notAssessed');
  m.formulaProperties.microRationale = '  ';
  t('...a blank conclusion is no conclusion', evaluateTrigger(m, 'microbiologicallySusceptible') === 'notAssessed');
  m.formulaProperties.microRationale = 'No water phase, aw < 0.3; challenge test not required';
  t('...with the microbiological-risk conclusion written, the waiver stands', evaluateTrigger(m, 'microbiologicallySusceptible') === 'doesNotApply');
  const sp = fresh();
  sp.formulaProperties.microSusceptibility = 'Self-preserving';
  t('the other waivers are unchanged by this correction', evaluateTrigger(sp, 'microbiologicallySusceptible') === 'doesNotApply');
  const su = fresh();
  su.formulaProperties.microSusceptibility = 'Susceptible';
  t('a susceptible formula applies', evaluateTrigger(su, 'microbiologicallySusceptible') === 'applies');
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
