// Closing a High or Critical safety finding needs all six things Round 4 question 33(e) lists: conclusion, evidence
// link, a completed linked action, verification, verifier, closure date. Pure functions over a hand-built project on
// the real rule engine. Run: npm run verify:safety-closure
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { createEmptyRegisterRow, duplicateValueProblems, getRegisterConfig, missingRequiredColumns, missingRequiredProblems } from '../src/config/registers';
import { canChooseSuperseded, findingsReplacedBy, hardBlockingSafetyFindings } from '../src/utils/safetyFindings';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const config = getRegisterConfig('criticalSafetyFindings')!;
t('the register has the three columns question 33(e) names', ['verification', 'verifier', 'closureDate'].every((k) => config.columns.some((c) => c.key === k)));
t('...and the verifier records an act, so only the signed-in person may fill it', config.columns.find((c) => c.key === 'verifier')?.selfAttest === true);

const project = (row: Record<string, unknown>): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  p.nextActions = [
    { id: 'NA-1', gateIds: ['SG07'], description: 'fix', priority: 'High', status: 'Closed', owner: 'x', controlled: true } as never,
  ];
  p.registers['criticalSafetyFindings'] = [{ ...createEmptyRegisterRow(config), ...row }];
  return p;
};
const closed = {
  criticalFinding: 'Yes', severity: 'High', findingStatus: 'Closed',
  safetyReviewerConclusion: 'ok', evidenceLink: 'http://x', linkedNextActionId: 'NA-1',
};
const blocks = (row: Record<string, unknown>) => hardBlockingSafetyFindings(project(row)).length > 0;
const full = { ...closed, verification: 'retested, within limit', verifier: 'Sekar', closureDate: '2026-10-13' };

t('a closed High finding with all six passes', !blocks(full));
for (const [field, label] of [['safetyReviewerConclusion', 'conclusion'], ['evidenceLink', 'evidence link'], ['verification', 'verification'], ['verifier', 'verifier'], ['closureDate', 'closure date']] as const) {
  t(`a closed High finding without the ${label} still blocks Gate 7`, blocks({ ...full, [field]: '' }));
}
t('a Critical finding is held to the same six', blocks({ ...full, severity: 'Critical', verifier: '' }) && !blocks({ ...full, severity: 'Critical' }));
t('a Medium finding is NOT asked for them (the answer says High or Critical)', !blocks({ ...closed, severity: 'Medium', verification: '', verifier: '', closureDate: '' }));
t('a row with a status that is still open blocks whatever it carries', blocks({ ...full, findingStatus: 'Verification Pending' }));

// --- a Superseded finding names the finding that replaced it ---------------------------------------------------
{
  const two = (a: Record<string, unknown>, b: Record<string, unknown>): ProjectData => {
    const p = project(a);
    p.registers['criticalSafetyFindings'].push({ ...createEmptyRegisterRow(config), ...b });
    return p;
  };
  const replacement = { criticalFinding: 'No', severity: 'Low', findingStatus: 'Closed', findingId: 'F-2' };
  const old = { ...full, findingStatus: 'Superseded', findingId: 'F-1' };
  t('a Superseded finding with a replacement that exists passes', hardBlockingSafetyFindings(two({ ...old, supersededBy: 'F-2' }, replacement)).length === 0);
  t('...without a replacement it blocks, whatever its severity', hardBlockingSafetyFindings(two({ ...old, supersededBy: '' }, replacement)).length > 0 && hardBlockingSafetyFindings(two({ ...old, severity: 'Low', supersededBy: '' }, replacement)).length > 0);
  t('...naming itself is no replacement', hardBlockingSafetyFindings(two({ ...old, supersededBy: 'F-1' }, replacement)).length > 0);
  t('...naming a finding that is not in the register blocks', hardBlockingSafetyFindings(two({ ...old, supersededBy: 'F-9' }, replacement)).length > 0);
  t('Superseded is still held to the six closure facts (our reading, R5-Q12): with a replacement but no closure date it blocks', hardBlockingSafetyFindings(two({ ...old, supersededBy: 'F-2', closureDate: '' }, replacement)).length > 0);
  t('a Closed finding is not asked for a replacement', hardBlockingSafetyFindings(two({ ...full, findingId: 'F-1' }, replacement)).length === 0);
  const col = config.columns.find((c) => c.key === 'supersededBy');
  t('the column is a picker over this registers Finding IDs, required only while Superseded', col?.type === 'rowRef' && col.refRegister === 'criticalSafetyFindings' && col.refColumn === 'findingId' && col.requiredWhen?.values.includes('Superseded') === true);
}

