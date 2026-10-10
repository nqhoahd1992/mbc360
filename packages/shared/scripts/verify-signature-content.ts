// What a signature is bound to must be a pure function of the DATA, not of the order the database happened to
// return it in. A hash that moves with row order refuses a signature for no reason (it did, once: the 8 Angles
// have no ordering column), and a content definition that counts a derived value makes a row look edited the
// instant it was signed. Pure functions over a hand-built project; no database, no API.
// Run: npm run verify:signature-content
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { phaseSignContent } from '../src/utils/phaseSignContent';
import { gateEvidenceSnapshot } from '../src/utils/gateSnapshot';
import { gateSignOffStaleChanges } from '../src/utils/gateProgress';
import { registerRowCells } from '../src/utils/registerClosureContent';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const content = (p: ProjectData, phase = 1) => JSON.stringify(phaseSignContent(p, phase));
const clone = (p: ProjectData): ProjectData => JSON.parse(JSON.stringify(p));

// --- the phase content ignores the order rows came back in ---------------------------------------------
{
  const p = fresh();
  p.nextActions = [
    { id: 'c3', gateId: 'SG02', description: 'third', status: 'Open', priority: 'Medium' },
    { id: 'c1', gateId: 'SG01', description: 'first', status: 'Open', priority: 'Low' },
    { id: 'c2', gateId: 'SG01', description: 'second', status: 'Open', priority: 'High' },
  ] as never;
  const base = content(p);
  t('the phase content has the 8 Angles', (phaseSignContent(p, 1)?.sections.find((x) => x.title === '8 Angles coverage')?.rows.length ?? 0) > 0);

  const reversedAngles = clone(p);
  reversedAngles.phaseClosures[1].angles.reverse();
  t('the same 8 Angles in a different order give the same content', content(reversedAngles) === base);

  const shuffledActions = clone(p);
  shuffledActions.nextActions = [shuffledActions.nextActions[1], shuffledActions.nextActions[2], shuffledActions.nextActions[0]];
  t('the same Next Actions in a different order give the same content', content(shuffledActions) === base);

  const edited = clone(p);
  edited.phaseClosures[1].angles[0].comments = 'changed';
  t('changing an 8 Angles comment changes the content', content(edited) !== base);

  const gateEdit = clone(p);
  gateEdit.gates[0].notes = 'changed';
  t('changing a gate record changes the content', content(gateEdit) !== base);

  const actionEdit = clone(p);
  actionEdit.nextActions[0].status = 'Closed' as never;
  t('changing a Next Action changes the content', content(actionEdit) !== base);

  const links = clone(p);
  links.phaseClosures[1].keyLinks = { 'Success Criteria Package': 'https://example.com' };
  t('the phase quick links are NOT part of what is signed (SW-22 keeps them editable)', content(links) === base);

  const signed = clone(p);
  signed.phaseClosures[1].signOffs = signed.phaseClosures[1].signOffs.map((s) => ({ ...s, name: 'Somebody', signedByUserId: 'u1', signedAt: '2026-01-01T00:00:00Z' }));
  t('the three signature rows are NOT part of what is signed (signing must not change it)', content(signed) === base);

  t('an unknown phase has no content', phaseSignContent(p, 9) === undefined);
}

// --- a row's signed content leaves out the signature itself and what is derived from it ----------------
{
  const row = { changeId: 'FC-1', changeTitle: 'Reformulated', npSignOff: 'Somebody', npSignOff__userId: 'u1', npSignOff__hash: 'abc', approvedByNp: true };
  const withTick = registerRowCells('formulationChangeRegister', row, 'npSignOff');
  const withoutTick = registerRowCells('formulationChangeRegister', { ...row, approvedByNp: false }, 'npSignOff');
  t('the row content exists for a register that has a signature column', !!withTick);
  t('the column being signed is not part of its own content', !withTick?.columns.some((c) => c.key === 'npSignOff'));
  t('the derived "approved" tick is not part of the content', !withTick?.columns.some((c) => c.key === 'approvedByNp'));
  t('flipping the derived tick does not change the content (signing sets it, so it must not)', JSON.stringify(withTick) === JSON.stringify(withoutTick));
  const edited = registerRowCells('formulationChangeRegister', { ...row, changeTitle: 'Reformulated again' }, 'npSignOff');
  t('editing a real column does change the content', JSON.stringify(edited) !== JSON.stringify(withTick));
  t('an unknown register has no row content', registerRowCells('noSuchRegister', row, 'npSignOff') === undefined);
}

