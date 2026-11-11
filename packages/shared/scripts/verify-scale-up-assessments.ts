// Round 5 question 7: the Gate 9 scale-up / pilot assessment is a LIST, one entry per affected area. Pure functions over a hand-built
// project on the real rule engine. Run: npm run verify:scale-up-assessments
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { SCALE_UP_AREA_GROUPS, SCALE_UP_AREA_NONE, SCALE_UP_OPEN_AREA, SCALE_UP_REVIEW_AREAS } from '../src/config/assessments';
import { evaluateTrigger, gateReadinessChecklist } from '../src/utils/gateProgress';
import { SCALE_UP_WAIVER_ROLES, hasAffectedArea, isNewFormula, scaleUpAssessmentProblems, scaleUpListState } from '../src/utils/scaleUpAssessments';
import type { ProjectData, ScaleUpAssessment } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const base = (natures: string[] = []): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  for (const item of p.checklists['projectNature'] ?? []) item.selected = natures.includes(item.label);
  return p;
};
const entry = (over: Partial<ScaleUpAssessment> = {}): ScaleUpAssessment => ({
  id: 'e1', area: 'Batch size', description: '50 kg to 500 kg', answer: 'Yes', rationale: 'ten times larger', verification: 'one pilot batch',
  assessor: 'Sekar', assessedDate: '2026-11-01', timing: 'Before formula lock', ...over,
});
const ctx = { changeIds: ['CHG-1'], newFormula: false };
const problems = (e: ScaleUpAssessment[], c = ctx) => scaleUpAssessmentProblems(e, c);

// --- the eighteen areas keep their identities and are grouped for display -----------------------------------------------------------------
{
  const grouped = SCALE_UP_AREA_GROUPS.flatMap((g) => g.areas);
  t('there are eighteen areas', SCALE_UP_REVIEW_AREAS.length === 18);
  t('every area is in exactly one display group, none added or lost', grouped.length === 18 && new Set(grouped).size === 18 && SCALE_UP_REVIEW_AREAS.every((a) => grouped.includes(a)));
  t('there are three groups: process/site/scale, formula/materials, other performance risks', SCALE_UP_AREA_GROUPS.map((g) => g.label).join('|') === 'Process, site and scale|Formula and materials|Other performance risks');
  t('the open-ended area is the last of the eighteen', SCALE_UP_OPEN_AREA === SCALE_UP_REVIEW_AREAS[17]);
}

// --- what is wrong with an entry ----------------------------------------------------------------------------------------------------------
{
  t('a complete Yes entry has no problem', problems([entry()]).length === 0);
  t('an entry with no area is refused', problems([entry({ area: '' })]).length > 0);
  t('an area outside the controlled list is refused', problems([entry({ area: 'Colour of the lid' })]).length > 0);
  t('the open-ended area needs a description', problems([entry({ area: SCALE_UP_OPEN_AREA, description: '' })]).some((p) => /describe/.test(p)));
  t('a Pending entry needs only its area (and the description of the open one)', problems([entry({ answer: 'Pending assessment', rationale: '', verification: '', assessor: '', assessedDate: '', timing: undefined })]).length === 0);
  t('a Yes names the verification it requires', problems([entry({ verification: '' })]).some((p) => /verification/.test(p)));
  t('a Yes or No carries its reason, assessor and date', ['rationale', 'assessor', 'assessedDate'].every((f) => problems([entry({ answer: 'No', [f]: '' })]).length > 0));
  t('a change after the formula lock links its Change Control record', problems([entry({ timing: 'After formula lock' })]).some((p) => /Change Control/.test(p)));
  t('...and the record must exist on the project', problems([entry({ timing: 'After formula lock', linkedChangeId: 'CHG-9' })]).some((p) => /not a Change Control record/.test(p)));
  t('...a real one passes', problems([entry({ timing: 'After formula lock', linkedChangeId: 'CHG-1' })]).length === 0);
  t('a change before the lock may link the iteration, and needs no Change Control', problems([entry({ linkedIteration: 'IT-3' })]).length === 0);
  t('the timing must be said', problems([entry({ timing: undefined })]).some((p) => /before or after/.test(p)));
  const none = entry({ area: SCALE_UP_AREA_NONE, answer: 'No', timing: undefined, verification: undefined, description: undefined, rationale: 'nothing changes at scale' });
  t('the reviewed "no affected area" record is a No with its reason, and needs no timing', problems([none]).length === 0);
  t('"no affected area" cannot be answered Yes', problems([{ ...none, answer: 'Yes', verification: 'x' }]).some((p) => /answered No/.test(p)));
}

