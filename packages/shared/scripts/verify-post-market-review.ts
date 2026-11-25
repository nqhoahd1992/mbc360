// Round 5 question 22: how a post-launch finding is dealt with, and which signals bring the review forward. Pure functions on the real config and rule
// code. Run: npm run verify:post-market-review
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { PER_MARKET_ITEM_IDS } from '../src/config/gateReadiness';
import { POST_MARKET_CATEGORIES, TREND_CONCLUSIONS } from '../src/config/postMarketReview';
import { REGISTER_CONFIGS } from '../src/config/registers';
import {
  capaFindingGaps,
  capaTriageGaps,
  openCriticalCapa,
  postMarketSignalsBringingReviewForward,
  trendRowGaps,
} from '../src/utils/postMarketReview';
import { evaluateTrigger, gateBlockers, gateReadinessChecklist } from '../src/utils/gateProgress';
import type { CapaRecord, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const record = (over: Partial<CapaRecord> = {}): CapaRecord => ({
  id: 'PM-001', market: 'Vietnam', eventType: 'Complaint', summary: 's', severity: 'Medium', status: 'In Progress', owner: 'O',
  category: 'General information', significance: 'Not significant', reviewer: 'R', escalation: 'Not escalated — handled in triage', ...over,
});
const performance = (over: Partial<CapaRecord> = {}): CapaRecord =>
  record({
    category: 'Performance or efficacy question', assessment: 'Looked at the batch', conclusion: 'Within spec', evidenceLink: 'https://x/e', impactNote: 'No claim affected',
    changeDecision: 'No change needed', acceptedOpenBy: 'Q', acceptedOpenDue: '2026-12-31', ...over,
  });
const trend = (over: RegisterRow = {}): RegisterRow => ({
  trendId: 'MT-001', market: 'Vietnam', periodStart: '2026-01-01', periodEnd: '2026-03-31', sourceRecords: 'PM-001..PM-004', productVersionBatches: 'F1.0 / B1-B3', reportCount: 4,
  comparisonPeriod: 'Q4 2025', interpretation: 'Within the usual range', conclusion: 'Not a meaningful trend', reviewer: 'R', reviewDate: '2026-04-05', ...over,
});
const project = (capa: CapaRecord[], trends: RegisterRow[] = []): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers: {} } as never);
  p.capa = capa;
  p.registers = { ...p.registers, postMarketTrends: trends };
  p.marketTracks = [{ market: 'Vietnam', formulaVersion: 'F1.0', pifStatus: 'Approved', regulatoryStatus: 'Approved', claimsApproval: 'Approved', launchApproval: 'Approved', actualLaunchDate: '2999-01-01' }]; // launched far ahead: no scheduled review is due, so only the signals under test can bring one forward
  p.formulaVersion = 'F1.0';
  return p;
};
const item = (p: ProjectData, id: string) => gateReadinessChecklist(p, 'SG12').find((i) => i.id === id);

// --- the lists and the register ------------------------------------------------------------------------------------------------------------------
t('the five kinds of report are the answer\'s own', POST_MARKET_CATEGORIES.join(' | ') === 'Performance or efficacy question | Safety or adverse event | Quality or packaging | Regulatory | General information');
t('a trend is concluded meaningful or not, by the reviewer (no numerical threshold column)', TREND_CONCLUSIONS.length === 2 && !REGISTER_CONFIGS.find((c) => c.key === 'postMarketTrends')!.columns.some((c) => /threshold/i.test(`${c.key} ${c.label}`)));
{
  const cfg = REGISTER_CONFIGS.find((c) => c.key === 'postMarketTrends')!;
  const keys = cfg.columns.map((c) => c.key);
  t('the trends register has every field the answer lists', ['sourceRecords', 'periodStart', 'periodEnd', 'market', 'productVersionBatches', 'reportCount', 'denominator', 'comparisonPeriod', 'interpretation', 'reviewer', 'reviewDate', 'actionId'].every((k) => keys.includes(k)));
  t('...with a generated ID, at Gate 12', cfg.columns.find((c) => c.key === 'trendId')?.autoId?.prefix === 'MT' && cfg.gate === '12');
}

// --- triage ------------------------------------------------------------------------------------------------------------------------------------
t('every record records its kind, significance, reviewer and escalation decision', capaTriageGaps(record()).length === 0 && capaTriageGaps(record({ category: '', significance: '', reviewer: '', escalation: '' })).length === 4);

