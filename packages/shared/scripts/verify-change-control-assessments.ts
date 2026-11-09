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
  category: 'Complaint trend',
  markets: 'Vietnam',
  reviewCycle: 'Vietnam|3m',
  answer: 'No',
  reviewer: 'Sekar',
  reviewDate: '2026-11-01',
  rationale: 'within the expected range',
  ...over,
});
const change = (status: ChangeRecord['status'], projectId = 'T-1'): ChangeRecord =>
  ({ changeId: 'CHG-001', projectId, trigger: 'x', productSku: 's', affectedArea: 'a', riskLevel: 'Low', communicationRequired: false, status, owner: 'o' }) as ChangeRecord;
const ctx = { changeIds: ['CHG-001'], markets: ['Vietnam', 'Singapore'], reviewCycles: ['Vietnam|3m', 'Vietnam|12m'] };
const problems = (e: ChangeControlAssessment) => changeControlAssessmentProblems([e], ctx);

// --- what is wrong with an entry (shared by the screen and the API) ------------------------------------
t('a complete No is fine', problems(entry()).length === 0);
t('a Pending entry is fine to SAVE with its reviewer, date and rationale (it just blocks the gate)', problems(entry({ answer: 'Pending assessment' })).length === 0);
t('...but Pending carries the same three things as Yes and No (Round 5 question 2(c))', problems(entry({ answer: 'Pending assessment', reviewer: undefined })).some((p) => /needs the reviewer, the review date and the rationale/.test(p)));
t('a blank answer is fine to save (it counts as Pending, and asks for nothing until answered)', problems(entry({ answer: '', reviewer: undefined, reviewDate: undefined, rationale: undefined })).length === 0);
t('every entry has to say which finding it is about', problems(entry({ finding: '  ' })).some((p) => /Finding is required/.test(p)));
t('Yes needs a linked record', problems(entry({ answer: 'Yes' })).some((p) => /Yes needs a linked/.test(p)));
t('Yes with a real record is fine', problems(entry({ answer: 'Yes', linkedRecordId: 'CHG-001' })).length === 0);
t('Yes carries the reviewer, date and rationale as well as the record', problems(entry({ answer: 'Yes', linkedRecordId: 'CHG-001', reviewDate: undefined })).some((p) => /needs the reviewer, the review date and the rationale/.test(p)));
t('a record that is not on this project is refused', problems(entry({ answer: 'Yes', linkedRecordId: 'CHG-999' })).some((p) => /not a change record of this project/.test(p)));
t('a linked record means the answer is Yes', problems(entry({ answer: 'No', linkedRecordId: 'CHG-001' })).some((p) => /means the answer is Yes/.test(p)));
t('No needs the reviewer, the date AND the rationale', ['reviewer', 'reviewDate', 'rationale'].every((k) => problems(entry({ [k]: undefined })).some((p) => /No needs the reviewer, the review date and the rationale/.test(p))));
t('a finding needs a source / category from the SME list', problems(entry({ category: undefined })).some((p) => /category is required/.test(p)) && problems(entry({ category: 'Rumour' })).some((p) => /not one of the finding categories/.test(p)));
t('all six categories of answer 2(b) are accepted', ['Individual complaint or adverse event', 'Complaint trend', 'Quality deviation', 'Regulator request', 'Substantiated claim challenge', 'Performance or packaging concern'].every((c) => problems(entry({ category: c })).length === 0));
t('severity is optional but, when given, is the shared scale', problems(entry({ severity: 'Critical' })).length === 0 && problems(entry({ severity: 'Severe' })).some((p) => /is not one of Low/.test(p)));
t('an answer off the list is refused', problems(entry({ answer: 'maybe' })).some((p) => /is not one of/.test(p)));
t('each market must be one of the project\'s', problems(entry({ markets: 'Mars' })).some((p) => /not one of this project's markets/.test(p)) && problems(entry({ markets: 'Vietnam' })).length === 0);
t('one finding may affect several markets (answer 2(a))', problems(entry({ markets: 'Vietnam, Singapore' })).length === 0);
t('a finding names the market(s) it affects', problems(entry({ markets: undefined })).some((p) => /choose the market/.test(p)));
t('a finding is tied to a review cycle of this project', problems(entry({ reviewCycle: 'Vietnam|99m' })).some((p) => /not a review cycle/.test(p)) && problems(entry({ reviewCycle: undefined })).some((p) => /choose the review cycle/.test(p)));
t('...but no cycle is demanded while none exists (no market has launched)', changeControlAssessmentProblems([entry({ reviewCycle: undefined })], { ...ctx, reviewCycles: [] }).length === 0);
t('a malformed date is refused', problems(entry({ reviewDate: '13/10/2026' })).some((p) => /review date/.test(p)) && problems(entry({ dateIdentified: 'yesterday' })).some((p) => /date identified/.test(p)));
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
  t('an open change record and no entries: still NOT assessed — an open record does not waive assessment of a finding (answer 2(a))', state(p) === 'notAssessed');
  p.changeControlAssessments = [entry({ answer: 'Pending assessment' })];
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
