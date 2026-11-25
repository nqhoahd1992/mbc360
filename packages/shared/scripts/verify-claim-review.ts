// Round 5 question 18: a claim excluded from the active scope, the conditions of an Approved with Conditions review, reuse of a Claims Library
// approval, and who approves a claim revision. Pure functions on the real config and rule code. Run: npm run verify:claim-review
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS } from '../src/config/registers';
import {
  CLAIM_SCOPE_EXCLUDED,
  CLAIM_SCOPE_OPTIONS,
  claimConditionsGaps,
  claimIsExcluded,
  claimLibraryReuseHolds,
} from '../src/config/claimReview';
import {
  REVISION_APPROVAL_COLUMNS,
  REVISION_APPROVAL_FUNCTIONS,
  claimUseRowProblems,
  claimUseRowRefusal,
  frozenRevisionEdits,
  isRevisionApproved,
  newRevisionApprovals,
  revisionApprovalForgeries,
} from '../src/utils/claimEvidence';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};
const col = (key: string) => REGISTER_CONFIGS.find((c) => c.key === 'claimEvidenceTraceability')!.columns.find((c) => c.key === key)!;

const LIB = [{ id: 'L1', wording: 'Hydrates', status: 'Approved', revision: 3 }];
const project = (claims: RegisterRow[], library: unknown[] = LIB): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: [], reviewers: {} } as never);
  p.registers = { ...p.registers, claimEvidenceTraceability: claims };
  p.reference = { ...p.reference, claimsLibrary: library as never };
  return p;
};
const reviewItem = (p: ProjectData) => gateReadinessChecklist(p, 'SG03').find((i) => i.id === 'sg03-reg-claims')!;

// a claim that needs review (a sensitive subject) and has a complete, passing Regulatory review
const reviewed = (over: RegisterRow = {}): RegisterRow => ({
  claimId: 'CLM-1', approvedWording: 'Hydrates', claimCategory: 'Cosmetic', claimRisk: 'Low', claimSubjects: 'Pregnancy', revision: 1, status: 'Pending',
  preliminaryEvidenceRequirement: 'in-vitro hydration',
  regulatoryReviewOutcome: 'Approved', regulatoryReviewer: 'R', regulatoryReviewDate: '2026-02-01', regulatoryReviewRationale: 'ok', regulatoryReviewEvidence: 'http://x',
  technicalReviewOutcome: 'Approved', technicalReviewer: 'T', technicalReviewDate: '2026-02-01', technicalReviewRationale: 'ok', technicalReviewEvidence: 'http://y',
  ...over,
});

// --- the columns --------------------------------------------------------------------------------------------------------------------------------------
t('the scope has two values and blank reads as in scope', CLAIM_SCOPE_OPTIONS.length === 2 && !claimIsExcluded({}) && !claimIsExcluded({ claimScope: 'In scope' }) && claimIsExcluded({ claimScope: CLAIM_SCOPE_EXCLUDED }));
t('an exclusion carries its reason (required while excluded)', col('scopeExclusionReason').requiredWhen?.values.includes(CLAIM_SCOPE_EXCLUDED) === true);
t('the review conditions and who accepts them are columns; the acceptance is the person\'s own act', !!col('reviewConditions') && col('reviewConditionsAcceptedBy').selfAttest === true);
t('the library revision reused is written by the server, not typed', col('libraryRevision').editable === false);
t('the fit to product, evidence, market and channel is verified by the person themselves', !!col('libraryFitVerification') && col('libraryFitVerifiedBy').selfAttest === true);
t('the Regulatory and the Technical approval of a revision are separate columns, each the approver\'s own act', col('revisionApprovedBy').selfAttest === true && col('revisionTechnicalApprovedBy').selfAttest === true && !!col('revisionTechnicalApprovedDate'));

