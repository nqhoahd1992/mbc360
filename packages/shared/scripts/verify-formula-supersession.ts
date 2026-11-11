// Round 5 question 5: a formula version's supersession is per market and per function. Pure functions over a hand-built project on the
// real lifecycle rules. Run: npm run verify:formula-supersession
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import {
  SUPERSESSION_FACTS,
  allFactsConfirmed,
  derivedVersionState,
  isSupersessionComplete,
  marketVersionState,
  marketsAwaitingSupersession,
  supersessionGaps,
  versionMarkets,
  versionsOwingSupersession,
} from '../src/utils/formulaLifecycle';
import { overdueReviews, reviewCycleOptions, reviewMilestoneLabel, reviewScheduleMilestones } from '../src/utils/postLaunch';
import type { MarketTrack, ProjectData, SupersessionDecision } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const VN = 'Vietnam';
const AU = 'Australia';
const base = (): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: [VN, AU], reviewers: {} } as never);
  p.formulaVersion = 'F2.0';
  p.formulaVersionHistory = [{ version: 'F1.0', previousVersion: '', date: '2026-01-01', changeType: 'Major', state: 'Active' }];
  p.currentFormulaVersionRecord = { previousVersion: 'F1.0', changeType: 'Major' };
  return p;
};
const track = (p: ProjectData, market: string, version: string, over: Partial<MarketTrack> = {}) => {
  const existing = p.marketTracks.find((x) => x.market === market && x.formulaVersion === version);
  const next = { ...(existing ?? ({ market, formulaVersion: version, pifStatus: 'Not started', regulatoryStatus: 'Not started', claimsApproval: 'Pending', launchApproval: 'Pending' } as MarketTrack)), ...over };
  p.marketTracks = [...p.marketTracks.filter((x) => x !== existing), next];
};
const decision = (over: Partial<SupersessionDecision> = {}): SupersessionDecision => ({
  id: 'd', version: 'F1.0', market: VN, replacementVersion: 'F2.0', effectiveTransitionDate: '', lastReleaseDate: '2026-06-01', stockDisposition: 'sell through',
  regulatoryNotificationStatus: 'notified', artworkTransition: 'new pack', pifUpdate: 'done', salesMarketingCommunication: 'sent', distributorCommunication: 'sent',
  noFurtherBatchesConfirmed: true, ...over,
});
const finished = () => ({ effectiveTransitionDate: '2026-09-01', factConfirmations: allConfirmed(), coordinatedBy: 'Q', finalApprovedBy: 'NP', confirmedBy: 'NP' });
const allConfirmed = () => Object.fromEntries(SUPERSESSION_FACTS.map((f) => [f.key, { by: 'someone', at: '2026-07-01T00:00:00Z' }]));

// --- the ten facts each belong to a function -----------------------------------------------------------------------------------------------
{
  t('there are ten facts', SUPERSESSION_FACTS.length === 10);
  const fn = (key: string) => SUPERSESSION_FACTS.find((f) => f.key === key)!.functions;
  t('stock disposition is Supply Chain\'s', fn('stockDisposition').join() === 'supply-chain');
  t('regulatory notification, artwork and PIF are Regulatory\'s', ['regulatoryNotificationStatus', 'artworkTransition', 'pifUpdate'].every((k) => fn(k).join() === 'regulatory'));
  t('both communications are Sales & Marketing\'s', ['salesMarketingCommunication', 'distributorCommunication'].every((k) => fn(k).join() === 'sales-marketing'));
  t('last release and no-further-batches are Quality or Manufacturing\'s', fn('lastReleaseDate').join() === 'quality,manufacturing' && fn('noFurtherBatchesConfirmed').join() === 'quality,manufacturing');
}

