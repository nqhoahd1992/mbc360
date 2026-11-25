// Round 5 question 17: the company's channel list, the events of a publication record, and the explicit claim-use decision that artwork and
// publication read. Pure functions on the real config and rule code. Run: npm run verify:claim-use
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import {
  CLAIM_USE_DECISIONS,
  PACKAGING_LABEL_CHANNEL,
  PUBLICATION_CHANNELS,
  PUBLICATION_EVENTS,
  REGISTER_CONFIGS,
} from '../src/config/registers';
import {
  artworkClaimBlockers,
  claimUseBlocker,
  claimUseDecisionOf,
  claimUseRowProblems,
  claimUseRowRefusal,
  publicationRecordProblems,
  stampClaimUseDecisions,
} from '../src/utils/claimEvidence';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const cfg = (key: string) => REGISTER_CONFIGS.find((c) => c.key === key)!;
const col = (reg: string, key: string) => cfg(reg).columns.find((c) => c.key === key)!;

// --- the lists and the columns ------------------------------------------------------------------------------------------------------------------
{
  t('the channel list is the company\'s, worded as the team wrote it',
    PUBLICATION_CHANNELS.join(' | ') === 'Packaging/label | Website | Social media | Sales/distributor material | HCP/professional material | Retailer/e-commerce listing | Advertising | Other - specify');
  t('"Release to Print" is an event, not a channel', !(PUBLICATION_CHANNELS as readonly string[]).some((c) => /print/i.test(c)) && PUBLICATION_EVENTS[0] === 'Release to Print');
  t('the five events are Release to Print, Published/Deployed, Updated, Withdrawn, Superseded', PUBLICATION_EVENTS.join(' | ') === 'Release to Print | Published/Deployed | Updated | Withdrawn | Superseded');
  t('the five decisions are Pending, Approved, Approved with Conditions, Not Approved, Withdrawn', CLAIM_USE_DECISIONS.join(' | ') === 'Pending | Approved | Approved with Conditions | Not Approved | Withdrawn');
  t('the Publication record has an Event column over the five events', col('publicationRecord', 'event')?.options?.length === 5);
  t('the claim-use intended channel is a picked channel (not free text)', col('skuClaimsPifRegister', 'intendedChannel').type === 'select');
  t('...and so is the channel of Published Information Approval', col('publishedInfoApproval', 'channel').type === 'select');
  t('the claim-use register carries the decision, its date, conditions, review date and the two approvals',
    ['claimUseDecision', 'useDecisionDate', 'useConditions', 'conditionsMet', 'useReviewDate', 'useRegulatoryApprover', 'useTechnicalApprover'].every((k) => !!col('skuClaimsPifRegister', k)));
  t('...and what the decision stands on is written by the server, not typed',
    ['approvedRevision', 'approvedWording', 'decisionFormulaVersion'].every((k) => col('skuClaimsPifRegister', k).editable === false));
  t('"Complete" is labelled as a work status', col('skuClaimsPifRegister', 'status').label === 'Work status');
  t('the claim-use register has a generated ID', !!col('skuClaimsPifRegister', 'useId').autoId);
}

