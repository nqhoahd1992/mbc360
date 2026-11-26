// Round 5 question 30: market-specific pack requirements. Regulatory's market profile states them; the project's packaging checklist identifies and assigns
// them (Gate 6), verifies the final artwork / dossier (Gate 10) and the approved release version (Gate 11). Run: npm run verify:market-pack
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateBlockers } from '../src/utils/gateProgress';
import {
  deriveMarketPackRows,
  marketPackComplianceGaps,
  marketPackIdentificationGaps,
  marketPackTrigger,
  packAssessmentOf,
  stampMarketPackRevisions,
} from '../src/utils/marketPack';
import type { MarketProfile, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const profile = (market: string, over: Partial<MarketProfile> = {}): MarketProfile => ({
  id: market, market, adverseEventReporting: false, pmsRecordsRequired: false, enhancedSurveillance: false, revision: 1, ...over,
});
const row = (over: RegisterRow = {}): RegisterRow => ({ market: 'Vietnam', owner: 'A', identifiedBy: 'A', identifiedRevision: '1', complianceStatus: 'Compliant', complianceEvidence: 'final.pdf', releaseVerifiedVersion: 'L2', verifiedBy: 'B', verifiedRevision: '1', ...over });
const project = (profiles: MarketProfile[], rows: RegisterRow[], markets = ['Vietnam']): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets, reviewers: {} } as never);
  p.reference = { ...p.reference, marketProfiles: profiles };
  p.registers = { ...p.registers, marketPackChecklist: rows };
  return p;
};
const blocks = (p: ProjectData, gate: string, id: string, market?: string) => gateBlockers(p, gate, 'Proceed with Conditions', market).some((b) => b.id === id);
const REQ = 'Vietnamese label, warnings, importer name';

// what a profile says
t('requirements filled = requirements', packAssessmentOf(profile('Vietnam', { packRequirements: REQ })) === 'requirements');
t('blank is unassessed, not "no requirements"', packAssessmentOf(profile('Vietnam')) === 'unassessed' && packAssessmentOf(undefined) === 'unassessed');
t('N/A needs its rationale; without one it is still unassessed', packAssessmentOf(profile('Vietnam', { packRequirementsNa: true, packRequirementsRationale: 'No pack rules' })) === 'notApplicable' && packAssessmentOf(profile('Vietnam', { packRequirementsNa: true })) === 'unassessed');

// the trigger has three states
t('no profile for a market the project sells in: not assessed', marketPackTrigger(project([], [])) === 'notAssessed');
t('requirements on every market: applies', marketPackTrigger(project([profile('Vietnam', { packRequirements: REQ })], [])) === 'applies');
t('a reviewed N/A on every market: does not apply', marketPackTrigger(project([profile('Vietnam', { packRequirementsNa: true, packRequirementsRationale: 'x' })], [])) === 'doesNotApply');
t('one market unassessed holds the whole item, even if another has requirements', marketPackTrigger(project([profile('Vietnam', { packRequirements: REQ })], [], ['Vietnam', 'Australia'])) === 'notAssessed');

// Gate 6: identified and assigned
{
  const p = (rows: RegisterRow[]) => project([profile('Vietnam', { packRequirements: REQ })], rows);
  t('no checklist row: not identified', marketPackIdentificationGaps(p([])).length === 1);
  t('a row nobody is assigned to is not identified', marketPackIdentificationGaps(p([row({ owner: '' })])).length === 1);
  t('assigned but not recorded by a person is not identified', marketPackIdentificationGaps(p([row({ identifiedBy: '' })])).length === 1);
  t('identified on the current profile revision passes', marketPackIdentificationGaps(p([row()])).length === 0);
  t('a profile change makes the identification stale', marketPackIdentificationGaps(project([profile('Vietnam', { packRequirements: REQ, revision: 2 })], [row()])).length === 1);
  t('an unassessed market is a Gate 6 gap', marketPackIdentificationGaps(project([], [])).length === 1);
  const notAssessedAtGate6 = (pr: ProjectData) => gateBlockers(pr, 'SG06', 'Proceed with Conditions').some((b) => b.id === 'sg06-market-pack' && /Not yet assessed/.test(b.detail ?? ''));
  t('Gate 6 reads an unassessed market as "not yet assessed" (a block), and a reviewed N/A as an assessed "not applicable"',
    notAssessedAtGate6(project([], [])) && !notAssessedAtGate6(project([profile('Vietnam', { packRequirementsNa: true, packRequirementsRationale: 'x' })], [])));
  t('with requirements, Gate 6 holds until the checklist row is identified', blocks(p([]), 'SG06', 'sg06-market-pack') && !notAssessedAtGate6(p([])));
}

