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
import { approvedClaimRevisionsWithoutChange, marketAuthorisationRequirement, releasedLabelEditsWithoutChange } from '../src/utils/controlledBaselines';
import { changeRefPurposeFor, changeRefProblem, legacyChangeReferences, newChangeReferences } from '../src/utils/changeLinks';

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

// ---- what a reference is FOR (the implementation and closure purposes)
const sub = (over: RegisterRow = {}): RegisterRow => ({ linkedChangeId: 'CHG-001', ...over });
t('a substitution still being assessed links a change as an assessment', changeRefPurposeFor('ingredientSubstitution', 'linkedChangeId', sub({ decision: 'Needs Review' })) === 'assessment');
t('...one decided to go ahead is an implementation', changeRefPurposeFor('ingredientSubstitution', 'linkedChangeId', sub({ decision: 'Approved' })) === 'implementation' && changeRefPurposeFor('ingredientSubstitution', 'linkedChangeId', sub({ decision: 'Conditional' })) === 'implementation');
t('...and one marked Complete is a closure', changeRefPurposeFor('ingredientSubstitution', 'linkedChangeId', sub({ status: 'Complete', decision: 'Approved' })) === 'closure');
t('the Product Family register only references a change', changeRefPurposeFor('productFamilyRegister', 'changeRegisterId', {}) === 'reference');
t('the iteration log and the released-label register link a change as an assessment', changeRefPurposeFor('productDevelopmentIterations', 'linkedChangeId', {}) === 'assessment' && changeRefPurposeFor('releasedLabelRegister', 'artworkChangeRef', {}) === 'assessment');
const underReview = withChanges(change());
t('an Approved substitution cannot rest on a change still under review', !!changeRefProblem(underReview, 'ingredientSubstitution', 'linkedChangeId', sub({ decision: 'Approved' })));
t('...but can once the change is approved to implement and its impact assessed', changeRefProblem(withChanges(change({ status: 'In Implementation', impactTriage: 'Material impact' })), 'ingredientSubstitution', 'linkedChangeId', sub({ decision: 'Approved' })) === undefined);
t('a Complete substitution needs a Completed change with its final disposition', !!changeRefProblem(withChanges(change({ status: 'Completed' })), 'ingredientSubstitution', 'linkedChangeId', sub({ status: 'Complete' })));
t('a blank reference raises no problem here (the after-lock requirement is checked separately)', changeRefProblem(underReview, 'ingredientSubstitution', 'linkedChangeId', sub({ linkedChangeId: '' })) === undefined);

// ---- the other controlled baselines: market authorisation, released pack, released claim
const track = { market: 'Vietnam', formulaVersion: 'F1.0', pifStatus: 'Approved', regulatoryStatus: 'Approved', claimsApproval: 'Approved', launchApproval: 'Approved' } as never;
const trackBack = { ...(track as object), regulatoryStatus: 'Pending' } as never;
t('taking back an approved market authorisation needs an open Regulatory change for that market', !!marketAuthorisationRequirement(base, track, trackBack) && marketAuthorisationRequirement(withChanges(change({ impactAreas: ['Regulatory'], markets: ['Vietnam'] })), track, trackBack) === undefined);
t('...a change for another market does not cover it', !!marketAuthorisationRequirement(withChanges(change({ impactAreas: ['Regulatory'], markets: ['Thailand'] })), track, trackBack));
t('...and a first approval is not a change to a baseline', marketAuthorisationRequirement(base, { ...(track as object), launchApproval: 'Pending' } as never, track) === undefined);
const lbl = (over: RegisterRow = {}): RegisterRow => ({ recordId: 'L1', newLabelReleased: 'Y', whatChanged: 'a', ...over });
t('editing a released label needs an open Artwork or Packaging change', releasedLabelEditsWithoutChange(base, [lbl()], [lbl({ whatChanged: 'b' })]).length === 1 && releasedLabelEditsWithoutChange(withChanges(change({ impactAreas: ['Artwork'] })), [lbl()], [lbl({ whatChanged: 'b' })]).length === 0);
t('...owner and notes stay free, and an unreleased label is not a baseline', releasedLabelEditsWithoutChange(base, [lbl()], [lbl({ notes: 'x' })]).length === 0 && releasedLabelEditsWithoutChange(base, [lbl({ newLabelReleased: 'N' })], [lbl({ newLabelReleased: 'N', whatChanged: 'b' })]).length === 0);
const clm = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'C1', revision: 1, revisionApprovedBy: 'Sam', revisionApprovedDate: '2026-01-01', ...over });
t('a new revision of an approved claim needs an open Claims change', approvedClaimRevisionsWithoutChange(base, [clm()], [clm({ revision: 2 })]).join() === 'C1' && approvedClaimRevisionsWithoutChange(withChanges(change({ impactAreas: ['Claims'] })), [clm()], [clm({ revision: 2 })]).length === 0);
t('...an unapproved claim moves freely', approvedClaimRevisionsWithoutChange(base, [clm({ revisionApprovedBy: '' })], [clm({ revisionApprovedBy: '', revision: 2 })]).length === 0);

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