// --- a decision is complete only when every fact is confirmed, coordinated and finally approved --------------------------------------
{
  const filled = decision();
  t('facts filled but unconfirmed are not complete, and each says who must confirm it', supersessionGaps(filled).some((g) => g.includes('Supply Chain')) && !isSupersessionComplete(filled));
  const confirmed = decision({ effectiveTransitionDate: '2026-09-01', factConfirmations: allConfirmed() });
  t('every fact confirmed is still not complete: Quality has to coordinate', allFactsConfirmed(confirmed) && supersessionGaps(confirmed).join('|').includes('Coordination'));
  const coordinated = decision({ effectiveTransitionDate: '2026-09-01', factConfirmations: allConfirmed(), coordinatedBy: 'Sankar' });
  t('coordinated is still not complete: the final approver has to confirm', supersessionGaps(coordinated).join('|').includes('final approver'));
  const final = decision({ market: VN, ...finished() });
  t('confirmed, coordinated and finally approved is complete', isSupersessionComplete(final));
  t('a fact missing its value is named as missing, not as awaiting confirmation', supersessionGaps(decision({ stockDisposition: '' })).some((g) => g === 'Stock disposition or sell-through arrangement'));
  const legacy = decision({ confirmedBy: 'Lead', confirmedAt: '2026-08-01T00:00:00Z' });
  t('a decision confirmed before this existed stays complete', isSupersessionComplete(legacy));
}

