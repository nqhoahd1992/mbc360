// Verifies Round 5 question 11(4): what makes a link to a change record valid. An FC- number is an alias of the master CHG; an
// assessment can link an open or completed change but not a rejected or cancelled one; implementation needs an approved, triaged
// change; closure needs a Completed change with its final disposition; an unresolved reference is flagged, never discarded.
// Run: npm run verify:change-links
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import type { ChangeRecord, ProjectData } from '../src/types';
import { changeLinkProblem, resolveChangeRef, unresolvedChangeRefs, validChangeRefs } from '../src/utils/changeLinks';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const change = (over: Partial<ChangeRecord> = {}): ChangeRecord => ({
  changeId: 'CHG-001',
  trigger: 'Formula version F1 -> F2 (Major)',
  productSku: 'X',
  affectedArea: 'Formula / ingredient',
  riskLevel: 'High',
  communicationRequired: false,
  status: 'Under Review',
  owner: 'Sam',
  aliasIds: ['FC-001'],
  ...over,
});
const base: ProjectData = createEmptyProject({
  id: 'LINK-TEST', productCode: 'X', productSku: 'X', productGroup: 'X', projectLead: 'Lead Person',
  ownerDepartment: 'X', dateOpened: '2026-01-01', targetLaunchDate: '2027-01-01', markets: ['Vietnam'], reviewers: {},
} as never);
const withChanges = (...c: ChangeRecord[]): ProjectData => ({ ...base, changes: c.map((x) => ({ ...x, projectId: base.identity.id })) });

const open = change();
t('a CHG number resolves to itself', resolveChangeRef([open], 'CHG-001')?.changeId === 'CHG-001');
t('an FC alias resolves to the master CHG', resolveChangeRef([open], 'FC-001')?.changeId === 'CHG-001');
t('an isolated FC number (no master) resolves to nothing', resolveChangeRef([change({ aliasIds: [] })], 'FC-007') === undefined);
t('blank resolves to nothing', resolveChangeRef([open], '  ') === undefined);

t('an open change is a valid assessment link', changeLinkProblem(open, 'assessment') === undefined);
t('a Completed change is too (a historical reference)', changeLinkProblem(change({ status: 'Completed' }), 'assessment') === undefined);
t('a Rejected change is not', changeLinkProblem(change({ status: 'Rejected' }), 'assessment') !== undefined);
t('a Cancelled change is not', changeLinkProblem(change({ status: 'Cancelled' }), 'assessment') !== undefined);
t('but a Rejected change is still a valid plain reference', changeLinkProblem(change({ status: 'Rejected' }), 'reference') === undefined);
t('a change with no owner has no reviewable status', changeLinkProblem(change({ owner: '' }), 'assessment') !== undefined);

t('implementation needs an approved change', changeLinkProblem(open, 'implementation') !== undefined);
t('...that has had its impact assessed', changeLinkProblem(change({ status: 'In Implementation' }), 'implementation') !== undefined);
t('...and passes once approved and triaged', changeLinkProblem(change({ status: 'In Implementation', impactTriage: 'Material impact' }), 'implementation') === undefined);
t('a Rejected change cannot authorise implementation', changeLinkProblem(change({ status: 'Rejected', impactTriage: 'No material impact' }), 'implementation') !== undefined);

t('closure needs a Completed change', changeLinkProblem(open, 'closure') !== undefined);
t('...with its final disposition recorded', changeLinkProblem(change({ status: 'Completed' }), 'closure') !== undefined);
t('...and passes with it', changeLinkProblem(change({
  status: 'Completed', closureOutcome: 'o', closureImplementation: 'i', closureEvidence: 'e', closureImpactedVersions: 'v', closureVerifier: 'Sam', closedDate: '2026-11-01',
}), 'closure') === undefined);

const p = withChanges(open, change({ changeId: 'CHG-002', aliasIds: [], status: 'Rejected' }));
t('the valid assessment refs include the master and its aliases', ['CHG-001', 'FC-001'].every((r) => validChangeRefs(p, 'assessment').includes(r)));
t('...and leave out a rejected change', !validChangeRefs(p, 'assessment').includes('CHG-002'));
t('a change of another project is not offered', validChangeRefs({ ...p, changes: [{ ...open, projectId: 'OTHER' }] }, 'assessment').length === 0);
t('an unresolved legacy reference is flagged, not dropped', unresolvedChangeRefs(p, ['CHG-001', 'FC-001', 'FC-009', 'old typo', '']).join('|') === 'FC-009|old typo');

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