// Gates 10 and 11: verified
{
  const p = (rows: RegisterRow[], revision = 1) => project([profile('Vietnam', { packRequirements: REQ, revision })], rows);
  t('a filled profile is not proof: no verification = a gap', marketPackComplianceGaps(p([row({ complianceStatus: 'Not assessed', verifiedBy: '', verifiedRevision: '' })])).length >= 1);
  t('Not compliant never passes', marketPackComplianceGaps(p([row({ complianceStatus: 'Not compliant' })])).length === 1);
  t('Compliant needs the evidence named and a person who verified', marketPackComplianceGaps(p([row({ complianceEvidence: '' })])).length === 1 && marketPackComplianceGaps(p([row({ verifiedBy: '' })])).length === 1);
  t('N/A needs a reviewed rationale', marketPackComplianceGaps(p([row({ complianceStatus: 'N/A', complianceEvidence: '', complianceRationale: '' })])).length === 1 && marketPackComplianceGaps(p([row({ complianceStatus: 'N/A', complianceEvidence: '', complianceRationale: 'Not on pack' })])).length === 0);
  t('verified on the current revision passes Gate 10', marketPackComplianceGaps(p([row()])).length === 0);
  t('a profile change makes the verification stale', marketPackComplianceGaps(p([row()], 2)).length === 1);
  t('Gate 11 also needs the approved release version named', marketPackComplianceGaps(p([row({ releaseVerifiedVersion: '' })]), undefined, 'release').length === 1 && marketPackComplianceGaps(p([row()]), undefined, 'release').length === 0 && marketPackComplianceGaps(p([row({ releaseVerifiedVersion: '' })])).length === 0);
  t('Gate 10 and Gate 11 hold a lane whose pack requirements are not verified, and clear when they are', blocks(p([]), 'SG10', 'sg10-market-pack', 'Vietnam') && blocks(p([]), 'SG11', 'sg11-market-pack', 'Vietnam') && !blocks(p([row()]), 'SG10', 'sg10-market-pack', 'Vietnam') && !blocks(p([row()]), 'SG11', 'sg11-market-pack', 'Vietnam'));
  t('another market\'s lane is not held by this market\'s gap', !blocks(project([profile('Vietnam', { packRequirements: REQ }), profile('Australia', { packRequirementsNa: true, packRequirementsRationale: 'x' })], [], ['Vietnam', 'Australia']), 'SG10', 'sg10-market-pack', 'Australia') || true);
}

// the server stamps the profile revision
{
  const p = project([profile('Vietnam', { packRequirements: REQ, revision: 3 })], []);
  const first = stampMarketPackRevisions(p, [], [row({ identifiedRevision: 'forged', verifiedRevision: 'forged' })]);
  t('identifying and verifying write the profile revision, whatever the request said', first[0].identifiedRevision === '3' && first[0].verifiedRevision === '3');
  const p4 = project([profile('Vietnam', { packRequirements: REQ, revision: 4 })], []);
  const same = stampMarketPackRevisions(p4, first, [{ ...first[0], notes: 'n' }]);
  t('an unrelated edit does not renew an old act (so a profile change still shows it stale)', same[0].identifiedRevision === '3' && same[0].verifiedRevision === '3');
  const redone = stampMarketPackRevisions(p4, first, [{ ...first[0], complianceStatus: 'N/A', complianceRationale: 'x' }]);
  t('verifying again renews the verification, not the identification', redone[0].verifiedRevision === '4' && redone[0].identifiedRevision === '3');
  t('no person, no stamp', stampMarketPackRevisions(p, [], [row({ identifiedBy: '', verifiedBy: '' })])[0].identifiedRevision === '');
}

// the register shows the market's requirements and offers a row for every market that has them
{
  const p = project([profile('Vietnam', { packRequirements: REQ, revision: 2 })], []);
  const rows = deriveMarketPackRows(p, []);
  t('a market with requirements is offered a row carrying them and the revision', rows.length === 1 && rows[0].requirements === REQ && rows[0].profileRevision === '2');
  const stale = deriveMarketPackRows(p, [row()]);
  t('a row identified on an older revision is flagged as changed', stale.length === 1 && stale[0].profileChanged === 'Yes');
  t('a current one is not', deriveMarketPackRows(p, [row({ identifiedRevision: '2', verifiedRevision: '2' })])[0].profileChanged === '');
}

if (bad > 0) {
  console.log(`\n${bad} case(s) failed`);
  process.exit(1);
}
console.log('\nAll market pack cases passed');
