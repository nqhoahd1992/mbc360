// Verifies Round 5 question 11(1)(3): the Formulation Change Register is a VIEW of the Change Control log. Its base data is read from the master change
// record and never stored on the register's row; the overlay (department actions, re-registration, the Final Approver's decision) is the row's own; an
// isolated row (no master) keeps what it stored and counts for nothing; which changes belong in the view is decided in one place.
// Run: npm run verify:change-views
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS } from '../src/config/registers';
import type { ChangeRecord, ProjectData, RegisterRow } from '../src/types';
import { deriveRegisterRows, formulaChangeStatus } from '../src/utils/registerDerived';
import { FORMULATION_CHANGE_VIEW, applyChangeView, baseColumnsOf, isFormulationChange, masterOf } from '../src/utils/changeViews';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const change = (over: Partial<ChangeRecord> = {}): ChangeRecord => ({
  changeId: 'CHG-001',
  trigger: 'Formula version F1 -> F2 (Major)',
  productSku: 'SKU-1',
  affectedArea: 'Formula version / pH / process',
  riskLevel: 'High',
  communicationRequired: false,
  status: 'Under Review',
  owner: 'Sam',
  aliasIds: ['FC-001'],
  requestedBy: 'Anna',
  dateRequested: '2026-11-01',
  explanation: 'New emollient system',
  reasons: 'Supplier discontinued the old one',
  changedBy: 'Binh',
  communicatedToMarket: 'In progress',
  communicationAcknowledgedBy: 'Chi',
  ...over,
});
const base: ProjectData = createEmptyProject({
  id: 'VIEW-TEST', productCode: 'X', productSku: 'X', productGroup: 'X', projectLead: 'Lead Person',
  ownerDepartment: 'X', dateOpened: '2026-01-01', targetLaunchDate: '2027-01-01', markets: ['Vietnam'], reviewers: {},
} as never);
const withChanges = (...c: ChangeRecord[]): ProjectData => ({ ...base, changes: c.map((x) => ({ ...x, projectId: base.identity.id })) });

const overlay: RegisterRow = {
  changeId: 'FC-001',
  masterChangeId: 'CHG-001',
  actionNpd: 'Re-trial',
  approvedByNp: 'Pending Final Approver decision',
  vnRegistrationRequired: 'Yes',
};
const p = withChanges(change());
const [row] = applyChangeView(FORMULATION_CHANGE_VIEW, [overlay], p);

t('the title comes from the master record', row.changeTitle === 'Formula version F1 -> F2 (Major)');
t('the SKU, who asked and when come from it', row.productFamilySku === 'SKU-1' && row.requestedByNpd === 'Anna' && row.dateRequested === '2026-11-01');
t('what changed and why come from it', row.explanation === 'New emollient system' && row.reasons === 'Supplier discontinued the old one' && row.changedBy === 'Binh');
t('the communication comes from it', row.communicatedToMarket === 'In progress' && row.communicationAcknowledgedBy === 'Chi');
t('"closed" is read from the master status, not stored', row.closed === 'No' && applyChangeView(FORMULATION_CHANGE_VIEW, [overlay], withChanges(change({ status: 'Completed' })))[0].closed === 'Yes');
t('the overlay is the row\'s own and is kept', row.actionNpd === 'Re-trial' && row.vnRegistrationRequired === 'Yes' && row.approvedByNp === 'Pending Final Approver decision');
t('a value stored on the row is overridden by the master record (no second copy can win)', applyChangeView(FORMULATION_CHANGE_VIEW, [{ ...overlay, changeTitle: 'stale copy' }], p)[0].changeTitle === 'Formula version F1 -> F2 (Major)');

t('an FC alias finds the master when the row does not name it', masterOf(FORMULATION_CHANGE_VIEW, { changeId: 'FC-001' }, p)?.changeId === 'CHG-001');
const isolated: RegisterRow = { changeId: 'FC-009', changeTitle: 'typed long ago', actionNpd: 'x' };
t('an isolated row (no master) keeps what it stored', applyChangeView(FORMULATION_CHANGE_VIEW, [isolated], p)[0].changeTitle === 'typed long ago');
t('...and is not given a master', applyChangeView(FORMULATION_CHANGE_VIEW, [isolated], p)[0].masterChangeId === undefined);

t('the derived status follows the base data and the overlay', deriveRegisterRows('formulationChangeRegister', [overlay], p)[0].overallStatus === formulaChangeStatus(row));
t('a closed master with an approved, signed overlay reads Closed', (() => {
  const done = deriveRegisterRows('formulationChangeRegister', [{ ...overlay, approvedByNp: 'Approved', npSignOff: 'Nguyen' }], withChanges(change({ status: 'Completed' })))[0];
  return String(done.overallStatus).toLowerCase().includes('closed');
})());

t('the base columns that must never be written back are named in one place', ['changeTitle', 'productFamilySku', 'requestedByNpd', 'dateRequested', 'explanation', 'reasons', 'changedBy', 'communicatedToMarket', 'communicationAcknowledgedBy', 'closed'].every((c) => baseColumnsOf(FORMULATION_CHANGE_VIEW).includes(c)));
t('...and none of the overlay columns is among them', ['actionNpd', 'actionReg', 'actionManufacturing', 'actionMarketingSales', 'vnRegistrationRequired', 'approvedByNp', 'npSignOff', 'marketCommRequired'].every((c) => !baseColumnsOf(FORMULATION_CHANGE_VIEW).includes(c)));

const config = REGISTER_CONFIGS.find((c) => c.key === 'formulationChangeRegister')!;
t('the register declares itself a view', config.changeView === FORMULATION_CHANGE_VIEW);
t('every base column is read-only on the register', baseColumnsOf(FORMULATION_CHANGE_VIEW).every((k) => config.columns.find((c) => c.key === k)?.editable === false));
t('the overlay columns stay editable (the department actions, the re-registration question)', ['actionNpd', 'actionReg', 'actionManufacturing', 'actionMarketingSales', 'vnRegistrationRequired'].every((k) => config.columns.find((c) => c.key === k)?.editable !== false));

t('a change in a formula area belongs in the view', isFormulationChange(change({ aliasIds: [], affectedArea: 'Formula / ingredient' })));
t('a change that came in through a Formula trigger belongs too', isFormulationChange(change({ aliasIds: [], affectedArea: 'Other', triggerId: 'formula-ingredient' })));
t('a change that already has an FC alias belongs', isFormulationChange(change({ aliasIds: ['FC-004'], affectedArea: 'Other' })));
t('an artwork change does not', !isFormulationChange(change({ aliasIds: [], affectedArea: 'Artwork / label', triggerId: undefined })));

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