// --- the state of a market: Active, Transition, Superseded --------------------------------------------------------------------------------
{
  const p = base();
  track(p, VN, 'F1.0', { actualLaunchDate: '2026-02-01', launchApproval: 'Approved' });
  track(p, AU, 'F1.0', { actualLaunchDate: '2026-02-01', launchApproval: 'Approved' });
  track(p, VN, 'F2.0');
  track(p, AU, 'F2.0');
  t('before the replacement is approved the old version is Active in both markets', marketVersionState(p, 'F1.0', VN) === 'Active' && marketVersionState(p, 'F1.0', AU) === 'Active');
  t('...and so is the version', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Active');
  track(p, VN, 'F2.0', { pifStatus: 'Approved', regulatoryStatus: 'Approved' });
  t('Gate 10 approval alone (dossier, not the release) starts nothing', marketVersionState(p, 'F1.0', VN) === 'Active');
  track(p, VN, 'F2.0', { launchApproval: 'Approved' });
  t('approved release of the replacement in Vietnam puts Vietnam into Transition, not Australia', marketVersionState(p, 'F1.0', VN) === 'Transition in Progress' && marketVersionState(p, 'F1.0', AU) === 'Active');
  t('the version is Active while any market is still Active', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Active');
  track(p, AU, 'F2.0', { launchApproval: 'Approved' });
  t('both released: the version is in Transition', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Transition in Progress');
  p.supersessionDecisions = [decision({ market: VN, ...finished() })];
  t('Vietnam completed: Vietnam is Superseded, Australia is still in Transition', marketVersionState(p, 'F1.0', VN) === 'Superseded' && marketVersionState(p, 'F1.0', AU) === 'Transition in Progress');
  t('...so the version is still in Transition, and Australia is awaiting', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Transition in Progress' && marketsAwaitingSupersession(p, 'F1.0').join() === AU);
  p.supersessionDecisions.push(decision({ market: AU, ...finished() }));
  t('every market completed: the version is Superseded', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Superseded');
  t('a version that has finished everywhere owes no more decisions', versionsOwingSupersession(p).length === 0);

  // a different approved implementation date in the transition plan
  const q = base();
  track(q, VN, 'F1.0', { actualLaunchDate: '2026-02-01', launchApproval: 'Approved' });
  track(q, VN, 'F2.0');
  q.supersessionDecisions = [decision({ effectiveTransitionDate: '2026-09-01' })];
  t('an approved effective date in the transition plan starts the transition even before the replacement is approved', marketVersionState(q, 'F1.0', VN) === 'Transition in Progress');
}

// --- a Minor change starts no transition by itself -----------------------------------------------------------------------------------------
{
  const p = createEmptyProject({ id: 'T-2', productCode: 'T', projectLead: 'x', markets: [VN], reviewers: {} } as never);
  p.formulaVersion = 'F1.1';
  p.formulaVersionHistory = [{ version: 'F1.0', previousVersion: '', date: '2026-01-01', changeType: 'Major', state: 'Active' }];
  p.currentFormulaVersionRecord = { previousVersion: 'F1.0', changeType: 'Minor' };
  // a Minor change carries the tracks over to the new version
  track(p, VN, 'F1.1', { actualLaunchDate: '2026-02-01', launchApproval: 'Approved' });
  t('the old version is still on sale where its Minor successor is (the stock is what the transition is about)', versionMarkets(p, 'F1.0').join() === VN);
  t('a Minor successor does NOT start the transition, although it is approved', marketVersionState(p, 'F1.0', VN) === 'Active');
  p.supersessionDecisions = [decision({ effectiveTransitionDate: '2026-09-01' })];
  t('...it starts with the approved effective date', marketVersionState(p, 'F1.0', VN) === 'Transition in Progress');
  // a documentation-only correction is a document revision
  p.supersessionDecisions = [];
  p.currentFormulaVersionRecord = { previousVersion: 'F1.0', changeType: 'Minor', documentationOnly: true };
  t('a documentation-only correction needs no stock transition: the version it revises is Superseded', derivedVersionState(p, p.formulaVersionHistory[0]) === 'Superseded');
}

// --- a version that was never released ------------------------------------------------------------------------------------------------------
{
  const p = base();
  p.formulaVersionHistory = [{ version: 'F1.0', previousVersion: '', date: '2026-01-01', changeType: 'Major', state: 'Superseded', noReleaseConfirmedBy: 'Tuan' }];
  t('a version never on sale keeps the state a person confirmed (no transition is invented)', versionMarkets(p, 'F1.0').length === 0 && derivedVersionState(p, p.formulaVersionHistory[0]) === 'Superseded');
}

// --- the post-launch reviews: the market's schedule is kept, a changed formula adds its own early ones -----------------------------------
{
  const p = base();
  track(p, VN, 'F1.0', { actualLaunchDate: '2026-01-01', launchApproval: 'Approved' });
  track(p, VN, 'F2.0', { actualLaunchDate: '2026-06-01', launchApproval: 'Approved' });
  const opts = { enhanced: false, asOf: '2027-12-31' };
  const all = reviewScheduleMilestones(p, opts);
  t('the market schedule runs from the FIRST launch (3 months after 2026-01-01)', all.some((m) => m.milestone === '3m' && m.dueDate === '2026-04-01'));
  t('the Major replacement has its own early review, dated from ITS launch', all.some((m) => m.milestone === 'F2.0:3m' && m.dueDate === '2026-09-01'));
  t('...and it is named for the version', reviewMilestoneLabel('F2.0:3m').startsWith('F2.0'));
  t('the older version\'s obligations are not restarted when it leaves the market', (() => {
    p.supersessionDecisions = [decision({ market: VN, ...finished() })];
    return reviewScheduleMilestones(p, opts).some((m) => m.milestone === '3m' && m.dueDate === '2026-04-01');
  })());
  t('an enhanced-surveillance product also gets the new version\'s one-month review', reviewScheduleMilestones(p, { ...opts, enhanced: true }).some((m) => m.milestone === 'F2.0:1m'));
  t('the version\'s review is among the cycles a finding can belong to', reviewCycleOptions(p, opts).some((c) => c.key === `${VN}|F2.0:3m`));
  t('an overdue early review of the new version is listed', overdueReviews(p, opts).some((m) => m.milestone === 'F2.0:3m'));
  // a Minor replacement has no early milestones of its own
  const q = base();
  q.currentFormulaVersionRecord = { previousVersion: 'F1.0', changeType: 'Minor' };
  track(q, VN, 'F1.0', { actualLaunchDate: '2026-01-01', launchApproval: 'Approved' });
  track(q, VN, 'F2.0', { actualLaunchDate: '2026-06-01', launchApproval: 'Approved' });
  t('a Minor version launched beside the first has no early milestones of its own', !reviewScheduleMilestones(q, opts).some((m) => m.milestone.startsWith('F2.0:')));
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
