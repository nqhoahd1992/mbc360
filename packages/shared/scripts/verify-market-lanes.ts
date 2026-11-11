// Verifies the market lanes of Gates 10-12 (Round 5 question 2(c): "unrelated markets may continue where their own requirements are
// met"). Pure functions over a hand-built two-market project on the real rule engine; the API's guard is exercised by
// `npm run verify:e2e`. Run: npm run verify:market-lanes
import { createEmptyProject, createEmptyRegisterRow } from '../../../apps/web/src/store/factory';
import { PER_MARKET_ITEM_IDS } from '../src/config/gateReadiness';
import { gateReadinessChecklist, gateBlockers, marketView, rowsOfMarket } from '../src/utils/gateProgress';
import { gateEvidenceSnapshot } from '../src/utils/gateSnapshot';
import { expandRequirementRows } from '../src/utils/marketRequirements';
import { PHASE_CONFIGS } from '../src/config/phases';
import type { ChangeControlAssessment, NextAction, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const VN = 'Vietnam';
const SG = 'Singapore';
const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: [VN, SG], reviewers: {} } as never);
const item = (p: ProjectData, gate: string, id: string, market?: string) =>
  gateReadinessChecklist(p, gate, undefined, market).find((i) => i.id === id);
const ok = (p: ProjectData, gate: string, id: string, market?: string) => item(p, gate, id, market)?.satisfied === true;
const track = (p: ProjectData, market: string) => p.marketTracks.find((x) => x.market === market)!;
const finding = (over: Partial<ChangeControlAssessment>): ChangeControlAssessment => ({
  id: `f${Math.random()}`,
  finding: 'Rising complaints',
  category: 'Complaint trend',
  markets: VN,
  answer: 'No',
  reviewer: 'Sekar',
  reviewDate: '2026-11-01',
  rationale: 'within the expected range',
  ...over,
});

// --- the slice -----------------------------------------------------------------------------------------------------------------
{
  const p = fresh();
  t('the project has a track per market', p.marketTracks.length === 2);
  const v = marketView(p, VN);
  t('a market view holds that market alone', v.identity.markets.join() === VN && v.marketTracks.length === 1 && v.marketTracks[0].market === VN);
  t('...and does not change the project it was cut from', p.identity.markets.length === 2 && p.marketTracks.length === 2);
}

// --- a market column on a register cuts its rows ----------------------------------------------------------------------------
{
  const rows = [{ market: VN }, { market: SG }, { market: '' }] as Record<string, unknown>[];
  t('rows of one market, plus rows that name none (they belong to every market)', rowsOfMarket('packagingSpecsArtwork', rows, VN).length === 2);
  t('no market given: every row', rowsOfMarket('packagingSpecsArtwork', rows).length === 3);
  const multi = [{ marketsAffected: 'Vietnam, Singapore' }, { marketsAffected: SG }] as Record<string, unknown>[];
  t('a row naming several markets belongs to each of them', rowsOfMarket('releasedLabelRegister', multi, VN).length === 1 && rowsOfMarket('releasedLabelRegister', multi, SG).length === 2);
  t('a register with no market column is not split', rowsOfMarket('stabilityRelease', [{ a: 1 }, { a: 2 }] as Record<string, unknown>[], VN).length === 2);
}

// --- "every market" items: a market's own approval ---------------------------------------------------------------------------
{
  const p = fresh();
  track(p, VN).regulatoryStatus = 'Approved';
  track(p, SG).regulatoryStatus = 'Pending';
  t('Gate 10 regulatory approval: Vietnam is approved, so its lane is clear', ok(p, 'SG10', 'sg10-reg-approval', VN));
  t('...Singapore is not, so its lane is held', !ok(p, 'SG10', 'sg10-reg-approval', SG));
  t('...and the whole project is held until both are', !ok(p, 'SG10', 'sg10-reg-approval'));
  track(p, SG).regulatoryStatus = 'Approved';
  t('both approved: the project is clear, as before', ok(p, 'SG10', 'sg10-reg-approval'));
}

