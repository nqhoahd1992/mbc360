// Round 5 question 20: Gate 10's regulatory dossier per market — several components per market, an approval with conditions carried by a controlled
// action, a condition before launch holding Gate 11, an external notification kept apart from the internal approval, and one derived market
// summary. Pure functions on the real config and rule code. Run: npm run verify:market-dossier
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { PER_MARKET_ITEM_IDS } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS } from '../src/config/registers';
import {
  marketHasConditionalApproval,
  marketLaunchHolds,
  marketRegulatorySummary,
  marketsWithoutChecklist,
} from '../src/utils/marketDossier';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { marketRegulatoryApprovalsTakenBack } from '../src/utils/controlledBaselines';
import type { MarketTrack, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const cfg = REGISTER_CONFIGS.find((c) => c.key === 'regulatoryChecklistStatus')!;
const col = (k: string) => cfg.columns.find((c) => c.key === k)!;

const track = (market: string, over: Partial<MarketTrack> = {}): MarketTrack => ({
  market, formulaVersion: 'F1.0', pifStatus: 'Not Started', regulatoryStatus: 'Not Started', claimsApproval: 'Not Started', launchApproval: 'Not Started', ...over,
});
const action = (over: Record<string, unknown> = {}) => ({
  id: 'NA-1', gateId: 'SG10', description: 'Submit the amended label', completionCriteria: 'Label accepted', owner: 'O', dueDate: '2026-12-01', escalationTrigger: 'A week late',
  priority: 'High', status: 'Open', ...over,
});
const project = (markets: string[], rows: RegisterRow[], actions: unknown[] = []): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets, reviewers: {} } as never);
  p.identity = { ...p.identity, markets };
  p.marketTracks = markets.map((m) => track(m, { regulatoryStatus: 'Approved' })); // typed values must not count: the summary is derived
  p.formulaVersion = 'F1.0';
  p.registers = { ...p.registers, regulatoryChecklistStatus: rows };
  p.nextActions = actions as never;
  return p;
};
const done = (market: string, over: RegisterRow = {}): RegisterRow => ({
  componentId: 'RC-001', market, dossierType: 'Product notification', component: 'Product compliance record', componentVersion: 'v1', owner: 'Reg', checklistLink: 'https://x/dossier',
  status: 'Complete', regulatoryApproval: 'Approved', externalAuthorisation: 'Not required', ...over,
});

// --- the register ---------------------------------------------------------------------------------------------------------------------------------
t('a market may have several components: the market column is no longer unique', col('market').unique !== true);
t('...and every market is covered, ASEAN ones too (no market scope on the column)', col('market').marketScope === undefined);
t('each component has its own generated ID', col('componentId').autoId?.prefix === 'RC' && col('componentId').unique === true && col('componentId').editable === false);
t('component and version are columns', !!col('component') && !!col('componentVersion'));
t('the conditions, their timing and the carrying action are required for an approval with conditions and shown only then',
  ['approvalConditions', 'conditionTiming', 'conditionActionId'].every((k) => col(k).requiredWhen?.values.includes('Approved with Conditions') && col(k).shownWhen?.values?.includes('Approved with Conditions')));
t('the action link is a Next Action picker', col('conditionActionId').type === 'nextActionRef');
t('the external notification / authorisation is its own column beside the internal approval', col('externalAuthorisation').type === 'select' && col('regulatoryApproval').type === 'select');