// --- what a standing gate signature locks, and what it leaves open -------------------------------------
// The API refuses a write that introduces a change `gateSignOffStaleChanges` reports. So the rule "the data
// the gate owns is locked, an accepted condition may be carried out, later gates may still contribute" is
// exactly what that function says — pinned here on a hand-built signed gate.
{
  const GATE = 'SG08';
  const signed = (): ProjectData => {
    const p = fresh();
    p.nextActions = [{ id: 'cond-1', gateId: GATE, description: 'carry out the accepted condition', owner: 'A', status: 'Open', priority: 'Medium' }] as never;
    p.gateSignOffs = [
      { gateId: GATE, role: 'Prepared by', signedByUserId: 'u1', signedAt: '2026-01-01T00:00:00Z', snapshot: gateEvidenceSnapshot(p, GATE) } as never,
    ];
    return p;
  };
  const changes = (p: ProjectData) => gateSignOffStaleChanges(p, GATE, undefined, 'Prepared by');

  t('an untouched signed gate reports no change', changes(signed()).length === 0);

  const progressed = signed();
  progressed.nextActions[0].status = 'In Progress' as never;
  progressed.nextActions[0].owner = 'B';
  t('carrying out an accepted condition (status, owner) is allowed under a standing signature', changes(progressed).length === 0, JSON.stringify(changes(progressed)));

  const closed = signed();
  closed.nextActions[0].status = 'Closed' as never;
  t('closing an accepted condition is allowed under a standing signature', changes(closed).length === 0, JSON.stringify(changes(closed)));

  const added = signed();
  added.nextActions.push({ id: 'cond-2', gateId: GATE, description: 'a brand new condition', status: 'Open', priority: 'Medium' } as never);
  t('adding a NEW open condition is a change to what was signed (locked)', changes(added).length > 0);

  const reworded = signed();
  reworded.nextActions[0].description = 'quietly reworded';
  t('rewording an accepted condition is a change to what was signed (locked)', changes(reworded).length > 0);

  const linkEdit = signed();
  linkEdit.gates.find((g) => g.gateId === GATE)!.evidenceLink = 'https://example.com/changed';
  t("changing the gate's evidence link is a change to what was signed (locked)", changes(linkEdit).length > 0);

  const statusEdit = signed();
  statusEdit.gates.find((g) => g.gateId === GATE)!.status = 'In Progress';
  t("changing the gate's stage status is a change to what was signed (locked)", changes(statusEdit).length > 0);

  // The signed content is the SME's list for question 29(1): status, evidence, links, actions. A note, the
  // owner and the due date are how the gate is run, not evidence it is signed on.
  const adminEdit = signed();
  const record = adminEdit.gates.find((g) => g.gateId === GATE)!;
  record.notes = 'a note added after signing';
  record.owner = 'Somebody else';
  record.dueDate = '2030-01-01';
  t('the gate notes, owner and due date are not part of what was signed (they stay editable)', changes(adminEdit).length === 0, JSON.stringify(changes(adminEdit)));

  const laterGate = signed();
  laterGate.nextActions.push({ id: 'later-1', gateId: 'SG10', description: 'work on a later gate', status: 'Open', priority: 'Medium' } as never);
  t('a Next Action on a LATER gate is not part of what this gate signed (later gates still contribute)', changes(laterGate).length === 0, JSON.stringify(changes(laterGate)));
}

console.log(bad === 0 ? '\nAll cases passed.' : `\n${bad} case(s) FAILED.`);
process.exit(bad === 0 ? 0 : 1);
