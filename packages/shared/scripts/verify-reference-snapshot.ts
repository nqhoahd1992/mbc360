// SW-52 / Round 5 question 1(d): a passed gate is judged by the company lists as they stood when it passed.
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateReadinessChecklist, referenceAsOfGate } from '../src/utils/gateProgress';
import { canonicalJson, referenceNotices, sameReference } from '../src/utils/referenceSnapshot';
import { RM_RISK_FLAGS } from '../src/types';
import type { ProjectData, ProjectReferenceData, RawMaterialRisk } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra?: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const risk = (rmCode: string, flags: string[], revision: number): RawMaterialRisk =>
  ({ id: rmCode, rmCode, flags, revision, updatedAt: '2026-01-01T00:00:00.000Z' }) as unknown as RawMaterialRisk;
const refWith = (rm: RawMaterialRisk[]): ProjectReferenceData => ({ marketProfiles: [], rmRisk: rm, claimsLibrary: [] });

function project(): ProjectData {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  p.bom = [{ rmCode: 'RM-1', ingredient: 'x', percent: 1 } as never];
  return p;
}
const gate = (p: ProjectData, id: string, status: string, decision?: string) => {
  const g = p.gates.find((x) => x.gateId === id)!;
  g.status = status as never;
  g.decision = decision as never;
};
// Whether the item reads as "not triggered": the lists say no material carries a flag. (It can still wait for an acknowledgement.)
const allergen = (p: ProjectData) => {
  const item = gateReadinessChecklist(p, 'SG04').find((i) => i.id === 'sg04-allergen');
  return { satisfied: !!item?.label.includes('not triggered for this project') };
};

// canonical form is independent of key order and ignores undefined
t('the same data in another key order compares equal', canonicalJson({ a: 1, b: { c: 2, d: undefined } }) === canonicalJson({ b: { c: 2 }, a: 1 }));

{
  const flagged = refWith([risk('RM-1', [RM_RISK_FLAGS[0]], 2)]);
  const clean = refWith([risk('RM-1', [], 1)]);
  const p = project();
  p.reference = flagged;
  t('live lists: a flagged material blocks the allergen item', allergen(p)?.satisfied === false);

  p.gateReference = { SG04: clean };
  t('an OPEN gate ignores its snapshot and reads the live lists', allergen(p)?.satisfied === false);
  t('...referenceAsOfGate returns the project untouched', referenceAsOfGate(p, 'SG04') === p);

  gate(p, 'SG04', 'Complete', 'Proceed');
  t('a STAMPED gate reads the lists it passed on, whatever the live lists say now', allergen(p)?.satisfied === true);
  t('...the live reference is not altered', p.reference === flagged);

  gate(p, 'SG04', 'Complete', 'Proceed with Conditions');
  t('Proceed with Conditions is stamped too', allergen(p)?.satisfied === true);

  gate(p, 'SG04', 'Not Started', undefined);
  t('a gate that was reopened (Backtrack) reads the live lists again', allergen(p)?.satisfied === false);

  gate(p, 'SG04', 'Complete', 'Hold');
  t('Hold is not a pass', allergen(p)?.satisfied === false);

  gate(p, 'SG04', 'Complete', 'Proceed');
  t('another gate\'s snapshot does not apply to this one', referenceAsOfGate({ ...p, gateReference: { SG05: clean } }, 'SG04') === p || referenceAsOfGate({ ...p, gateReference: { SG05: clean } }, 'SG04').reference === flagged);
}

{
  // notices: only what touches this project
  const p = project();
  p.identity.markets = ['Vietnam'];
  const then: ProjectReferenceData = {
    marketProfiles: [
      { id: 'm1', market: 'Vietnam', revision: 1 },
      { id: 'm2', market: 'Japan', revision: 1 },
    ] as never,
    rmRisk: [risk('RM-1', [], 1), risk('RM-9', [], 1)],
    claimsLibrary: [],
  };
  const now: ProjectReferenceData = {
    marketProfiles: [
      { id: 'm1', market: 'Vietnam', revision: 2 },
      { id: 'm2', market: 'Japan', revision: 2 },
    ] as never,
    rmRisk: [risk('RM-1', [RM_RISK_FLAGS[0]], 2), risk('RM-9', [RM_RISK_FLAGS[0]], 2), risk('RM-2', [], 1)],
    claimsLibrary: [],
  };
  p.reference = now;
  p.gateReference = { SG04: then };
  const n = referenceNotices(p);
  t('one notice for the gate', n.length === 1 && n[0].gateId === 'SG04');
  const subjects = n[0]?.changes.map((c) => `${c.dataset}:${c.subject}:${c.kind}`) ?? [];
  t('a changed material in this project is reported', subjects.includes('Raw Material Risk Overlay:RM-1:changed'), JSON.stringify(subjects));
  t('a changed market of this project is reported', subjects.includes('Market profile:Vietnam:changed'), JSON.stringify(subjects));
  t('a material the project does not use is not', !subjects.some((s) => s.includes('RM-9') || s.includes('RM-2')), JSON.stringify(subjects));
  t('a market the project is not in is not', !subjects.some((s) => s.includes('Japan')), JSON.stringify(subjects));
  t('no differing snapshot, no notice', referenceNotices({ ...p, gateReference: undefined }).length === 0);
  t('identical lists compare equal', sameReference(now, JSON.parse(JSON.stringify(now))));
}

if (bad > 0) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log('\nall passed');