// --- every market needs a dossier, and every component is assessed ---------------------------------------------------------------------------------
{
  const p = project(['Australia', 'Vietnam'], []);
  t('with no rows every market is missing its dossier, an ASEAN market included', marketsWithoutChecklist(p).length === 2 && marketsWithoutChecklist(p).some((m) => /^Vietnam/.test(m)), JSON.stringify(marketsWithoutChecklist(p)));
  t('a complete component per market clears both', marketsWithoutChecklist(project(['Australia', 'Vietnam'], [done('Australia'), done('Vietnam', { componentId: 'RC-002' })])).length === 0);
  const two = project(['Australia'], [done('Australia'), done('Australia', { componentId: 'RC-002', component: 'AICIS status', status: 'In Progress' })]);
  t('a second component of the same market is assessed too: while it is open the market is not done', marketsWithoutChecklist(two).length === 1 && /AICIS|RC-002/.test(marketsWithoutChecklist(two)[0]), JSON.stringify(marketsWithoutChecklist(two)));
  t('a component with no component name or version is incomplete', marketsWithoutChecklist(project(['Australia'], [done('Australia', { component: '' })])).length === 1 && marketsWithoutChecklist(project(['Australia'], [done('Australia', { componentVersion: '' })])).length === 1);
  t('a withdrawn market is no longer asked for a dossier', marketsWithoutChecklist({ ...project(['Australia', 'Vietnam'], [done('Australia')]), marketTracks: [track('Australia'), track('Vietnam', { actualLaunchDate: '2026-01-01', withdrawnDate: '2026-06-01', withdrawnReason: 'r' })] } as ProjectData).length === 0);
}

// --- passing values ---------------------------------------------------------------------------------------------------------------------------------
{
  const gap = (over: RegisterRow) => marketsWithoutChecklist(project(['Australia'], [done('Australia', over)])).length;
  t('Complete and Approved pass', gap({}) === 0);
  for (const v of ['Pending', 'Not Approved', 'Withdrawn']) t(`a regulatory approval of "${v}" does not authorise release`, gap({ regulatoryApproval: v }) === 1);
  for (const v of ['Not Started', 'In Progress', 'Awaiting Information', 'On Hold', 'Blocked']) t(`a checklist status of "${v}" blocks`, gap({ status: v }) === 1);
  t('N/A needs its rationale and an authorised reviewer', gap({ status: 'N/A — rationale required', regulatoryApproval: 'N/A — rationale required' }) === 1 && gap({ status: 'N/A — rationale required', regulatoryApproval: 'N/A — rationale required', naRationale: 'not applicable here', naReviewer: 'QA' }) === 0);
}

// --- approval with conditions -----------------------------------------------------------------------------------------------------------------------
{
  const awc = (over: RegisterRow = {}, actions: unknown[] = [action()]) =>
    project(['Australia'], [done('Australia', { regulatoryApproval: 'Approved with Conditions', approvalConditions: 'Amend the label', conditionTiming: 'Before launch', conditionActionId: 'NA-1', ...over })], actions);
  t('an approval with conditions passes Gate 10 once the conditions, their timing and a controlled action are recorded', marketsWithoutChecklist(awc()).length === 0, JSON.stringify(marketsWithoutChecklist(awc())));
  t('...not without the conditions documented', marketsWithoutChecklist(awc({ approvalConditions: '' })).length === 1);
  t('...not without saying when they must be met', marketsWithoutChecklist(awc({ conditionTiming: '' })).length === 1);
  t('...not with no action carrying them', marketsWithoutChecklist(awc({ conditionActionId: '' })).length === 1);
  t('...not when the action is not controlled (no completion criteria)', marketsWithoutChecklist(awc({}, [action({ completionCriteria: '' })])).length === 1);
  t('...not when the action was cancelled', marketsWithoutChecklist(awc({}, [action({ status: 'Cancelled' })])).length === 1);
  t('a conditional approval is flagged beside the summary', marketHasConditionalApproval(awc(), 'Australia') && !marketHasConditionalApproval(project(['Australia'], [done('Australia')]), 'Australia'));
  t('a condition required before launch holds Gate 11 until its action is Closed', marketLaunchHolds(awc()).length === 1 && marketLaunchHolds(awc({}, [action({ status: 'Closed' })])).length === 0, JSON.stringify(marketLaunchHolds(awc())));
  t('a condition that may be met after launch does not hold it', marketLaunchHolds(awc({ conditionTiming: 'After launch (permitted by the decision)' })).length === 0);
}

