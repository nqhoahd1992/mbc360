// Verifies the Change Control assessment of post-market findings, recorded as a LIST of entries
// (Round 4 question 8, listed per finding since 2026-10-13 — R5-Q11). Pure functions over a
// hand-built project on the real rule engine; the API's refusals are exercised by
// `npm run verify:e2e`. Run: npm run verify:change-control-assessments
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { changeControlAssessmentProblems, isPendingAnswer } from '../src/utils/changeControlAssessments';
import { evaluateTrigger } from '../src/utils/gateProgress';
import type { ChangeControlAssessment, ChangeRecord, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam', 'Singapore'], reviewers: {} } as never);
const entry = (over: Partial<ChangeControlAssessment> = {}): ChangeControlAssessment => ({
  id: `e${Math.random()}`,
  finding: 'Rising irritation complaints',
  answer: 'No',
  reviewer: 'Sekar',
  rationale: 'within the expected range',
  ...over,
});
const change = (status: ChangeRecord['status'], projectId = 'T-1'): ChangeRecord =>
  ({ changeId: 'CHG-001', projectId, trigger: 'x', productSku: 's', affectedArea: 'a', riskLevel: 'Low', communicationRequired: false, status, owner: 'o' }) as ChangeRecord;
const ctx = { changeIds: ['CHG-001'], markets: ['Vietnam', 'Singapore'] };
const problems = (e: ChangeControlAssessment) => changeControlAssessmentProblems([e], ctx);

// --- what is wrong with an entry (shared by the screen and the API) ------------------------------------
t('a complete No is fine', problems(entry()).length === 0);
t('a Pending entry is fine to SAVE (it just blocks the gate)', problems(entry({ answer: 'Pending assessment', reviewer: undefined, rationale: undefined })).length === 0);
t('a blank answer is fine to save too (it counts as Pending)', problems(entry({ answer: '', reviewer: undefined, rationale: undefined })).length === 0);
t('every entry has to say which finding it is about', problems(entry({ finding: '  ' })).some((p) => /Finding is required/.test(p)));
t('Yes needs a linked record', problems(entry({ answer: 'Yes' })).some((p) => /Yes needs a linked/.test(p)));
t('Yes with a real record is fine', problems(entry({ answer: 'Yes', linkedRecordId: 'CHG-001', reviewer: undefined, rationale: undefined })).length === 0);
t('a record that is not on this project is refused', problems(entry({ answer: 'Yes', linkedRecordId: 'CHG-999' })).some((p) => /not a change record of this project/.test(p)));
t('a linked record means the answer is Yes', problems(entry({ answer: 'No', linkedRecordId: 'CHG-001' })).some((p) => /means the answer is Yes/.test(p)));
t('No needs BOTH the reviewer and the rationale', problems(entry({ reviewer: undefined })).some((p) => /No needs both/.test(p)) && problems(entry({ rationale: undefined })).some((p) => /No needs both/.test(p)));
t('an answer off the list is refused', problems(entry({ answer: 'maybe' })).some((p) => /is not one of/.test(p)));
t('a market must be one of the project\'s', problems(entry({ market: 'Mars' })).some((p) => /not one of this project's markets/.test(p)) && problems(entry({ market: 'Vietnam' })).length === 0);
t('a malformed date is refused', problems(entry({ reviewDate: '13/10/2026' })).some((p) => /review date/.test(p)));
t('problems name the entry they belong to', changeControlAssessmentProblems([entry(), entry({ finding: '' })], ctx)[0].startsWith('Assessment 2:'));
t('isPendingAnswer: blank and Pending are pending, Yes and No are not', isPendingAnswer({ answer: '' }) && isPendingAnswer({ answer: 'Pending assessment' }) && !isPendingAnswer({ answer: 'Yes' }) && !isPendingAnswer({ answer: 'No' }));

// --- what the Gate 12 trigger makes of the list -------------------------------------------------------
const state = (p: ProjectData) => evaluateTrigger(p, 'openChangeControl');
{
  const p = fresh();
  t('nothing recorded: not assessed (blocks) — an empty list is not "nothing to assess"', state(p) === 'notAssessed');
  p.changeControlAssessments = [entry()];
  t('one entry answered No: does not apply', state(p) === 'doesNotApply');
  p.changeControlAssessments = [entry(), entry({ answer: 'Pending assessment', finding: 'Eye irritation in Singapore' })];
  t('a No beside a Pending: the Pending still blocks', state(p) === 'notAssessed');
  p.changeControlAssessments = [entry(), entry({ answer: '', finding: 'blank answer' })];
  t('a No beside a blank answer: blocks as well', state(p) === 'notAssessed');
  p.changeControlAssessments = [entry(), entry({ answer: 'Yes', linkedRecordId: 'CHG-001', finding: 'Allergy report' })];
  t('a No beside a Yes: applies', state(p) === 'applies');
}
{
  const p = fresh();
  p.changes = [change('Under Review')];
  t('an open change record and no entries: applies (as before)', state(p) === 'applies');
  p.changeControlAssessments = [entry({ answer: 'Pending assessment', reviewer: undefined, rationale: undefined })];
  t('...but a Pending finding beside it still blocks — another finding having a record open does not close it', state(p) === 'notAssessed');
  p.changeControlAssessments = [entry()];
  t('an open record beside a No: applies', state(p) === 'applies');
  p.changes = [change('Completed')];
  t('a closed record does not make it apply', state(p) === 'doesNotApply');
  p.changes = [change('Under Review', 'OTHER')];
  t("another project's open change does not count", state(p) === 'doesNotApply');
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