// --- one market's register rows -----------------------------------------------------------------------------------------------
{
  const p = fresh();
  const vn = createEmptyRegisterRow('packagingSpecsArtwork');
  const sg = createEmptyRegisterRow('packagingSpecsArtwork');
  vn.market = VN;
  sg.market = SG;
  vn.approval = '';
  sg.approval = 'Approved';
  p.registers['packagingSpecsArtwork'] = [vn, sg];
  t('Gate 10 artwork: Singapore\'s own rows are complete, so its lane is clear', ok(p, 'SG10', 'sg10-artwork', SG));
  t('...Vietnam\'s row has no approval, so its lane is held', !ok(p, 'SG10', 'sg10-artwork', VN));
  t('...and the whole project is held while any row is incomplete', !ok(p, 'SG10', 'sg10-artwork'));
  p.registers['packagingSpecsArtwork'] = [sg];
  t('a market with no row of its own has nothing of its own to complete, while the register has rows', ok(p, 'SG10', 'sg10-artwork', VN));
  p.registers['packagingSpecsArtwork'] = [];
  t('...but an EMPTY register still holds every lane (nobody has looked)', !ok(p, 'SG10', 'sg10-artwork', VN) && !ok(p, 'SG10', 'sg10-artwork', SG));
}

// --- the example the SME gave: a Pending finding ---------------------------------------------------------------------------------
{
  const p = fresh();
  p.changeControlAssessments = [
    finding({ markets: VN, answer: 'Pending assessment' }),
    finding({ markets: SG, finding: 'Nothing this review' }),
  ];
  t('a Pending finding in Vietnam holds Vietnam\'s Change-control item', !ok(p, 'SG12', 'sg12-change-links', VN));
  t('...and not Singapore, whose own review recorded a No', ok(p, 'SG12', 'sg12-change-links', SG));
  t('...the project as a whole is held', !ok(p, 'SG12', 'sg12-change-links'));
  p.changeControlAssessments = [finding({ markets: `${VN}, ${SG}`, answer: 'Pending assessment' })];
  t('a Pending finding that affects both markets holds both', !ok(p, 'SG12', 'sg12-change-links', VN) && !ok(p, 'SG12', 'sg12-change-links', SG));
  p.changeControlAssessments = [finding({ markets: VN })];
  t('a market whose review recorded no finding at all is NOT released: "no findings" is itself recorded', !ok(p, 'SG12', 'sg12-change-links', SG));
  p.changes = [
    { changeId: 'CHG-001', projectId: 'T-1', trigger: 'x', productSku: 's', affectedArea: 'a', riskLevel: 'Low', communicationRequired: false, status: 'Under Review', owner: 'o' } as never,
  ];
  t('...an open change record does not stand in for it either (answer 2(a))', !ok(p, 'SG12', 'sg12-change-links', SG));
}