// --- external notification, kept apart from the internal approval ------------------------------------------------------------------------------------
{
  const gap = (over: RegisterRow) => marketsWithoutChecklist(project(['Australia'], [done('Australia', over)])).length;
  t('the external status must be said: an approved component with none recorded is incomplete', gap({ externalAuthorisation: '' }) === 1);
  t('a notification or authorisation that was made needs its evidence link', gap({ externalAuthorisation: 'Notified / submitted' }) === 1 && gap({ externalAuthorisation: 'Authorised / accepted', externalEvidenceLink: 'https://x/ref' }) === 0);
  t('one that is required and not yet made holds Gate 11 (it does not stop Gate 10)', gap({ externalAuthorisation: 'Required — not yet notified' }) === 0 && marketLaunchHolds(project(['Australia'], [done('Australia', { externalAuthorisation: 'Required — not yet notified' })])).length === 1);
}

// --- one derived summary ----------------------------------------------------------------------------------------------------------------------------
{
  const s = (rows: RegisterRow[]) => marketRegulatorySummary(project(['Australia'], rows), 'Australia');
  t('no dossier row: Not Started, whatever a track says', s([]) === 'Not Started');
  t('every component done: Approved', s([done('Australia'), done('Australia', { componentId: 'RC-002' })]) === 'Approved');
  t('one component still open: In Progress', s([done('Australia'), done('Australia', { componentId: 'RC-002', status: 'In Progress', regulatoryApproval: 'Pending' })]) === 'In Progress');
  t('one component refused, blocked or withdrawn: Blocked', s([done('Australia'), done('Australia', { componentId: 'RC-002', regulatoryApproval: 'Not Approved' })]) === 'Blocked' && s([done('Australia', { status: 'Blocked' })]) === 'Blocked');
  t('every component not applicable: N/A', s([done('Australia', { status: 'N/A — rationale required', regulatoryApproval: 'N/A — rationale required', naRationale: 'r', naReviewer: 'QA' })]) === 'N/A');
  const typed = project(['Australia'], []);
  const item = gateReadinessChecklist(typed, 'SG10').find((i) => i.id === 'sg10-reg-approval');
  t('Gate 10 reads the derived summary, not a typed Approved on the track', item?.satisfied === false, JSON.stringify(item));
}

// --- an approved market is a controlled baseline: taking its approval back (now an edit of a component) needs a Regulatory change ------------------------
{
  const p = project(['Australia'], [done('Australia')]);
  const refused = [done('Australia', { regulatoryApproval: 'Not Approved' })];
  t('moving an approved market off Approved with no covering change is a controlled-baseline edit', marketRegulatoryApprovalsTakenBack(p, refused).length === 1, JSON.stringify(marketRegulatoryApprovalsTakenBack(p, refused)));
  const covered = { ...p, changes: [{ changeId: 'CHG-1', projectId: 'T', status: 'Under Review', impactAreas: ['Regulatory'], markets: ['Australia'] }] } as unknown as ProjectData;
  t('...an open Regulatory change for the market covers it', marketRegulatoryApprovalsTakenBack(covered, refused).length === 0);
  const other = { ...p, changes: [{ changeId: 'CHG-1', projectId: 'T', status: 'Under Review', impactAreas: ['Regulatory'], markets: ['Vietnam'] }] } as unknown as ProjectData;
  t('...one for another market does not', marketRegulatoryApprovalsTakenBack(other, refused).length === 1);
  t('...and an edit that keeps the market approved, or a market that was not approved, is not one', marketRegulatoryApprovalsTakenBack(p, [done('Australia', { notes: 'x' })]).length === 0 && marketRegulatoryApprovalsTakenBack(project(['Australia'], []), refused).length === 0);
}

t('the Gate 11 condition item is judged per market lane', PER_MARKET_ITEM_IDS.has('sg11-reg-conditions'));
t('...and is a Gate 11 item', gateReadinessChecklist(project(['Australia'], []), 'SG11').some((i) => i.id === 'sg11-reg-conditions'));

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