// --- a decision authorises a use only with the matching revision ------------------------------------------------------------------------------------
const claim = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'CLM-001', approvedWording: 'Hydrates for 24 hours', revision: 1, status: 'Supported', ...over });
const decidedRow = (over: RegisterRow = {}): RegisterRow => ({
  useId: 'CU-001', claimId: 'CLM-001', market: 'Vietnam', productSku: 'SKU-1', intendedChannel: 'Website', status: 'Complete',
  claimUseDecision: 'Approved', approvedRevision: '1', ...over,
});
{
  t('a blank decision reads as Pending', claimUseDecisionOf(decidedRow({ claimUseDecision: '' })) === 'Pending');
  t('Approved at the claim\'s current revision authorises', claimUseRowRefusal(decidedRow(), claim()) === undefined);
  t('Pending does not, whatever the work status', !!claimUseRowRefusal(decidedRow({ claimUseDecision: 'Pending' }), claim()));
  t('a row that is only Complete (no decision) does not', !!claimUseRowRefusal(decidedRow({ claimUseDecision: '' }), claim()));
  t('Not Approved does not', !!claimUseRowRefusal(decidedRow({ claimUseDecision: 'Not Approved' }), claim()));
  t('Withdrawn does not', !!claimUseRowRefusal(decidedRow({ claimUseDecision: 'Withdrawn' }), claim()));
  t('Approved with Conditions does not until the conditions are confirmed met', !!claimUseRowRefusal(decidedRow({ claimUseDecision: 'Approved with Conditions' }), claim()));
  t('...and does once they are', claimUseRowRefusal(decidedRow({ claimUseDecision: 'Approved with Conditions', conditionsMet: 'Y' }), claim()) === undefined);
  t('a decision for revision 1 does not stand once the claim is at revision 2', !!claimUseRowRefusal(decidedRow(), claim({ revision: 2 })));
  t('a claim with no revision and a decision recorded with none still match', claimUseRowRefusal(decidedRow({ approvedRevision: '' }), claim({ revision: undefined })) === undefined);

  const blocker = (rows: RegisterRow[], u: { market?: string; channel?: string }) => claimUseBlocker(claim(), u, rows);
  t('a use with no claim-use row for the market is blocked', !!blocker([], { market: 'Vietnam' }));
  t('an Approved row for the market and channel clears the use', blocker([decidedRow()], { market: 'Vietnam', channel: 'Website' }) === undefined);
  t('...a Complete-only row for it does not', !!blocker([decidedRow({ claimUseDecision: '' })], { market: 'Vietnam', channel: 'Website' }));
  t('...an approval for ANOTHER channel does not cover this one (matched by name)', !!blocker([decidedRow({ intendedChannel: 'Social media' })], { market: 'Vietnam', channel: 'Website' }));
  t('...an approval for another market does not', !!blocker([decidedRow({ market: 'Australia' })], { market: 'Vietnam', channel: 'Website' }));
  t('a use that names no channel is cleared by any authorising row of the market', blocker([decidedRow()], { market: 'Vietnam' }) === undefined);
  t('two rows for a market: one refused, one authorising -> cleared', blocker([decidedRow({ claimUseDecision: 'Not Approved' }), decidedRow({ useId: 'CU-002' })], { market: 'Vietnam', channel: 'Website' }) === undefined);

  // Artwork is the Packaging/label channel.
  const artwork: RegisterRow[] = [{ approval: 'Approved', claimIds: 'CLM-001', market: 'Vietnam' }];
  t('artwork needs a decision that covers Packaging/label, not just any channel',
    artworkClaimBlockers(artwork, [claim()], [decidedRow({ intendedChannel: 'Website' })]).length === 1);
  t('...and is cleared by an Approved Packaging/label decision at the current revision',
    artworkClaimBlockers(artwork, [claim()], [decidedRow({ intendedChannel: PACKAGING_LABEL_CHANNEL })]).length === 0);
  t('...and blocked again when the claim is revised', artworkClaimBlockers(artwork, [claim({ revision: 2 })], [decidedRow({ intendedChannel: PACKAGING_LABEL_CHANNEL })]).length === 1);
}

// --- the approvals "as required" ---------------------------------------------------------------------------------------------------------------------
const base = (): ProjectData => createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
{
  const p = base();
  p.registers['claimEvidenceTraceability'] = [claim()];
  t('an approving decision on a claim outside the library needs the Technical approval', claimUseRowProblems(p, [decidedRow({ regulatoryReviewRequired: 'N' })]).length === 1);
  t('...and the Regulatory approval too where Regulatory review is required', claimUseRowProblems(p, [decidedRow({ regulatoryReviewRequired: 'Y' })]).length === 2);
  t('...with both named it is complete', claimUseRowProblems(p, [decidedRow({ regulatoryReviewRequired: 'Y', useRegulatoryApprover: 'R', useTechnicalApprover: 'T' })]).length === 0);
  t('a claim that reuses an Approved library entry, with its revision and fit recorded (question 18(b)), needs no Technical approval',
    (() => {
      const q = base();
      q.registers['claimEvidenceTraceability'] = [claim({ libraryEntryId: 'L1', libraryRevision: '1', libraryFitVerification: 'fits', libraryFitVerifiedBy: 'V' })];
      q.reference = { ...q.reference, claimsLibrary: [{ id: 'L1', wording: 'x', status: 'Approved', revision: 1 } as never] };
      return claimUseRowProblems(q, [decidedRow({ regulatoryReviewRequired: 'N' })]).length === 0;
    })());
  t('Pending needs no approvals', claimUseRowProblems(p, [decidedRow({ claimUseDecision: 'Pending', regulatoryReviewRequired: 'Y' })]).length === 0);
  t('a decision with no claim linked is incomplete', claimUseRowProblems(p, [decidedRow({ claimId: '' })]).length === 1);
}