// --- requirement rows that belong to a market ----------------------------------------------------------------------------------------------
{
  const dossier = PHASE_CONFIGS[4].requirementSections.find((s) => s.key === 'dossierEvidence')!;
  const rowsFor = (markets: string[]) => expandRequirementRows(dossier.rows, markets).map((e) => `${e.row.requirement}${e.market ? '@' + e.market : ''}`);
  const mixed = rowsFor(['Vietnam', 'Australia']);
  t('"ASEAN PIF mapped" is made for an ASEAN market only', mixed.includes('ASEAN PIF mapped@Vietnam') && !mixed.includes('ASEAN PIF mapped@Australia'));
  t('"Country-specific restrictions" is made for every market', mixed.includes('Country-specific restrictions@Vietnam') && mixed.includes('Country-specific restrictions@Australia'));
  t('a row that is about the product stays one shared row', mixed.filter((r) => r === 'Product Safety Summary').length === 1);
  t('a project with no ASEAN market has no "ASEAN PIF mapped" row at all', !rowsFor(['Australia']).some((r) => r.startsWith('ASEAN PIF mapped')));
  t('the rows keep the configuration\'s order, each market row in place', mixed[0] === 'ASEAN PIF mapped@Vietnam' && mixed[mixed.length - 1].startsWith('Country-specific restrictions'));

  const p = createEmptyProject({ id: 'T-2', productCode: 'T', projectLead: 'x', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  const rows = p.requirements['dossierEvidence'];
  t('a new project is scaffolded with those rows', rows.filter((r) => r.requirement === 'ASEAN PIF mapped').length === 1 && rows.find((r) => r.requirement === 'ASEAN PIF mapped')?.market === 'Vietnam');
  t('Vietnam\'s lane needs its own ASEAN PIF row done', !ok(p, 'SG10', 'sg10-pif-mapped', 'Vietnam'));
  t('...Australia\'s lane is not held by it (ASEAN PIF is not Australia\'s)', ok(p, 'SG10', 'sg10-pif-mapped', 'Australia'));
  t('...and the whole project is held while Vietnam\'s row is open', !ok(p, 'SG10', 'sg10-pif-mapped'));
  p.requirements['dossierEvidence'].find((r) => r.requirement === 'ASEAN PIF mapped')!.status = 'Completed';
  t('done in Vietnam: Vietnam\'s lane is clear and so is the project', ok(p, 'SG10', 'sg10-pif-mapped', 'Vietnam') && ok(p, 'SG10', 'sg10-pif-mapped'));

  const none = createEmptyProject({ id: 'T-3', productCode: 'T', projectLead: 'x', markets: ['Australia'], reviewers: {} } as never);
  // With no ASEAN market the item does not apply, which the system writes down as a generated N/A — and, the item being critical, the
  // person holding the function acknowledges it, exactly as before this change.
  t('a project with no ASEAN market has no ASEAN PIF row, so the item is a generated N/A (acknowledged as before), not an open row', none.requirements['dossierEvidence'].every((r) => r.requirement !== 'ASEAN PIF mapped') && item(none, 'SG10', 'sg10-pif-mapped')?.acknowledgement !== undefined);

  // The lane's signature attests to the product's rows and its own market's, not another market's.
  const q = createEmptyProject({ id: 'T-4', productCode: 'T', projectLead: 'x', markets: ['Vietnam', 'Singapore'], reviewers: {} } as never);
  const vn = gateEvidenceSnapshot(q, 'SG10', 'Vietnam');
  q.requirements['dossierEvidence'].find((r) => r.requirement === 'Country-specific restrictions' && r.market === 'Singapore')!.evidenceLink = 'https://x';
  t('editing Singapore\'s own row does not stale Vietnam\'s signature', JSON.stringify(vn.requirements) === JSON.stringify(gateEvidenceSnapshot(q, 'SG10', 'Vietnam').requirements));
  t('...but it does change Singapore\'s', JSON.stringify(vn.requirements) !== JSON.stringify(gateEvidenceSnapshot(q, 'SG10', 'Singapore').requirements));
}

// --- next actions that belong to a market -------------------------------------------------------------------------------------------------
{
  const action = (over: Partial<NextAction>): NextAction => ({
    id: `a${Math.random()}`,
    gateId: 'SG10',
    description: 'Fix the label',
    status: 'Open',
    priority: 'Critical',
    ...over,
  });
  const p = fresh();
  p.nextActions = [action({ market: VN })];
  t('an open Critical action of Vietnam holds Vietnam\'s lane', !ok(p, 'SG10', 'critical-next-actions', VN));
  t('...and does not hold Singapore\'s', ok(p, 'SG10', 'critical-next-actions', SG));
  t('...the whole project is held', !ok(p, 'SG10', 'critical-next-actions'));
  p.nextActions = [action({})];
  t('an action that names no market holds every lane', !ok(p, 'SG10', 'critical-next-actions', VN) && !ok(p, 'SG10', 'critical-next-actions', SG));
  p.nextActions = [action({ market: VN, priority: 'Medium' })];
  t('an open ordinary action of one market holds only that market (it clears with Proceed with Conditions)', !ok(p, 'SG10', 'open-next-actions', VN) && ok(p, 'SG10', 'open-next-actions', SG));
  p.nextActions = [action({ market: VN, status: 'Closed' })];
  t('a closed action holds nothing', ok(p, 'SG10', 'critical-next-actions', VN));
  p.nextActions = [action({ market: VN })];
  t('the lane snapshot of Singapore does not list Vietnam\'s action', gateEvidenceSnapshot(p, 'SG10', SG).openActions.length === 0 && gateEvidenceSnapshot(p, 'SG10', VN).openActions.length === 1);
  t('the readiness list tags the next-action items as the market\'s own', gateReadinessChecklist(p, 'SG10', undefined, VN).find((i) => i.id === 'critical-next-actions')?.scope === 'market');
}

// --- Key Gate Checks, checklists and infant rows that belong to a market -------------------------------------------------------------
{
  const p = fresh();
  const KC = 'Countries/regulatory pathway matched and PIF/evidence file mapped';
  const kcRows = p.gateChecks.filter((c) => c.check === KC);
  t('the pathway Key Gate Check is one row per market', kcRows.length === p.identity.markets.length && kcRows.every((c) => !!c.market));
  const row = (m: string) => p.gateChecks.find((c) => c.check === KC && c.market === m)!;
  const done = (m: string) => {
    row(m).done = true;
    row(m).ynna = 'Y';
  };
  done(VN);
  t('Vietnam finishing its check does not finish Singapore\'s lane', ok(p, 'SG10', 'sg10-regulatory-mapped', VN) && !ok(p, 'SG10', 'sg10-regulatory-mapped', SG));
  t('...and the project is not ready until every market is', !ok(p, 'SG10', 'sg10-regulatory-mapped'));
  done(SG);
  t('...it is ready once every market has finished', ok(p, 'SG10', 'sg10-regulatory-mapped'));
  t('a lane snapshot lists only its own market\'s check', gateEvidenceSnapshot(p, 'SG10', SG).gateChecks.every((c) => !c.check.includes(`(${VN})`)));

  const q = fresh();
  const infant = q.requirements['infantPif'] ?? [];
  const stmt = infant.filter((r) => r.requirement === 'Approved age and use statements');
  t('the infant age and use statements are one row per market', stmt.length === q.identity.markets.length && stmt.every((r) => !!r.market));
  t('the other infant rows stay one row for the product', infant.filter((r) => r.requirement === 'Infant-use safety conclusion').every((r) => !r.market));

  const feedback = q.checklists['postMarketSources'] ?? [];
  const per = new Set(feedback.map((i) => i.market));
  t('the post-market feedback sources are listed once for each market', q.identity.markets.every((m) => per.has(m)) && feedback.every((i) => !!i.market));
  const vnItems = (marketView(q, VN).checklists['postMarketSources'] ?? []);
  t('a lane sees only its own market\'s feedback options', vnItems.length > 0 && vnItems.every((i) => i.market === VN));
}

// --- everything else is not one market's ---------------------------------------------------------------------------------------------
{
  const p = fresh();
  t('a project-wide item (complaints triaged) is not in the per-market list', !PER_MARKET_ITEM_IDS.has('sg12-complaints'));
  t('...so it holds every lane while it is open', !ok(p, 'SG12', 'sg12-complaints', VN) && !ok(p, 'SG12', 'sg12-complaints', SG));
  t('the formula and the safety evidence are project-wide too', !PER_MARKET_ITEM_IDS.has('sg10-cosmetri-formula') && !PER_MARKET_ITEM_IDS.has('sg10-safety-evidence'));
  const blockers = (market?: string) => gateBlockers(p, 'SG12', undefined, market).map((b) => b.id);
  t('a lane still lists the project-wide items among its blockers', blockers(VN).includes('sg12-complaints'));
}

// --- a project passes exactly when all its lanes do ------------------------------------------------------------------------------
{
  const p = fresh();
  track(p, VN).regulatoryStatus = 'Approved';
  track(p, SG).regulatoryStatus = 'Approved';
  track(p, VN).launchApproval = 'Approved';
  track(p, SG).launchApproval = 'Pending';
  p.changeControlAssessments = [finding({ markets: VN }), finding({ markets: SG, finding: 'b' })];
  p.nextActions = [{ id: 'na1', gateId: 'SG10', description: 'x', status: 'Open', priority: 'Critical', market: VN }, { id: 'na2', gateId: 'SG11', description: 'y', status: 'Open', priority: 'Medium' }];
  let all = true;
  let compared = 0;
  const mismatches: string[] = [];
  for (const gate of ['SG10', 'SG11', 'SG12']) {
    for (const id of [...PER_MARKET_ITEM_IDS, 'critical-next-actions', 'open-next-actions']) {
      const wholeItem = item(p, gate, id);
      if (!wholeItem) continue;
      const lanes = [VN, SG].map((m) => item(p, gate, id, m)?.satisfied);
      // Compared on the items whose acknowledgement does not enter into it: an acknowledgement is the project's, not a lane's.
      if (wholeItem.acknowledgement) continue;
      compared++;
      if (wholeItem.satisfied !== lanes.every(Boolean)) {
        all = false;
        mismatches.push(`${gate}/${id}: whole=${wholeItem.satisfied} lanes=${lanes.join(',')}`);
      }
    }
  }
  t('for every per-market item, the whole project is satisfied exactly when every lane is', all && compared >= 10, `compared ${compared}: ${mismatches.join(' | ')}`);
  console.log(`      (${compared} items compared across Gates 10-12)`);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
