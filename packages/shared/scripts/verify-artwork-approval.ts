// Round 5 question 29: the approved artwork record (Packaging Specs & Artwork Evidence) and the release history (Released Label Control), and what Gate 11
// confirms between them. Pure functions on the real rule code. Run: npm run verify:artwork-approval
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { artworkClaimRevisionDrift, releasedLabelApprovalGaps, stampArtworkClaimRevisions } from '../src/utils/artworkApproval';
import { artworkClaimBlockers } from '../src/utils/claimEvidence';
import { gateBlockers } from '../src/utils/gateProgress';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const art = (over: RegisterRow = {}): RegisterRow => ({ artworkId: 'ART-001', claimIds: 'CLM-001', artworkVersion: 'L2', artworkFile: 'tube_v2.ai', market: '', approval: 'Approved', ...over });
const label = (over: RegisterRow = {}): RegisterRow => ({ recordId: 'LBL-001', newLabelVersion: 'L2', newArtworkFile: 'tube_v2.ai', approvedArtworkId: 'ART-001', formulaVersion: 'F1.0', marketsAffected: '', ...over });
const claim = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'CLM-001', status: 'Supported', revision: 1, ...over });
const project = (artwork: RegisterRow[], labels: RegisterRow[], claims: RegisterRow[] = [claim()]): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  p.registers = { ...p.registers, packagingSpecsArtwork: artwork, releasedLabelRegister: labels, claimEvidenceTraceability: claims };
  p.formulaVersion = 'F1.0';
  return p;
};
const gate11 = (p: ProjectData, market?: string) => gateBlockers(p, 'SG11', 'Proceed with Conditions', market).some((b) => b.id === 'sg11-artwork');

// the release matches the approved record
t('a released label that names the approved record, version, file and formula matches', releasedLabelApprovalGaps(project([art()], [label()])).length === 0);
t('a filename alone is not approval: no approved artwork record named', releasedLabelApprovalGaps(project([art()], [label({ approvedArtworkId: '' })])).length === 1);
t('a record that does not exist, or is not Approved, does not stand', releasedLabelApprovalGaps(project([art()], [label({ approvedArtworkId: 'ART-009' })])).length === 1 && releasedLabelApprovalGaps(project([art({ approval: 'Needs Review' })], [label()])).length === 1);
t('the label version and the artwork file must be the approved ones', releasedLabelApprovalGaps(project([art()], [label({ newLabelVersion: 'L3' })])).length === 1 && releasedLabelApprovalGaps(project([art()], [label({ newArtworkFile: 'other.ai' })])).length === 1);
t('an approved record with no artwork file cannot confirm anything', releasedLabelApprovalGaps(project([art({ artworkFile: '' })], [label()])).length === 1);
t('the formula version must be the project\'s current one', releasedLabelApprovalGaps(project([art()], [label({ formulaVersion: 'F0.9' })])).length === 1 && releasedLabelApprovalGaps(project([art()], [label({ formulaVersion: '' })])).length === 1);
t('an artwork approved for one market does not cover another', releasedLabelApprovalGaps(project([art({ market: 'Vietnam' })], [label()]), 'Vietnam').length === 0 && releasedLabelApprovalGaps(project([art({ market: 'Vietnam' })], [label()]), 'Australia').length === 1);
t('a market with no released-label row of its own has none to confirm', releasedLabelApprovalGaps(project([art()], [label({ marketsAffected: 'Vietnam' })]), 'Australia').length === 1);

// Gate 11
t('Gate 11 holds a market whose released label does not match the approval, and not one that does', gate11(project([art()], [label({ newArtworkFile: 'other.ai' })]), 'Vietnam') && !gate11(project([art()], [label()]), 'Vietnam'));
t('whether the label was already released, and when, is not read at Gate 11', !gate11(project([art()], [label({ newLabelReleased: 'No', marketReleaseDate: '' })]), 'Vietnam') && !gate11(project([art()], [label({ newLabelReleased: '', marketReleaseDate: '' })]), 'Vietnam'));

// the claim revisions an approval stands on
{
  const claims = [claim({ claimId: 'CLM-001', revision: 2 }), claim({ claimId: 'CLM-002', revision: 1 })];
  const p = project([], [], claims);
  const stamped = stampArtworkClaimRevisions(p, [], [art({ claimIds: 'CLM-001, CLM-002', approvedClaimRevisions: 'forged' })]);
  t('approving an artwork stamps the revision of every claim it names, whatever the request said', stamped[0].approvedClaimRevisions === 'CLM-001 r2, CLM-002 r1');
  t('an artwork not approved carries no stamp', stampArtworkClaimRevisions(p, [], [art({ approval: 'Needs Review', approvedClaimRevisions: 'x' })])[0].approvedClaimRevisions === '');
  t('the stamp is kept while nothing it covers changes', stampArtworkClaimRevisions(p, stamped, [{ ...stamped[0], notes: 'n' }])[0].approvedClaimRevisions === 'CLM-001 r2, CLM-002 r1');
  t('...and renewed when the claims named change', stampArtworkClaimRevisions(p, stamped, [{ ...stamped[0], claimIds: 'CLM-001' }])[0].approvedClaimRevisions === 'CLM-001 r2');
  t('a claim that has moved on makes the approval stale', artworkClaimRevisionDrift([stamped[0]], [claim({ claimId: 'CLM-001', revision: 3 }), claims[1]]).length === 1 && artworkClaimRevisionDrift([stamped[0]], claims).length === 0);
  t('the Gate 10 artwork-claims check reads that staleness', artworkClaimBlockers([stamped[0]], [claim({ claimId: 'CLM-001', revision: 3 }), claims[1]], []).some((b) => /revision 3/.test(b.reason)));
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