// --- 18(a) a Not Approved claim ------------------------------------------------------------------------------------------------------------------
{
  const notApproved = reviewed({ regulatoryReviewOutcome: 'Not Approved' });
  t('a claim reviewed Not Approved that stays in scope blocks Gate 3', reviewItem(project([notApproved])).satisfied === false);
  // With nothing left in scope the review does not apply: the item becomes the generated "not triggered" N/A, which Regulatory acknowledges (critical gate).
  const excludedItem = reviewItem(project([{ ...notApproved, claimScope: CLAIM_SCOPE_EXCLUDED }]));
  t('...the same claim excluded as a rejected concept is out of the review: the item reads "not triggered", not blocked by the refused review', /not triggered/.test(excludedItem.label) && !!excludedItem.acknowledgement);
  t('Further Information Required blocks too, until it is excluded or re-reviewed', reviewItem(project([reviewed({ regulatoryReviewOutcome: 'Further Information Required' })])).satisfied === false);
  t('one excluded claim does not excuse another that is in scope', reviewItem(project([{ ...notApproved, claimScope: CLAIM_SCOPE_EXCLUDED }, reviewed({ claimId: 'CLM-2', regulatoryReviewOutcome: 'Not Approved' })])).satisfied === false);
  t('an excluded claim authorises no use, whatever its use row says', /excluded/.test(claimUseRowRefusal({ claimUseDecision: 'Approved', approvedRevision: '1' }, { ...reviewed(), claimScope: CLAIM_SCOPE_EXCLUDED }) ?? ''));
  const gate3Rows = gateReadinessChecklist(project([{ claimId: 'CLM-9', claimScope: CLAIM_SCOPE_EXCLUDED, approvedWording: '', claimCategory: '', claimRisk: '' }, reviewed({ claimId: 'CLM-1' })]), 'SG03');
  t('an excluded claim with blank columns does not hold the Gate 3 completeness items', gate3Rows.find((i) => i.id === 'sg03-classification')?.satisfied === true, JSON.stringify(gate3Rows.find((i) => i.id === 'sg03-classification')));
}

// --- 18(a) Approved with Conditions ----------------------------------------------------------------------------------------------------------------
{
  const withConditions = reviewed({ regulatoryReviewOutcome: 'Approved with Conditions' });
  t('Approved with Conditions needs the evidence plan, the conditions and who accepts them', claimConditionsGaps(withConditions).length === 2 && claimConditionsGaps({ ...withConditions, preliminaryEvidenceRequirement: '' }).length === 3);
  t('...with all three recorded there is nothing missing', claimConditionsGaps({ ...withConditions, reviewConditions: 'repeat the test', reviewConditionsAcceptedBy: 'A' }).length === 0);
  t('Approved with no conditions asks for none', claimConditionsGaps(reviewed()).length === 0);
  t('the Technical review can carry the conditions too', claimConditionsGaps(reviewed({ technicalReviewOutcome: 'Approved with Conditions' })).length === 2);
  t('the Gate 3 item blocks until they are recorded', reviewItem(project([withConditions])).satisfied === false);
  t('...and passes once they are', reviewItem(project([{ ...withConditions, reviewConditions: 'repeat the test', reviewConditionsAcceptedBy: 'A' }])).satisfied === true);
}

