// Verifies software rules SW-5 and SW-20 (docs/rules/Software_Rules.md): every register column is
// owned by the gate that ENTERS it and freezes when that gate passes; a register cannot gain or
// lose a row once any of its columns is frozen; a gate that only READS a register keeps nothing
// open; and a gate's signature records the readiness data, accountable for what it and the earlier
// gates own, informational for what later gates own. Pure functions over hand-built rows and a
// hand-built set of passed gates, plus one project whose gates really pass on the real engine —
// no database, no API. Run: npm run verify:freeze
import { GATE_READINESS } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS, getRegisterConfig } from '../src/config/registers';
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateRefHighestGateId, isGatePassed } from '../src/utils/gateProgress';
import { gateActionStates, gateEvidenceSnapshot, snapshotChanges, snapshotLaterChanges } from '../src/utils/gateSnapshot';
import { columnOwnerGateIds } from '../src/utils/registerColumnGates';
import { cellFrozenBy, passedGateSet, registerFreezeViolations, rowsFrozenBy } from '../src/utils/registerRowLocks';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) bad++;
};
const upTo = (n: number): ReadonlySet<string> => new Set(Array.from({ length: n }, (_, i) => `SG${String(i + 1).padStart(2, '0')}`));

const claims = getRegisterConfig('claimEvidenceTraceability')!; // enters at 03 / 05 / 08 / 10, read by 12
const supplier = getRegisterConfig('supplierRmEvidence')!; // enters at 04 / 07, only re-checked at 10 / 11
const watch = getRegisterConfig('prohibitedIngredients')!; // fixed register, 04 / 07
const stability = getRegisterConfig('stabilityRelease')!; // 09 / 11
const claim: RegisterRow = { claimId: 'C-1', approvedWording: 'wording', claimCategory: 'Cosmetic', mechanism: 'm', evidenceGrade: 'A', revisionRoute: 'r' };

// --- who owns a column ----------------------------------------------------------------------
t('claim ledger: a declared column gate is its owner', columnOwnerGateIds('claimEvidenceTraceability', 'evidenceGrade').join() === 'SG08');
t('claim ledger: mechanism is entered at Gate 5, revisionRoute at Gate 10',
  columnOwnerGateIds('claimEvidenceTraceability', 'mechanism').join() === 'SG05' && columnOwnerGateIds('claimEvidenceTraceability', 'revisionRoute').join() === 'SG10');
t('a column with no declared gate belongs to the LAST gate of the register (supplier notes -> SG07)', columnOwnerGateIds('supplierRmEvidence', 'notes').join() === 'SG07');
t('supplier: the conclusion columns are Gate 7\'s, the screening columns Gate 4\'s',
  columnOwnerGateIds('supplierRmEvidence', 'approvedForUse').join() === 'SG07' && columnOwnerGateIds('supplierRmEvidence', 'evidenceStatus').join() === 'SG07' &&
    columnOwnerGateIds('supplierRmEvidence', 'allergenStatement').join() === 'SG04');
t('a gate that only reads a register owns none of its columns (supplier is read at 10 and 11)',
  supplier.columns.every((c) => !columnOwnerGateIds('supplierRmEvidence', c.key).some((g) => g === 'SG10' || g === 'SG11')));
t('stability: releaseDecision is Gate 11\'s, the results Gate 9\'s',
  columnOwnerGateIds('stabilityRelease', 'releaseDecision').join() === 'SG11' && columnOwnerGateIds('stabilityRelease', 'result').join() === 'SG09');
t('watch-list: review columns Gate 4, productStatus Gate 7',
  columnOwnerGateIds('prohibitedIngredients', 'reviewerAssessment').join() === 'SG04' && columnOwnerGateIds('prohibitedIngredients', 'productStatus').join() === 'SG07');

// --- cells freeze when their gate passes ------------------------------------------------------
t('claim: a Gate 3 column is open before SG03 passes', cellFrozenBy(upTo(2), claims, 'approvedWording') === undefined);
t('claim: ...and frozen by SG03 once it has passed', cellFrozenBy(upTo(3), claims, 'approvedWording') === 'SG03');
t('claim: the Gate 8 / Gate 5 / Gate 10 columns of the same row are still open', ['evidenceGrade', 'mechanism', 'revisionRoute'].every((c) => cellFrozenBy(upTo(3), claims, c) === undefined));
t('claim: after SG08 the Gate 8 column is frozen too, the Gate 10 one is not',
  cellFrozenBy(upTo(8), claims, 'evidenceGrade') === 'SG08' && cellFrozenBy(upTo(8), claims, 'revisionRoute') === undefined);
