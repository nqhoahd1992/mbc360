// SW-34: who may change the important cells of a register. Pure functions over a hand-built project; the API's refusal is
// exercised by hand against a one-off API and by `npm run verify:e2e`.
// Run: npm run verify:register-access
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS, type RegisterConfig } from '../src/config/registers';
import { isSensitiveColumn, registerAccessViolations, registerAssignedPeople } from '../src/utils/registerAccess';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const cfg = (key: string): RegisterConfig => REGISTER_CONFIGS.find((c) => c.key === key)!;

const project = createEmptyProject({
  id: 'T', productCode: 'T', projectLead: 'Lena Lead', markets: ['Vietnam'],
  reviewers: { regulatory: 'Rita Reg', ri: 'Rick RI', 'project-manager': 'Pam PM' },
} as never);
const watch = cfg('prohibitedIngredients');
const rows = project.registers['prohibitedIngredients'];
const edit = (patch: Record<string, unknown>) => rows.map((r, i) => (i === 0 ? { ...r, ...patch } : r));
const who = (name: string, isAdmin = false) => ({ displayName: name, isAdmin });
const v = (name: string, patch: Record<string, unknown>, isAdmin = false) => registerAccessViolations(project, watch, rows, edit(patch), who(name, isAdmin));

const people = registerAssignedPeople(project, watch);
t('assigned = Review owner, co-signers, Project Manager and the Lead', ['rita reg', 'rick ri', 'pam pm', 'lena lead'].every((n) => people.has(n)));
t('a stranger is not assigned', !people.has('sam stranger'));

t('a stranger may add plain information (evidence link)', v('Sam Stranger', { evidenceLink: 'https://x' }).length === 0);
t('a stranger may not change a status', v('Sam Stranger', { productStatus: 'Needs Safety Review' }).length === 1);
t('a stranger may not change the work status', v('Sam Stranger', { status: 'Complete' }).length === 1);
t('the Review owner may', v('Rita Reg', { productStatus: 'Needs Safety Review' }).length === 0);
t('a co-signer may', v('Rick RI', { status: 'Complete' }).length === 0);
t('the Project Manager may', v('Pam PM', { status: 'Complete' }).length === 0);
t('the Lead may', v('Lena Lead', { status: 'Complete' }).length === 0);
t('an administrator may', v('Sam Stranger', { status: 'Complete' }, true).length === 0);
t('names are compared without case or spaces', v('  rita reg ', { status: 'Complete' }).length === 0);

// The Reviewer named on a row counts for that row only.
const named = rows.map((r, i) => (i === 0 ? { ...r, reviewer: 'Sam Stranger' } : r));
const withReviewer = { ...project, registers: { ...project.registers, prohibitedIngredients: named } };
t('the Reviewer named on a row may change that row', registerAccessViolations(withReviewer, watch, named, named.map((r, i) => (i === 0 ? { ...r, status: 'Complete' } : r)), who('Sam Stranger')).length === 0);
t('...but not another row', registerAccessViolations(withReviewer, watch, named, named.map((r, i) => (i === 1 ? { ...r, status: 'Complete' } : r)), who('Sam Stranger')).length === 1);

// Rows.
const free = cfg('supplierRmEvidence');
const freeRows = [{ rmCode: 'A', status: 'Not Started' }] as never[];
t('a stranger may not add a row to a free register', registerAccessViolations(project, free, [], freeRows, who('Sam Stranger')).length === 1);
t('an assigned person may', registerAccessViolations(project, free, [], freeRows, who('Lena Lead')).length === 0);
t('a stranger may not delete a row', registerAccessViolations(project, free, freeRows, [], who('Sam Stranger')).length === 1);

// The three registers with no Review owner.
t('the feedback sheet is open to everyone', registerAccessViolations(project, cfg('systemFeedback'), [], [{ status: 'x' }] as never[], who('Sam Stranger')).length === 0);
t('the template index is the Lead\'s and administrators\' alone', registerAccessViolations(project, cfg('templateIndex'), [], [{ status: 'x' }] as never[], who('Sam Stranger')).length === 1 && registerAccessViolations(project, cfg('templateIndex'), [], [{ status: 'x' }] as never[], who('Lena Lead')).length === 0);

// What counts as important.
const col = (type: string, label = 'X', sensitive?: boolean) => ({ key: 'k', label, type, sensitive }) as never;
t('select, checkbox, signature and multiSelect are important', ['select', 'checkbox', 'signature', 'multiSelect'].every((k) => isSensitiveColumn(col(k))));
t('text, date, number, textarea are plain information', ['text', 'date', 'number', 'textarea'].every((k) => !isSensitiveColumn(col(k))));
t('a person who recorded an act is important, an Owner is not', isSensitiveColumn(col('user', 'Verified by')) && isSensitiveColumn(col('user', 'Reviewer')) && !isSensitiveColumn(col('user', 'Owner')));
t('an explicit flag overrides the kind', isSensitiveColumn(col('text', 'X', true)) && !isSensitiveColumn(col('select', 'X', false)));

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