// --- what a decision stands on is written by the server ----------------------------------------------------------------------------------------------
{
  const p = base();
  p.formulaVersion = 'F2.0';
  p.registers['claimEvidenceTraceability'] = [claim({ revision: 3, approvedWording: 'Current wording' })];
  const forged = decidedRow({ approvedRevision: '99', approvedWording: 'forged', decisionFormulaVersion: 'forged', useDecisionDate: '2026-11-25' });
  const [first] = stampClaimUseDecisions(p, [], [forged]);
  t('a new decision is stamped with the claim\'s revision and wording and the formula, whatever the request carried',
    first.approvedRevision === '3' && first.approvedWording === 'Current wording' && first.decisionFormulaVersion === 'F2.0');
  p.registers['claimEvidenceTraceability'] = [claim({ revision: 4, approvedWording: 'Reworded' })];
  const [kept] = stampClaimUseDecisions(p, [first], [{ ...first, approvedRevision: '4', notes: 'edited' }]);
  t('an unrelated edit keeps the recorded stamps, and a forged one is discarded', kept.approvedRevision === '3' && kept.approvedWording === 'Current wording');
  t('...so the decision no longer matches the revised claim', !!claimUseRowRefusal(kept, claim({ revision: 4 })));
  const [redecided] = stampClaimUseDecisions(p, [first], [{ ...first, useDecisionDate: '2026-12-01' }]);
  t('deciding again (a new decision date) stamps the claim as it now stands', redecided.approvedRevision === '4' && redecided.approvedWording === 'Reworded');
  t('...and then it authorises again', claimUseRowRefusal(redecided, claim({ revision: 4 })) === undefined);
  const [changed] = stampClaimUseDecisions(p, [{ ...first, claimUseDecision: 'Pending' }], [{ ...first, claimUseDecision: 'Approved' }]);
  t('changing the decision to an approving one stamps it', changed.approvedRevision === '4');
  const [pending] = stampClaimUseDecisions(p, [], [decidedRow({ claimUseDecision: 'Pending', approvedRevision: '5' })]);
  t('a Pending row carries no stamp from the request', pending.approvedRevision === '');
}

// --- the publication record --------------------------------------------------------------------------------------------------------------------------
{
  const p = base();
  p.registers['claimEvidenceTraceability'] = [claim()];
  p.registers['skuClaimsPifRegister'] = [decidedRow({ intendedChannel: 'Website' }), decidedRow({ useId: 'CU-002', intendedChannel: PACKAGING_LABEL_CHANNEL })];
  const pub = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'CLM-001', event: 'Published/Deployed', channel: 'Website', market: 'Vietnam', ...over });
  t('a publication row with an event, channel, market and a covering decision is fine', publicationRecordProblems(p, [pub()]).length === 0);
  t('an event must be chosen', publicationRecordProblems(p, [pub({ event: '' })]).length >= 1);
  t('a channel must be chosen', publicationRecordProblems(p, [pub({ channel: '' })]).length >= 1);
  t('Release to Print is an event of Packaging/label only', publicationRecordProblems(p, [pub({ event: 'Release to Print', channel: 'Website' })]).some((x) => /Packaging\/label/.test(x)));
  t('...on Packaging/label it is fine, and separate from the deployment row', publicationRecordProblems(p, [pub({ event: 'Release to Print', channel: PACKAGING_LABEL_CHANNEL }), pub()]).length === 0);
  t('an event that puts something out needs a market', publicationRecordProblems(p, [pub({ market: '' })]).some((x) => /market/.test(x)));
  t('...and a claim-use decision covering its channel', publicationRecordProblems(p, [pub({ channel: 'Social media' })]).length === 1);
  p.registers['skuClaimsPifRegister'] = [decidedRow({ claimUseDecision: '' })];
  t('...a Complete-only claim-use row does not cover it', publicationRecordProblems(p, [pub()]).length === 1);
  t('a withdrawal needs no claim-use decision (it takes something down)', publicationRecordProblems(p, [pub({ event: 'Withdrawn' })]).length === 0);
  t('a Superseded event needs none either', publicationRecordProblems(p, [pub({ event: 'Superseded' })]).length === 0);
  const config = cfg('publicationRecord');
  t('the date columns are required by event: the actual date to put out, the withdrawal date to take down',
    config.columns.find((c) => c.key === 'publicationDate')?.requiredWhen?.values.includes('Updated') === true && config.columns.find((c) => c.key === 'withdrawalDate')?.requiredWhen?.values.includes('Withdrawn') === true);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