t('supplier: allergenStatement frozen after SG04, approvedForUse still open until SG07',
  cellFrozenBy(upTo(4), supplier, 'allergenStatement') === 'SG04' && cellFrozenBy(upTo(6), supplier, 'approvedForUse') === undefined && cellFrozenBy(upTo(7), supplier, 'approvedForUse') === 'SG07');
t('supplier: Gates 10 and 11 passing change nothing that was not already frozen', cellFrozenBy(upTo(11), supplier, 'rmCode') === 'SG04');
t('a register with no gate never freezes a cell', cellFrozenBy(upTo(12), getRegisterConfig('testReportIndex')!, 'notes') === undefined);

// --- rows ---------------------------------------------------------------------------------------
t('claim: rows are free before any column is frozen', rowsFrozenBy(upTo(2), claims) === undefined);
t('claim: once SG03 has passed, rows cannot be added or removed', rowsFrozenBy(upTo(3), claims) === 'SG03');
t('supplier: rows frozen from SG04 (a new material after screening means going back)', rowsFrozenBy(upTo(4), supplier) === 'SG04' && rowsFrozenBy(upTo(3), supplier) === undefined);
t('a fixed register never gains or loses a row', rowsFrozenBy(upTo(12), watch) === undefined);
t('stability: rows frozen from SG09', rowsFrozenBy(upTo(9), stability) === 'SG09' && rowsFrozenBy(upTo(8), stability) === undefined);

// --- what a save may do -------------------------------------------------------------------------
const edit = (patch: Record<string, string>): RegisterRow[] => [{ ...claim, ...patch }];
t('editing a frozen cell is refused and names the gate', registerFreezeViolations(upTo(3), claims, [claim], edit({ approvedWording: 'changed' })).some((v) => v.includes('SG03')));
t('editing an open cell of the same row is fine', registerFreezeViolations(upTo(3), claims, [claim], edit({ evidenceGrade: 'B' })).length === 0);
t('adding a row after SG03 is refused', registerFreezeViolations(upTo(3), claims, [claim], [claim, { claimId: 'C-2' }]).some((v) => v.startsWith('Rows cannot be added')));
t('removing a row after SG03 is refused', registerFreezeViolations(upTo(3), claims, [claim], []).some((v) => v.startsWith('Rows cannot be removed')));
t('adding and removing rows is fine before SG03', registerFreezeViolations(upTo(2), claims, [claim], [claim, { claimId: 'C-2' }]).length === 0 && registerFreezeViolations(upTo(2), claims, [claim], []).length === 0);
t('an unchanged save is always fine', registerFreezeViolations(upTo(12), claims, [claim], [{ ...claim }]).length === 0);

// --- a project whose gates really pass on the real engine ---------------------------------------
// The readiness lists of SG01-SG03 are cut down to their sign-off item IN THIS PROCESS ONLY so those
// gates can pass on decision, register closing and (below) signatures alone.
const originalSg03 = [...GATE_READINESS.SG03];
for (const g of ['SG01', 'SG02', 'SG03']) GATE_READINESS[g] = GATE_READINESS[g].filter((r) => r.check.kind === 'gateSignedOff');
const live = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
t('empty project: nothing has passed', passedGateSet(live).size === 0);
for (const g of ['SG01', 'SG02', 'SG03']) {
  const record = live.gates.find((x) => x.gateId === g)!;
  record.status = 'Complete';
  record.decision = 'Proceed';
}
const signedAt = { signedByUserId: 'u', signedAt: '2026-01-01T00:00:00Z' };
for (const cfg of REGISTER_CONFIGS) {
  if (['SG01', 'SG02', 'SG03'].includes(gateRefHighestGateId(cfg.gate) ?? '')) {
    live.registerClosures[cfg.key] = { signOffs: [{ role: 'Review owner', ...signedAt }, { role: 'Co-sign', ...signedAt }] } as never;
  }
}
// Three signatures per gate, each carrying the snapshot of the moment they were given.
const sign = (project: ProjectData, gates: string[]) => {
  for (const g of gates) {
    const snapshot = gateEvidenceSnapshot(project, g);
    for (const role of ['Prepared by', 'Reviewed by', 'Approved by'] as const) {
      project.gateSignOffs.push({ gateId: g, role, ...signedAt, name: 'n', decision: 'Proceed', snapshot } as never);
    }
  }
};
sign(live, ['SG01', 'SG02', 'SG03']);
const passedLive = passedGateSet(live);
t('SG01-SG03 really pass on the real engine', ['SG01', 'SG02', 'SG03'].every((g) => passedLive.has(g)) && isGatePassed(live, 'SG03'));
t('real engine: the claim ledger freezes its Gate 3 columns and its rows, not its Gate 8 column',
  cellFrozenBy(passedLive, claims, 'approvedWording') === 'SG03' && rowsFrozenBy(passedLive, claims) === 'SG03' && cellFrozenBy(passedLive, claims, 'evidenceGrade') === undefined);