// --- Superseded can only be chosen when there is something to point at -----------------------------------------
{
  const reg = (...ids: string[]) => ids.map((id) => ({ ...createEmptyRegisterRow(config), findingId: id }));
  t('a lone finding cannot be Superseded — nothing to point at', !canChooseSuperseded(reg('F-1'), 0));
  t('...nor when the only other rows have no Finding ID yet', !canChooseSuperseded([...reg('F-1'), { ...createEmptyRegisterRow(config) }], 0));
  t('...with another finding that has an ID it can', canChooseSuperseded(reg('F-1', 'F-2'), 0));
  t('...and the other one can too (each is the other one a candidate)', canChooseSuperseded(reg('F-1', 'F-2'), 1));
}

// --- the closure facts are marked required exactly when the answer asks for them -----------------------------------
{
  const need = (row: Record<string, unknown>) => missingRequiredColumns(config, { ...createEmptyRegisterRow(config), ...row }).map((c) => c.key).sort();
  t('a Closed High finding is asked for all of them', need({ severity: 'High', findingStatus: 'Closed' }).join() === 'closureDate,evidenceLink,linkedNextActionId,safetyReviewerConclusion,verification,verifier');
  t('...a Critical one too', need({ severity: 'Critical', findingStatus: 'Closed' }).length === 6);
  t('...a Medium one is not', need({ severity: 'Medium', findingStatus: 'Closed' }).length === 0);
  t('...an open High one is not', need({ severity: 'High', findingStatus: 'Open' }).length === 0);
  t('...a Superseded High one is, and also names its replacement', need({ severity: 'High', findingStatus: 'Superseded' }).includes('supersededBy') && need({ severity: 'High', findingStatus: 'Superseded' }).length === 7);
  t('the refusal says why in plain words', missingRequiredProblems(config, [{ ...createEmptyRegisterRow(config), severity: 'High', findingStatus: 'Closed' }])[0].includes('Status is Closed and Severity is High'));
}

// --- "Replaces" lists the findings that point at this one ----------------------------------------------------------
{
  const rowsOf = (...r: Record<string, unknown>[]) => r.map((x) => ({ ...createEmptyRegisterRow(config), ...x }));
  const r = rowsOf(
    { findingId: 'F-1', findingStatus: 'Superseded', supersededBy: 'F-3' },
    { findingId: 'F-2', findingStatus: 'Superseded', supersededBy: 'F-3' },
    { findingId: 'F-3', findingStatus: 'Open' },
    { findingId: 'F-4', findingStatus: 'Closed', supersededBy: 'F-3' },
  );
  t('the replacement lists every finding that points at it', findingsReplacedBy(r, r[2]).join() === 'F-1,F-2');
  t('...a finding nobody points at replaces nothing', findingsReplacedBy(r, r[0]).length === 0);
  t('...a stale pointer on a row that is no longer Superseded does not count', !findingsReplacedBy(r, r[2]).includes('F-4'));
  t('...a row with no Finding ID replaces nothing', findingsReplacedBy(rowsOf({ findingStatus: 'Open' }), rowsOf({ findingStatus: 'Open' })[0]).length === 0);
  t('the column is read-only and never stored', config.columns.find((c) => c.key === 'replaces')?.editable === false);
}

// --- a Finding ID is an identifier: unique ----------------------------------------------------------------------
{
  const rowsOf = (...ids: string[]) => ids.map((id) => ({ ...createEmptyRegisterRow(config), findingId: id }));
  t('the column is declared unique', config.columns.find((c) => c.key === 'findingId')?.unique === true);
  t('distinct IDs are fine', duplicateValueProblems(config, rowsOf('F-1', 'F-2', 'F-3')).length === 0);
  t('blank IDs are not a value, so several blanks are fine', duplicateValueProblems(config, rowsOf('', '', 'F-1')).length === 0);
  const dup = duplicateValueProblems(config, rowsOf('F-1', 'F-2', 'F-1'));
  t('a repeated ID is refused, naming the rows', dup.length === 1 && dup[0].includes('rows 1, 3'), dup.join(' | '));
  t('...without regard to case or spaces', duplicateValueProblems(config, rowsOf('F-1', ' f-1 ')).length === 1);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