// --- a new formula: a No is a waiver, and it needs Quality, Manufacturing and R&I -------------------------------------------------------
{
  const no = entry({ answer: 'No', verification: undefined });
  const newCtx = { changeIds: [], newFormula: true };
  t('saving a No on a new formula is allowed without the whole waiver (the three confirm one at a time)', problems([no], newCtx).length === 0);
  const strict = { ...newCtx, requireWaiver: true };
  const needs = problems([no], strict).join('|');
  t('...but Gate 9 needs the whole waiver: justification, supporting verification and three confirmations', /justification/.test(needs) && /supporting verification/.test(needs) && SCALE_UP_WAIVER_ROLES.every((r) => needs.includes(r.label)), needs);
  const waived = entry({
    answer: 'No', verification: undefined, waiverJustification: 'equivalent to the qualified process at the second site', waiverEvidenceLink: 'http://x',
    waiverQualityBy: 'Q', waiverManufacturingBy: 'M', waiverRiBy: 'R',
  });
  t('a complete waiver passes', problems([waived], strict).length === 0);
  t('one missing confirmation is enough to fail it', problems([{ ...waived, waiverManufacturingBy: '' }], strict).some((p) => /Manufacturing/.test(p)));
  t('a No on a project that is not a new formula needs no waiver', problems([no], { changeIds: [], newFormula: false, requireWaiver: true }).length === 0);
}

// --- when the assessment applies ------------------------------------------------------------------------------------------------------------
{
  const noneEntry = entry({ area: SCALE_UP_AREA_NONE, answer: 'No', timing: undefined, verification: undefined, description: undefined, rationale: 'nothing at scale' });
  const trig = (p: ProjectData) => evaluateTrigger(p, 'scaleUpRiskIdentified');
  const newDev = base(['New development']);
  t('"New development" switches it on (primary or secondary — any tick)', trig(newDev) === 'applies' && isNewFormula(newDev));
  t('a plain Reformulation still needs the documented risk screen', trig(base(['Reformulation'])) === 'applies');
  const major = base(['Packaging change']);
  major.formulaVersionHistory = [{ version: 'F1.0', previousVersion: '', date: '2026-01-01', changeType: 'Major', state: 'Active' }];
  t('a Major formula change switches it on', trig(major) === 'applies');
  const other = base(['Packaging change']);
  t('another project type with nothing recorded is not yet assessed', trig(other) === 'notAssessed');
  other.scaleUpAssessments = [noneEntry];
  t('...a reviewed "no affected area" record means it does not apply', trig(other) === 'doesNotApply');
  other.scaleUpAssessments = [{ ...noneEntry, answer: 'Pending assessment' }];
  t('...but that record still Pending is not yet assessed', trig(other) === 'notAssessed');
  other.scaleUpAssessments = [entry()];
  t('picking an affected area triggers an assessment whatever the project type', trig(other) === 'applies' && hasAffectedArea(other));
  newDev.scaleUpAssessments = [noneEntry];
  t('on a new formula a "no affected area" record cannot switch the assessment off', trig(newDev) === 'applies');
}

// --- the Gate 9 readiness item ---------------------------------------------------------------------------------------------------------------
{
  const p = base(['New development']);
  const item = (pp: ProjectData) => gateReadinessChecklist(pp, 'SG09').find((i) => i.id === 'sg09-scaleup')!;
  p.gateChecks = p.gateChecks.map((c) => (c.gate === '09' && c.check === 'Pilot/scale-up and release criteria assessed' ? { ...c, done: true, ynna: 'Y' } : c));
  t('an empty list is incomplete: the item blocks', !item(p).satisfied && scaleUpListState(p) === 'empty');
  p.scaleUpAssessments = [entry({ answer: 'Pending assessment', rationale: '', verification: '', assessor: '', assessedDate: '', timing: undefined })];
  t('a Pending entry blocks Gate 9', !item(p).satisfied && scaleUpListState(p) === 'pending');
  p.scaleUpAssessments = [entry()];
  t('a complete Yes entry (with the Key Gate Check done) satisfies it', item(p).satisfied && scaleUpListState(p) === 'complete', JSON.stringify(item(p)).slice(0, 160));
  p.scaleUpAssessments = [entry({ answer: 'No', verification: undefined })];
  t('on a new formula a bare No does not satisfy it: the waiver is missing', !item(p).satisfied && scaleUpListState(p) === 'incomplete');
  p.gateChecks = p.gateChecks.map((c) => (c.gate === '09' ? { ...c, done: false, ynna: 'NA' } : c));
  p.scaleUpAssessments = [entry()];
  t('the Key Gate Check is still required beside the list', !item(p).satisfied);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