t('real engine: a save that adds a claim is refused, one that fills the Gate 8 column is not',
  registerFreezeViolations(passedLive, claims, [claim], [claim, { claimId: 'C-2' }]).length > 0 && registerFreezeViolations(passedLive, claims, [claim], edit({ evidenceGrade: 'B' })).length === 0);

// --- signatures: accountable for what this gate and earlier gates own ------------------------------
// SG03's real readiness list is put back so its snapshot digests the registers it reads.
GATE_READINESS.SG03 = originalSg03;
const stale = (gate: string, before: ReturnType<typeof gateEvidenceSnapshot>, after: ProjectData) =>
  snapshotChanges(before, gateEvidenceSnapshot(after, gate), gateActionStates(after, gate));
const ledger = (rows: RegisterRow[]): ProjectData => ({ ...live, registers: { ...live.registers, claimEvidenceTraceability: rows } });
const baseline = ledger([claim]);
const sg03 = gateEvidenceSnapshot(baseline, 'SG03');
t('the SG03 snapshot digests the claim ledger (the test is not vacuous)', !!sg03.registerCells && 'claimEvidenceTraceability' in sg03.registerCells);
t('a Gate 3 column changing makes the Gate 3 signature stale', stale('SG03', sg03, ledger(edit({ approvedWording: 'changed' }))).some((c) => c.startsWith('Register changed')));
t('a Gate 8 / 5 / 10 column changing does NOT make it stale (a later gate is still to finish it)',
  ['evidenceGrade', 'mechanism', 'revisionRoute'].every((c) => stale('SG03', sg03, ledger(edit({ [c]: 'x' }))).length === 0));
t('...but the change is reported as information',
  snapshotLaterChanges(sg03, gateEvidenceSnapshot(ledger(edit({ evidenceGrade: 'B' })), 'SG03')).some((c) => c.includes('later gate')));
t('deleting the claim before SG03 passes makes the signature stale', stale('SG03', sg03, ledger([])).length > 0);
t('nothing reported when nothing changed', stale('SG03', sg03, baseline).length === 0 && snapshotLaterChanges(sg03, gateEvidenceSnapshot(baseline, 'SG03')).length === 0);

// A signature taken before the cells were recorded is still compared on the whole register.
const legacy = { ...sg03 } as Partial<typeof sg03>;
delete legacy.registerCells;
delete legacy.registerLater;
t('a legacy snapshot still notices ANY column of the register changing', stale('SG03', legacy as typeof sg03, ledger(edit({ evidenceGrade: 'B' }))).some((c) => c.startsWith('Register changed')));
t('...is not stale when nothing changed and reports no later-gate information',
  stale('SG03', legacy as typeof sg03, baseline).length === 0 && snapshotLaterChanges(legacy as typeof sg03, gateEvidenceSnapshot(ledger(edit({ evidenceGrade: 'B' })), 'SG03')).length === 0);

// A later gate approves the data of the earlier ones: Gate 7 is accountable for a Gate 4 column.
const withWatch = (patch: Record<string, string>): ProjectData => ({
  ...live,
  registers: { ...live.registers, prohibitedIngredients: (live.registers.prohibitedIngredients ?? []).map((r, i) => (i === 0 ? { ...r, ...patch } : r)) },
});
const sg04 = gateEvidenceSnapshot(live, 'SG04');
const sg07 = gateEvidenceSnapshot(live, 'SG07');
t('Gate 7 is accountable for a Gate 4 column (reviewerAssessment): changing it makes the Gate 7 signature stale',
  stale('SG07', sg07, withWatch({ reviewerAssessment: 'Critical' })).some((c) => c.startsWith('Register changed')));
t('Gate 4 records productStatus, which Gate 7 owns: a change is information, not staleness',
  stale('SG04', sg04, withWatch({ productStatus: 'Prohibited - remove' })).length === 0 &&
    snapshotLaterChanges(sg04, gateEvidenceSnapshot(withWatch({ productStatus: 'Prohibited - remove' }), 'SG04')).length > 0);
t('Gate 7 is accountable for the productStatus it owns', stale('SG07', sg07, withWatch({ productStatus: 'Prohibited - remove' })).some((c) => c.startsWith('Register changed')));

