// Round 5 question 19: Gates 10-12 per market, and a withdrawn market's Gate 12 obligations. Pure functions on the real config and rule code
// (the lane flows over HTTP are the "withdrawn market" and SG10 sections of the e2e). Run: npm run verify:market-gates
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { PER_MARKET_GATES, gateSignOffMarkets } from '../src/config/gateSignOff';
import {
  gate12Markets,
  withdrawalClosureGaps,
  withdrawalClosureOpen,
} from '../src/utils/postLaunch';
import {
  isGateLaneOpen,
  isGateUnlocked,
  marketGatePassed,
  marketGateStandings,
  marketsReadySummary,
} from '../src/utils/gateProgress';
import type { MarketTrack, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const track = (market: string, over: Partial<MarketTrack> = {}): MarketTrack => ({
  market, formulaVersion: 'F1.0', pifStatus: 'Not Started', regulatoryStatus: 'Not Started', claimsApproval: 'Not Started', launchApproval: 'Not Started', ...over,
});
const project = (tracks: MarketTrack[], markets = tracks.map((x) => x.market)): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets, reviewers: {} } as never);
  p.identity = { ...p.identity, markets };
  p.marketTracks = tracks;
  p.formulaVersion = 'F1.0';
  return p;
};

// --- the closure of a withdrawn market ---------------------------------------------------------------------------------------------------------------
{
  const sold = track('Vietnam', { actualLaunchDate: '2026-01-01', withdrawnDate: '2026-06-01', withdrawnReason: 'range ended' });
  const never = track('Australia', { withdrawnDate: '2026-06-01', withdrawnReason: 'never went ahead' });
  const selling = track('Singapore', { actualLaunchDate: '2026-02-01' });
  t('a withdrawn market the product was sold in has an open closure', withdrawalClosureOpen(sold));
  t('...one it never launched in has none (its withdrawal reason closes it)', !withdrawalClosureOpen(never));
  t('...and a market still selling has none', !withdrawalClosureOpen(selling));
  t('a confirmed closure is no longer open', !withdrawalClosureOpen({ ...sold, withdrawalClosedAt: '2026-09-01' }));
  const p = project([sold, never, selling]);
  t('Gate 12 has a lane for the sold-and-withdrawn market and the selling one, not for the never-launched one',
    JSON.stringify(gate12Markets(p)) === JSON.stringify(['Vietnam', 'Singapore']) && JSON.stringify(gateSignOffMarkets(p, 'SG12')) === JSON.stringify(['Vietnam', 'Singapore']), JSON.stringify(gateSignOffMarkets(p, 'SG12')));
  t('Gates 10 and 11 end with the withdrawal for both withdrawn markets',
    JSON.stringify(gateSignOffMarkets(p, 'SG10')) === JSON.stringify(['Singapore']) && JSON.stringify(gateSignOffMarkets(p, 'SG11')) === JSON.stringify(['Singapore']));
  t('a closure confirmed removes the market from the Gate 12 lanes', JSON.stringify(gate12Markets(project([{ ...sold, withdrawalClosedAt: '2026-09-01' }, selling]))) === JSON.stringify(['Singapore']));
  t('a closure cannot be confirmed with nothing recorded', withdrawalClosureGaps(p, sold, '2026-07-01').length === 2);
  t('...nor before its period ends, and the gap names the date', withdrawalClosureGaps(p, { ...sold, withdrawalClosureCriteria: 'x', withdrawalClosureUntil: '2026-12-01' }, '2026-07-01').some((g) => /2026-12-01/.test(g)));
  t('...it can once the criteria and period are recorded and the period has ended', withdrawalClosureGaps(p, { ...sold, withdrawalClosureCriteria: 'x', withdrawalClosureUntil: '2026-06-30' }, '2026-07-01').length === 0);
  const withCapa = project([sold]);
  withCapa.capa = [{ id: 'CAPA-1', market: 'Vietnam', eventType: 'Complaint', summary: 's', severity: 'Low', status: 'In Progress', owner: 'o' }];
  t('an unclosed complaint / adverse event / CAPA of the market stops it', withdrawalClosureGaps(withCapa, { ...sold, withdrawalClosureCriteria: 'x', withdrawalClosureUntil: '2026-06-30' }, '2026-07-01').some((g) => /CAPA-1/.test(g)));
  withCapa.capa = [{ ...withCapa.capa[0], status: 'Complete' }];
  t('...but one that is done, or belongs to another market, does not', withdrawalClosureGaps(withCapa, { ...sold, withdrawalClosureCriteria: 'x', withdrawalClosureUntil: '2026-06-30' }, '2026-07-01').length === 0);
}

// --- a lane opens when the shared Gates 1-9 are done AND the market passed the gate before it -----------------------------------------------------------
{
  const p = project([track('Vietnam'), track('Australia')]);
  t('the per-market gates are SG10, SG11, SG12', PER_MARKET_GATES.join(',') === 'SG10,SG11,SG12');
  t('no lane is open while Gates 1-9 are not done', ['SG10', 'SG11', 'SG12'].every((g) => !isGateLaneOpen(p, g, 'Vietnam')));
  t('a market that is not a lane of the gate has no open lane', !isGateLaneOpen(p, 'SG10', 'Atlantis'));
  t('no market has passed a per-market gate on a project that has not started them', !marketGatePassed(p, 'SG10', 'Vietnam') && !marketGatePassed(p, 'SG12', 'Australia'));
  t('SG11 is not open for work on such a project', !isGateUnlocked(p, 'SG11'));
  const s = marketsReadySummary(p);
  t('the summary reads "No market ready" with both markets counted', s.state === 'No market ready' && s.total === 2 && s.ready === 0, JSON.stringify(s));
  t('the summary of a project with no markets says so', marketsReadySummary(project([], [])).state === 'No markets');
  const standings = marketGateStandings(p);
  t('each market has a standing of its own', standings.length === 2 && standings.every((x) => x.passed.length === 0 && !x.ready && !x.withdrawn));
  const withWithdrawn = project([track('Vietnam'), track('Australia', { actualLaunchDate: '2026-01-01', withdrawnDate: '2026-06-01', withdrawnReason: 'r' })]);
  t('a withdrawn market is shown as withdrawn and does not hold the "all markets ready" summary back',
    marketGateStandings(withWithdrawn).find((x) => x.market === 'Australia')?.withdrawn === true && marketsReadySummary(withWithdrawn).total === 1);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
