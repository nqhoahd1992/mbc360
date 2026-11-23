// Round 5 question 12: a market added after Gate 1 needs Regulatory's impact assessment; what differs decides which reviews reopen.
// Pure functions over a hand-built project on the real rule engine. Run: npm run verify:market-additions
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import {
  MARKET_DIFFERENCE_KINDS,
  gatesToReopen,
  marketAdditionProblems,
  marketAdditionScope,
  marketIsHeldByAssessment,
  optionalReviewsFor,
  pendingMarketAdditions,
} from '../src/utils/marketAdditions';
import { marketAdditionReviewMilestone, reviewMilestoneLabel } from '../src/utils/postLaunch';
import type { MarketAdditionAssessment, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

const ING = 'Ingredient restriction / permitted level';
const CLAIM = 'Claim / intended use / user population';
const PACK = 'Pack, language, warning or declaration';
const SAFETY = 'New safety / exposure requirement';

const base = (): ProjectData => createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const pass = (p: ProjectData, ids: string[]) => {
  for (const g of p.gates) if (ids.includes(g.gateId)) Object.assign(g, { status: 'Complete', decision: 'Proceed' });
  return p;
};
const entry = (over: Partial<MarketAdditionAssessment> = {}): MarketAdditionAssessment => ({
  id: 'a1', market: 'Australia', differences: [], noDifference: false, extraGates: [], affectedMarkets: [], inputFrom: [], reopenedGateIds: [], ...over,
});
const withEntry = (p: ProjectData, e: MarketAdditionAssessment) => ({ ...p, marketAdditionAssessments: [e] });

// --- the table of the answer ---------------------------------------------------------------------------------------------------------------
t('four kinds of difference', MARKET_DIFFERENCE_KINDS.length === 4);
t('ingredient: Gate 4 outright', same(marketAdditionScope(entry({ differences: [ING] })).gates, ['SG04']));
t('claim: Gate 3 outright', same(marketAdditionScope(entry({ differences: [CLAIM] })).gates, ['SG03']));
t('pack: Gate 6 outright, Gates 10-11 are the market lane', (() => {
  const s = marketAdditionScope(entry({ differences: [PACK] }));
  return same(s.gates, ['SG06']) && same(s.marketGates, ['SG10', 'SG11']);
})());
t('safety: Gates 4 and 7 outright', same(marketAdditionScope(entry({ differences: [SAFETY] })).gates, ['SG04', 'SG07']));
t('two kinds combine, in gate order', same(marketAdditionScope(entry({ differences: [SAFETY, CLAIM] })).gates, ['SG03', 'SG04', 'SG07']));
t('a conditional review counts only when Regulatory chose it', same(marketAdditionScope(entry({ differences: [ING], extraGates: ['SG05', 'SG09'] })).gates, ['SG04', 'SG05', 'SG09']));
t('a conditional review the difference does not allow is ignored', same(marketAdditionScope(entry({ differences: [ING], extraGates: ['SG02'] })).gates, ['SG04']));
t('no substantive difference reopens nothing', same(marketAdditionScope(entry({ noDifference: true, differences: [ING] })).gates, []));
t('the optional reviews of ingredient are 5, 7, 8, 9', same(optionalReviewsFor([ING]).map((o) => o.gateId), ['SG05', 'SG07', 'SG08', 'SG09']));

// --- what a finished assessment must carry -------------------------------------------------------------------------------------------------
const ok = { differences: [ING], noDifference: false, extraGates: [] as string[], inputFrom: [] as string[], conclusion: 'a preservative is capped at 0.3%', equivalenceConclusion: '' };
t('a complete difference assessment has no problems', marketAdditionProblems(ok).length === 0);
t('nothing chosen is incomplete', marketAdditionProblems({ ...ok, differences: [] }).length > 0);
t('a difference without a conclusion is incomplete', marketAdditionProblems({ ...ok, conclusion: '' }).length > 0);
t('a made-up kind of difference is refused', marketAdditionProblems({ ...ok, differences: ['Colour'] }).length > 0);
t('a conditional gate the difference does not allow is refused', marketAdditionProblems({ ...ok, extraGates: ['SG02'] }).length > 0);
t('no difference needs the equivalence conclusion', marketAdditionProblems({ ...ok, differences: [], noDifference: true, conclusion: '', equivalenceConclusion: '' }).length > 0);
t('no difference with the conclusion is complete', marketAdditionProblems({ ...ok, differences: [], noDifference: true, conclusion: '', equivalenceConclusion: 'same rules as Singapore, evidence reused' }).length === 0);
t('no difference cannot be combined with a difference', marketAdditionProblems({ ...ok, noDifference: true, equivalenceConclusion: 'x' }).length > 0);
t('input from an unknown function is refused', marketAdditionProblems({ ...ok, inputFrom: ['Marketing'] }).length > 0);
t('input from Safety, R&I and Quality is accepted', marketAdditionProblems({ ...ok, inputFrom: ['Safety', 'R&I', 'Quality'] }).length === 0);

// --- a shared issue: other markets of the project the finding reaches --------------------------------------------------------------------
t('naming another market of the project is accepted', marketAdditionProblems({ ...ok, affectedMarkets: ['Vietnam'], market: 'Australia', projectMarkets: ['Vietnam', 'Australia'] }).length === 0);
t('a market that is not in the project is refused', marketAdditionProblems({ ...ok, affectedMarkets: ['Atlantis'], market: 'Australia', projectMarkets: ['Vietnam', 'Australia'] }).length > 0);
t('the added market cannot name itself', marketAdditionProblems({ ...ok, affectedMarkets: ['Australia'], market: 'Australia', projectMarkets: ['Vietnam', 'Australia'] }).length > 0);
t('no substantive difference reaches no other market', marketAdditionProblems({ ...ok, differences: [], noDifference: true, conclusion: '', equivalenceConclusion: 'x', affectedMarkets: ['Vietnam'], market: 'Australia', projectMarkets: ['Vietnam', 'Australia'] }).length > 0);
t('the linked review has its own milestone, named for the added market', marketAdditionReviewMilestone('Australia') === 'market-added:Australia' && /Australia/.test(reviewMilestoneLabel('market-added:Australia')));

// --- what reopens: only gates that stand passed --------------------------------------------------------------------------------------------
{
  const p = pass(base(), ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07']);
  t('ingredient difference reopens Gate 4 when it has passed', same(gatesToReopen(p, entry({ differences: [ING] })), ['SG04']));
  t('safety difference reopens Gates 4 and 7', same(gatesToReopen(p, entry({ differences: [SAFETY] })), ['SG04', 'SG07']));
  const early = pass(base(), ['SG01', 'SG02', 'SG03']);
  t('a gate that has not passed is not reopened', same(gatesToReopen(early, entry({ differences: [SAFETY] })), []));
  t('no difference reopens nothing even with every gate passed', same(gatesToReopen(p, entry({ noDifference: true })), []));
}

// --- the market is held until assessed; the others carry on -------------------------------------------------------------------------------
{
  const p = withEntry(base(), entry());
  t('a pending assessment holds its market', marketIsHeldByAssessment(p, 'Australia'));
  t('it does not hold another market', !marketIsHeldByAssessment(p, 'Vietnam'));
  t('it is listed as pending', pendingMarketAdditions(p).length === 1);
  const done = withEntry(base(), entry({ noDifference: true, equivalenceConclusion: 'x', assessedAt: '2026-11-13T00:00:00Z', assessedBy: 'R' }));
  t('a finished assessment holds nothing', !marketIsHeldByAssessment(done, 'Australia') && pendingMarketAdditions(done).length === 0);
  t('a project with no added market has nothing pending', pendingMarketAdditions(base()).length === 0);

  // The readiness items at Gates 10 and 11 read the same fact.
  const item = (proj: ProjectData, gate: string, id: string) => gateReadinessChecklist(proj, gate).find((i) => i.id === id);
  for (const [gate, id] of [['SG10', 'sg10-market-additions'], ['SG11', 'sg11-market-additions'], ['SG12', 'sg12-market-additions']] as const) {
    t(`${id} blocks while an assessment is pending`, item(p, gate, id)?.satisfied === false);
    t(`${id} is a hard block`, item(p, gate, id)?.hardBlock === true);
    t(`${id} is satisfied once assessed`, item(done, gate, id)?.satisfied === true);
    t(`${id} is satisfied on a project with no added market`, item(base(), gate, id)?.satisfied === true);
  }
}

console.log(bad === 0 ? '\nAll cases pass.' : `\n${bad} case(s) FAILED.`);
process.exit(bad === 0 ? 0 : 1);
