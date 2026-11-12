// Verifies the rest of Round 5 question 11: the two rulebook sheets show the changes of each type from the Change Control log; an approved formula is a
// controlled baseline even back at Gate 05; change references in the registers must resolve and the ones that do not are flagged, never discarded.
// Run: npm run verify:change-baseline
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { CHANGE_TRIGGERS } from '../src/config/changeTriggers';
import type { BacktrackEvent, ChangeRecord, GateRecord, ProjectData, RegisterRow } from '../src/types';
import { deriveRegisterRows } from '../src/utils/registerDerived';
import { applyRulebookChanges, rulebookTriggerId } from '../src/utils/changeRulebooks';
import { formulaChangeRequirement, formulaWasApproved, hasOpenFormulationChange } from '../src/utils/formulaBaseline';
import { legacyChangeReferences, newChangeReferences } from '../src/utils/changeLinks';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const base: ProjectData = createEmptyProject({
  id: 'BASE-TEST', productCode: 'X', productSku: 'X', productGroup: 'X', projectLead: 'Lead Person',
  ownerDepartment: 'X', dateOpened: '2026-01-01', targetLaunchDate: '2027-01-01', markets: ['Vietnam'], reviewers: {},
} as never);
const change = (over: Partial<ChangeRecord> = {}): ChangeRecord => ({
  changeId: 'CHG-001', projectId: base.identity.id, trigger: 'Ingredient added or removed', triggerId: 'formula-ingredient', productSku: 'X',
  affectedArea: 'Formula / ingredient', riskLevel: 'High', communicationRequired: false, status: 'Under Review', owner: 'Sam',
  oldVersion: 'F1', newVersion: 'F2', ...over,
});
const withChanges = (...c: ChangeRecord[]): ProjectData => ({ ...base, changes: c });
const passedGate5: GateRecord = { gateId: 'SG05', status: 'Complete', decision: 'Proceed' };
const backtrackFrom = (gate: GateRecord): BacktrackEvent => ({
  id: 'bt1', date: '2026-11-01', fromGateId: 'SG07', toGateId: 'SG05', reopenedGateIds: ['SG05'], previousGates: [gate], previousSignOffs: {},
});

// ---- the rulebook sheets
const formulaRows = REGISTER_CONFIGS.find((c) => c.key === 'formulaChangeControl')!.fixedRows as RegisterRow[];
const ingredientRow = formulaRows.find((r) => r.trigger === 'Ingredient added or removed')!;
const shown = applyRulebookChanges('formulaChangeControl', [ingredientRow], withChanges(change()))[0];
t('a rulebook row lists the changes of its type, with versions and status', String(shown.openChanges).includes('CHG-001') && String(shown.openChanges).includes('F1 → F2') && String(shown.openChanges).includes('Under Review'), String(shown.openChanges));
t('a row with no change of its type shows a dash', applyRulebookChanges('formulaChangeControl', [ingredientRow], withChanges())[0].openChanges === '—');
t('a change of another type is not listed on it', applyRulebookChanges('formulaChangeControl', [ingredientRow], withChanges(change({ triggerId: 'formula-supplier' })))[0].openChanges === '—');
t('every one of the five formula rows matches a catalogue trigger', formulaRows.every((r) => !!rulebookTriggerId('Formula', String(r.trigger))), formulaRows.map((r) => String(r.trigger)).filter((x) => !rulebookTriggerId('Formula', x)).join(' | '));
const artworkRows = REGISTER_CONFIGS.find((c) => c.key === 'artworkChangeControl')!.fixedRows as RegisterRow[];
const artworkMatched = artworkRows.filter((r) => !!rulebookTriggerId('Artwork / Label', String(r.trigger))).length;
t('the artwork rows that match a catalogue trigger are shown (the rest show a dash, never a guess)', artworkMatched >= 1, `${artworkMatched}/${artworkRows.length} matched; unmatched: ${artworkRows.filter((r) => !rulebookTriggerId('Artwork / Label', String(r.trigger))).map((r) => r.trigger).join(' | ')}`);
t('deriveRegisterRows applies it', deriveRegisterRows('formulaChangeControl', [ingredientRow], withChanges(change()))[0].openChanges !== undefined);
const formulaCfg = REGISTER_CONFIGS.find((c) => c.key === 'formulaChangeControl')!;
t('the occurrence columns are gone from the sheet and the derived one is read-only and computed', !formulaCfg.columns.some((c) => ['oldVersion', 'newVersion', 'status', 'changeControlCommId'].includes(c.key)) && formulaCfg.columns.find((c) => c.key === 'openChanges')?.editable === false && formulaCfg.columns.find((c) => c.key === 'openChanges')?.computed === true);
t('the catalogue still has the triggers the rows match', CHANGE_TRIGGERS.some((c) => c.category === 'Formula') && CHANGE_TRIGGERS.some((c) => c.category === 'Artwork / Label'));

