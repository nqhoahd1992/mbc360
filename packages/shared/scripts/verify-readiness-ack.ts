// Verifies the acknowledgement of auto-generated "not applicable" reasons on CRITICAL
// readiness items (Round 4 question 16; who and which is our reading, R5-Q6).
// Pure functions over a hand-built project on the real rule engine; no database, no API —
// the endpoint's own guards are exercised by `npm run verify:e2e`. Run: npm run verify:ack
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { GATES } from '../src/config/gates';
import { gateReadinessChecklist, hardGateBlockers, gateBlockers } from '../src/utils/gateProgress';
import {
  CRITICAL_ITEM_OVERRIDES,
  acknowledgementState,
  isCriticalForAcknowledgement,
  responsibleReviewer,
} from '../src/utils/readinessAck';
import type { ProjectData, ReadinessAcknowledgement } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const item = (p: ProjectData, gate: string, id: string) => gateReadinessChecklist(p, gate).find((i) => i.id === id);
const ack = (p: ProjectData, gateId: string, itemId: string, by: string, byId: string, n: number): ReadinessAcknowledgement => {
  const rationale = item(p, gateId, itemId)!.acknowledgement!.rationale;
  return {
    id: `a${n}`, gateId, itemId, rationale, outcome: 'Acknowledged',
    acknowledgedByUserId: byId, acknowledgedByName: by, acknowledgedAs: 'Reviewed by — Phase 3',
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
  const critical = [...gatesWithTrigger.entries()].flatMap(([g, ids]) => ids.filter((id) => isCriticalForAcknowledgement(g, id)));
  t('18 of them are critical under the gate-based reading (the number question 1 states)', critical.length === 18, `got ${critical.length}`);
  t('SG11 has no such item (question 1 says so)', !gatesWithTrigger.has('SG11'));
  t('no override ships by default (the table is the whole rule until the team answers)', Object.keys(CRITICAL_ITEM_OVERRIDES).length === 0);
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
  t('the label says what is being waited for', /responsible reviewer must acknowledge/.test(c?.label ?? ''));

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

// --- one entry per item, edited in place; the reviewer may also record that they do NOT acknowledge it ----
{
  const p = fresh();
  const row = ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1);
  p.readinessAcknowledgements = [row];
  t('one row per (gate, item): the item reads it', item(p, CRIT_GATE, CRIT)?.acknowledgement?.by === 'Sekar');

  // The new reviewer overwrites the same row (the audit trail, not extra rows, keeps what it said before).
  Object.assign(row, { acknowledgedByName: 'Chris', acknowledgedByUserId: 'u-chris' });
  t('edited in place by the next reviewer: the item reads the new name', item(p, CRIT_GATE, CRIT)?.acknowledgement?.by === 'Chris' && p.readinessAcknowledgements.length === 1);

  // "Not acknowledged": a recorded decision that blocks, and says why.
  Object.assign(row, { outcome: 'Not acknowledged', comment: 'a pregnancy user is planned for the next release' });
  const c = item(p, CRIT_GATE, CRIT);
  t('NOT acknowledged: state is rejected and the item blocks', c?.acknowledgement?.state === 'rejected' && c?.satisfied === false && c?.hardBlock === true, JSON.stringify(c));
  t('...it is in hardGateBlockers (Proceed with Conditions does not clear it)', hardGateBlockers(p, CRIT_GATE).some((b) => b.id === CRIT));
  t('...and the label carries the reason the reviewer gave', /pregnancy user is planned/.test(c?.label ?? '') && c?.acknowledgement?.comment === 'a pregnancy user is planned for the next release');
  t('acknowledgementState agrees', acknowledgementState(p, CRIT_GATE, CRIT, row.rationale).state === 'rejected');

  // Edited back to acknowledged, in place.
  Object.assign(row, { outcome: 'Acknowledged', comment: undefined });
  t('edited back to Acknowledged: the item passes again', item(p, CRIT_GATE, CRIT)?.satisfied === true && item(p, CRIT_GATE, CRIT)?.acknowledgement?.state === 'acknowledged');

  // A rejection of OLD wording is stale like any other assessment.
  Object.assign(row, { outcome: 'Not acknowledged', comment: 'x', rationale: 'older wording' });
  t('a rejection of wording that no longer exists is stale, not rejected', item(p, CRIT_GATE, CRIT)?.acknowledgement?.state === 'stale');
}

// --- it counts only while the reason it acknowledged is still the reason -----------------------------------
{
  const p = fresh();
  const stale = { ...ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1), rationale: 'an older wording of the reason' };
  p.readinessAcknowledgements = [stale];
  const c = item(p, CRIT_GATE, CRIT);
  t('an assessment of different wording is STALE and blocks again', c?.acknowledgement?.state === 'stale' && c?.satisfied === false && c?.hardBlock === true);
  t('…and the label says it has to be assessed again', /assess it again/.test(c?.label ?? ''));
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

// --- who is the responsible reviewer ---------------------------------------------------------------------------
{
  const p = fresh();
  const phase3 = GATES.find((g) => g.id === 'SG07')!.phase;
  const r0 = responsibleReviewer(p, 'SG07');
  t('responsible reviewer is resolved through the gate\'s PHASE', r0?.phase === phase3, JSON.stringify(r0));
  t('nobody nominated: no user id', r0?.userId === undefined);
  const row = p.phaseClosures[phase3].signOffs.find((s) => s.role === 'Reviewed by');
  if (!row) throw new Error('Reviewed by row not found');
  row.assignedToUserId = 'u-sekar';
  row.assignedToName = 'Sekar';
  const r1 = responsibleReviewer(p, 'SG07');
  t('nominated "Reviewed by" of that phase is the reviewer', r1?.userId === 'u-sekar' && r1?.name === 'Sekar');
  t('a gate of a DIFFERENT phase reads that phase\'s nomination, not this one\'s', responsibleReviewer(p, 'SG04')?.userId === undefined);
  const other = p.phaseClosures[phase3].signOffs.find((s) => s.role === 'Prepared by');
  if (other) {
    other.assignedToUserId = 'u-someone';
    t('only the "Reviewed by" row counts (not Prepared by)', responsibleReviewer(p, 'SG07')?.userId === 'u-sekar');
  }
  // Re-nominating moves the right to acknowledge but must not touch what was already recorded.
  p.readinessAcknowledgements = [ack(p, CRIT_GATE, CRIT, 'Sekar', 'u-sekar', 1)];
  row.assignedToUserId = 'u-chris';
  row.assignedToName = 'Chris';
  t('re-nominating changes who may acknowledge…', responsibleReviewer(p, 'SG07')?.userId === 'u-chris');
  t('…and leaves the earlier assessment standing until the new reviewer edits it', item(p, CRIT_GATE, CRIT)?.acknowledgement?.by === 'Sekar' && item(p, CRIT_GATE, CRIT)?.satisfied === true);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