// --- 18(b) reuse of a Claims Library approval ------------------------------------------------------------------------------------------------------
{
  const linked = (over: RegisterRow = {}): RegisterRow => ({ libraryEntryId: 'L1', libraryRevision: '3', libraryFitVerification: 'fits the product, evidence, UK, packaging', libraryFitVerifiedBy: 'V', ...over });
  t('a link to an Approved entry with its revision and fit recorded is a reuse', claimLibraryReuseHolds(linked(), LIB));
  t('...without the fit verified it is not', !claimLibraryReuseHolds(linked({ libraryFitVerification: '' }), LIB) && !claimLibraryReuseHolds(linked({ libraryFitVerifiedBy: '' }), LIB));
  t('...nor when the entry has moved to a later revision since', !claimLibraryReuseHolds(linked(), [{ ...LIB[0], revision: 4 }]));
  t('...nor when the entry is no longer Approved', !claimLibraryReuseHolds(linked(), [{ ...LIB[0], status: 'Withdrawn' }]));
  t('...nor with no link', !claimLibraryReuseHolds(linked({ libraryEntryId: '' }), LIB));
  const noTechnical = (over: RegisterRow = {}) => reviewed({ technicalReviewOutcome: '', technicalReviewer: '', technicalReviewDate: '', technicalReviewRationale: '', technicalReviewEvidence: '', ...over });
  t('a reused library entry spares the Technical review', reviewItem(project([noTechnical(linked())])).satisfied === true);
  t('...a link without the fit verified does not: matching wording alone is not substantiation', reviewItem(project([noTechnical(linked({ libraryFitVerification: '' }))])).satisfied === false);
  t('...and a new claim still needs it', reviewItem(project([noTechnical()])).satisfied === false);
  const use = { useId: 'CU-1', claimId: 'CLM-1', claimUseDecision: 'Approved', useDecisionDate: '2026-03-01', intendedChannel: 'Website', useTechnicalApprover: '' };
  t('a claim-use approval needs the Technical approval when the library reuse is not recorded as fitting', claimUseRowProblems(project([reviewed(linked({ libraryFitVerification: '' }))]), [use]).some((m) => /Technical approval/.test(m)));
  t('...and does not when the reuse holds', !claimUseRowProblems(project([reviewed(linked())]), [use]).some((m) => /Technical approval/.test(m)));
}

// --- 18(c) who approves a revision ------------------------------------------------------------------------------------------------------------------
{
  t('the two revision approvals map to the Regulatory Claims and Technical Claims functions', REVISION_APPROVAL_FUNCTIONS.revisionApprovedBy.functionKey === 'regulatory-claims' && REVISION_APPROVAL_FUNCTIONS.revisionTechnicalApprovedBy.functionKey === 'technical-claims');
  t('all four approval columns are frozen with the revision', REVISION_APPROVAL_COLUMNS.length === 4);
  const before = [reviewed()];
  const regApproved = [reviewed({ revisionApprovedBy: 'Reg', revisionApprovedDate: '2026-04-01' })];
  const techApproved = [reviewed({ revisionTechnicalApprovedBy: 'Tech', revisionTechnicalApprovedDate: '2026-04-01' })];
  t('a newly recorded Regulatory approval names its function', JSON.stringify(newRevisionApprovals(before, regApproved)) === JSON.stringify([{ claimId: 'CLM-1', column: 'revisionApprovedBy' }]));
  t('...and a Technical one names the other', newRevisionApprovals(before, techApproved)[0]?.column === 'revisionTechnicalApprovedBy');
  t('an unchanged approval is not new', newRevisionApprovals(regApproved, regApproved).length === 0);
  t('either approval makes the revision approved (and so frozen)', isRevisionApproved(regApproved[0]) && isRevisionApproved(techApproved[0]) && !isRevisionApproved(before[0]));
  t('a Technical approval freezes the wording just as the Regulatory one does', frozenRevisionEdits(techApproved, [{ ...techApproved[0], approvedWording: 'New words' }]).length === 1);
  t('the second approval may be added to an approved revision, and an approval already recorded cannot be changed or cleared', frozenRevisionEdits(regApproved, [{ ...regApproved[0], ...techApproved[0], revisionApprovedBy: 'Reg', revisionApprovedDate: '2026-04-01' }]).length === 0 && frozenRevisionEdits(regApproved, [{ ...regApproved[0], revisionApprovedBy: 'Other' }]).length === 1 && frozenRevisionEdits(regApproved, [{ ...regApproved[0], revisionApprovedBy: '', revisionApprovedDate: '' }]).length === 1);
  t('...a new revision is the way out', frozenRevisionEdits(techApproved, [{ ...techApproved[0], approvedWording: 'New words', revision: 2 }]).length === 0);
  t('an approval recorded in another person\'s name is refused for both columns', revisionApprovalForgeries(before, regApproved, 'Someone').length === 1 && revisionApprovalForgeries(before, techApproved, 'Someone').length === 1 && revisionApprovalForgeries(before, regApproved, 'Reg').length === 0);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