// ---- the approved formula is a controlled baseline
t('a formula never approved is not a controlled baseline', !formulaWasApproved(base) && formulaChangeRequirement(base) === undefined);
const approvedBack = { ...base, backtrackEvents: [backtrackFrom(passedGate5)] };
t('a backtrack that reopened a Gate 05 that had passed marks the formula approved', formulaWasApproved(approvedBack));
t('a backtrack that reopened a Gate 05 that had NOT passed does not', !formulaWasApproved({ ...base, backtrackEvents: [backtrackFrom({ gateId: 'SG05', status: 'In Progress' })] }));
t('Gate 05 passed now counts', formulaWasApproved({ ...base, gates: base.gates.map((g) => (g.gateId === 'SG05' ? passedGate5 : g)) }));
t('back at Gate 05 with no open formulation change, editing the BOM is refused with the reason', !!formulaChangeRequirement(approvedBack));
t('...and allowed while a formulation change is open', formulaChangeRequirement({ ...approvedBack, changes: [change()] }) === undefined && hasOpenFormulationChange({ ...approvedBack, changes: [change()] }));
t('...but not by a change that is closed', !!formulaChangeRequirement({ ...approvedBack, changes: [change({ status: 'Completed' })] }));
t('...nor by a rejected one', !!formulaChangeRequirement({ ...approvedBack, changes: [change({ status: 'Rejected' })] }));
t('...nor by a change that is not about the formula', !!formulaChangeRequirement({ ...approvedBack, changes: [change({ affectedArea: 'Artwork / label', triggerId: undefined })] }));

// ---- references that must resolve, and the ones that are flagged
const fam = REGISTER_CONFIGS.find((c) => c.key === 'productFamilyRegister')!;
t('the typed change references are pickers now', ['productFamilyRegister', 'productDevelopmentIterations', 'releasedLabelRegister', 'campaignsSocialMedia', 'ingredientSubstitution'].every((k) => REGISTER_CONFIGS.find((c) => c.key === k)!.columns.some((c) => c.type === 'changeRef')));
t('Product Family & Version Register names its change as a change reference', fam.columns.find((c) => c.key === 'changeRegisterId')?.type === 'changeRef');
t('Ingredient Substitution Evidence can link an iteration (before lock) and a change (after lock)', (() => {
  const cols = REGISTER_CONFIGS.find((c) => c.key === 'ingredientSubstitution')!.columns;
  return cols.find((c) => c.key === 'linkedIterationId')?.type === 'rowRef' && cols.find((c) => c.key === 'linkedChangeId')?.type === 'changeRef';
})());
const row = (v: string): RegisterRow => ({ changeRegisterId: v });
t('a new reference is checked, one the register already held is left alone', newChangeReferences(fam, [row('OLD-TYPO')], [row('OLD-TYPO'), row('CHG-001')]).map((r) => r.value).join() === 'CHG-001');
t('a changed reference is checked', newChangeReferences(fam, [row('CHG-001')], [row('CHG-002')]).length === 1);
const flagged = { ...withChanges(change({ aliasIds: ['FC-001'] })), registers: { ...base.registers, productFamilyRegister: [row('CHG-001'), row('FC-001'), row('FC-009'), row('typed long ago'), row('')] } };
t('an unresolved reference is flagged, a CHG or alias is not, and blank is not', legacyChangeReferences(flagged).map((r) => r.value).join('|') === 'FC-009|typed long ago');

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