// --- a checklist section that spans gates ('08-09') is signed at the LAST gate of its list -------------
t('testingFamilies (gate 08-09) is in the Gate 9 snapshot and not in the Gate 8 one',
  'testingFamilies' in gateEvidenceSnapshot(live, 'SG09').checklists && !('testingFamilies' in gateEvidenceSnapshot(live, 'SG08').checklists));
t('a single-gate checklist (targetUsers, gate 02) is in its own snapshot', 'targetUsers' in gateEvidenceSnapshot(live, 'SG02').checklists);
const sg09 = gateEvidenceSnapshot(live, 'SG09');
const ticked = { ...live, checklists: { ...live.checklists, testingFamilies: (live.checklists.testingFamilies ?? []).map((i, n) => (n === 0 ? { ...i, selected: true } : i)) } };
t('ticking a testing family makes the Gate 9 signature stale', stale('SG09', sg09, ticked).some((c) => c.startsWith('Checklist changed')));
const noSection = { ...sg09, checklists: Object.fromEntries(Object.entries(sg09.checklists).filter(([k]) => k !== 'testingFamilies')) };
t('a signature that never recorded the section is not stale because the section is now in scope',
  stale('SG09', noSection, live).filter((c) => c.startsWith('Checklist')).length === 0);

// --- everything else readiness reads: BOM, costing, identity, assessments, markets -------------------------
const line = { rmCode: 'RM-9', inciName: 'Aqua', percent: 100, fromCosmetri: false, reconciled: false } as never;
const withBom: ProjectData = { ...live, bom: [line] };
const snapAt = (g: string) => gateEvidenceSnapshot(live, g);
t('Gate 5 owns the Formula BOM: changing it makes the Gate 5 signature stale', stale('SG05', snapAt('SG05'), withBom).includes('Formula BOM changed'));
t('Gate 7 is accountable for the BOM too (Gate 5 is earlier)', stale('SG07', snapAt('SG07'), withBom).includes('Formula BOM changed'));
t('Gate 4 reads the BOM but Gate 5 owns it: information only',
  stale('SG04', snapAt('SG04'), withBom).length === 0 && snapshotLaterChanges(snapAt('SG04'), gateEvidenceSnapshot(withBom, 'SG04')).some((c) => c.startsWith('Formula BOM changed')));
const withTrack: ProjectData = { ...live, marketTracks: [{ market: 'Vietnam', regulatoryStatus: 'Approved' } as never] };
t('market tracks have no gate lock and no owner: information only at Gate 10',
  stale('SG10', snapAt('SG10'), withTrack).length === 0 && snapshotLaterChanges(snapAt('SG10'), gateEvidenceSnapshot(withTrack, 'SG10')).some((c) => c.startsWith('Market tracking changed')));
const withScope: ProjectData = { ...live, identity: { ...live.identity, initialScope: 'a new scope' } };
t('Gate 1 owns the identity fields it reads: changing initialScope makes the Gate 1 signature stale', stale('SG01', snapAt('SG01'), withScope).some((c) => c.startsWith('Project identity')));
t('a change that touches nothing readiness reads (the project lead) changes nothing',
  stale('SG01', snapAt('SG01'), { ...live, identity: { ...live.identity, projectLead: 'someone else' } }).length === 0);
const withAssessment: ProjectData = { ...live, assessments: { ...live.assessments, scaleUpRisk: 'Yes' } as never };
t('an assessment owned by a later gate (scale-up, Gate 9) is information at Gate 4', stale('SG04', snapAt('SG04'), withAssessment).length === 0);
const noData = { ...snapAt('SG05') } as Partial<ReturnType<typeof gateEvidenceSnapshot>>;
delete noData.projectData;
delete noData.projectDataLater;
t('a legacy snapshot (no projectData) is not stale because the BOM is now recorded',
  stale('SG05', noData as ReturnType<typeof gateEvidenceSnapshot>, withBom).filter((c) => c.includes('BOM')).length === 0);
const withMarket: ProjectData = { ...live, identity: { ...live.identity, markets: [...(live.identity.markets ?? []), 'A new market'] } };
t('adding a market after Gate 1 does NOT make the Gate 1 or Gate 10 signature stale',
  stale('SG01', snapAt('SG01'), withMarket).length === 0 && stale('SG10', snapAt('SG10'), withMarket).length === 0);
t('...but the new market is reported as information', snapshotLaterChanges(snapAt('SG01'), gateEvidenceSnapshot(withMarket, 'SG01')).some((c) => c.startsWith('Project markets changed')));

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