// --- a performance finding is dealt with in the same record ----------------------------------------------------------------------------------------------
{
  t('only a performance or efficacy question needs the assessment; any other kind needs none', capaFindingGaps(record({ category: 'Quality or packaging' })).length === 0 && capaFindingGaps(performance()).length === 0);
  t('...it needs assessment, conclusion, evidence, impact and Change Control decision', capaFindingGaps(performance({ assessment: '', conclusion: '', evidenceLink: '', impactNote: '', changeDecision: '' })).length >= 5);
  t('...a raised Change Control needs its record', capaFindingGaps(performance({ changeDecision: 'Change Control raised' })).length === 1 && capaFindingGaps(performance({ changeDecision: 'Change Control raised', changeId: 'CHG-1' })).length === 0);
  t('corrective work still open is carried only when explicitly accepted with its due date', capaFindingGaps(performance({ acceptedOpenBy: '' })).length === 1 && capaFindingGaps(performance({ acceptedOpenDue: '' })).length === 1);
  t('...closed work needs its verification', capaFindingGaps(performance({ status: 'Complete' })).length === 1 && capaFindingGaps(performance({ status: 'Complete', verifiedBy: 'V' })).length === 0);
  t('a Critical issue cannot be carried open, accepted or not', capaFindingGaps(performance({ severity: 'Critical' })).some((g) => /Critical/.test(g)));
  t('a Critical issue still open is listed, a closed one is not', openCriticalCapa(project([record({ severity: 'Critical' })])).length === 1 && openCriticalCapa(project([record({ severity: 'Critical', status: 'Complete' })])).length === 0);
}

// --- trends ------------------------------------------------------------------------------------------------------------------------------------
t('a complete trend row has no gap; the denominator is optional', trendRowGaps(trend()).length === 0 && trendRowGaps(trend({ denominator: 120 })).length === 0);
t('...every other field is needed, and a meaningful trend also names its action', trendRowGaps(trend({ interpretation: '' })).length === 1 && trendRowGaps(trend({ conclusion: 'Meaningful trend' })).length === 1 && trendRowGaps(trend({ conclusion: 'Meaningful trend', action: 'Review the filling line' })).length === 0);

// --- what brings the review forward ----------------------------------------------------------------------------------------------------------------
{
  t('a minor query advances nothing', postMarketSignalsBringingReviewForward(project([record()])).length === 0);
  t('a significant adverse event, quality or regulatory report does', ['Safety or adverse event', 'Quality or packaging', 'Regulatory'].every((category) => postMarketSignalsBringingReviewForward(project([record({ category, significance: 'Significant' })])).length === 1));
  t('...so does a record the reviewer escalated, and urgent safety triage does not wait', postMarketSignalsBringingReviewForward(project([record({ escalation: 'Review brought forward' })])).length === 1 && postMarketSignalsBringingReviewForward(project([record({ escalation: 'Urgent safety triage' })])).length === 1);
  t('...a performance challenge according to its significance: significant yes, not significant no', postMarketSignalsBringingReviewForward(project([performance({ significance: 'Significant' })])).length === 1 && postMarketSignalsBringingReviewForward(project([performance()])).length === 0);
  t('...and a trend concluded meaningful', postMarketSignalsBringingReviewForward(project([], [trend({ conclusion: 'Meaningful trend' })])).length === 1 && postMarketSignalsBringingReviewForward(project([], [trend()])).length === 0);
  t('the post-launch review trigger fires on such a signal', evaluateTrigger(project([record({ category: 'Safety or adverse event', significance: 'Significant' })]), 'postLaunchReviewDue') === 'applies');
  t('...and the performance-feedback trigger on a performance finding, not on a routine claim question', evaluateTrigger(project([performance()]), 'productPerformanceFeedback') === 'applies' && evaluateTrigger(project([record({ category: 'General information' })]), 'productPerformanceFeedback') !== 'applies');
}

// --- the Gate 12 items ---------------------------------------------------------------------------------------------------------------------------------
{
  t('the three Gate 12 items exist; the two new are judged per market', GATE_READINESS.SG12.some((r) => r.id === 'sg12-signals-triaged') && GATE_READINESS.SG12.some((r) => r.id === 'sg12-critical-open') && PER_MARKET_ITEM_IDS.has('sg12-signals-triaged') && PER_MARKET_ITEM_IDS.has('sg12-critical-open'));
  t('a record not yet triaged holds the triage item; a triaged one clears it', item(project([record({ significance: '' })]), 'sg12-signals-triaged')?.satisfied === false && item(project([record()]), 'sg12-signals-triaged')?.satisfied === true);
  t('...and so does an incomplete trend', item(project([], [trend({ interpretation: '' })]), 'sg12-signals-triaged')?.satisfied === false);
  t('nothing reported at all is a real answer: the triage item is satisfied', item(project([]), 'sg12-signals-triaged')?.satisfied === true);
  t('a Critical issue left open blocks even Proceed with Conditions', gateBlockers(project([record({ severity: 'Critical' })]), 'SG12', 'Proceed with Conditions').some((b) => b.id === 'sg12-critical-open'));
  t('the performance item needs the finding dealt with as well as the intake check', item(project([performance({ assessment: '' })]), 'sg12-performance')?.satisfied === false);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
