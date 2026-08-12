// Rule C1 (SME Round 3, confirmed): "A Regulatory review is mandatory where:
// category = Borderline / therapeutic-adjacent; category = Therapeutic — not
// permitted; risk = High; wording is not in the approved Claims Library; the
// claim varies from previously approved wording; the market imposes a specific
// restriction; the claim relates to pregnancy, breastfeeding, infant use,
// disease, treatment, prevention, healing or medical endorsement."
//
// Seven conditions. FOUR are evaluable today — the ones reading B7's per-claim
// classification, built 2026-08-11. The other four are listed in
// UNEVALUATED_C1_CONDITIONS below and are shown to the user on the readiness
// item, because silently enforcing half a rule and reporting it as covered is one
// of the two mistakes this project has already made once (see CLAUDE.md).

export const CLAIM_CATEGORIES_NEEDING_REVIEW = [
  'Borderline / therapeutic-adjacent',
  'Therapeutic — not permitted within the cosmetic claim pathway',
];

// 'High' is C1's own word. 'Pending classification' is NOT in C1 — we read an
// unclassified claim as needing review, since "we have not decided how risky this
// is" cannot be a reason to skip the review [ASSUMPTION: R4-Q9].
export const CLAIM_RISKS_NEEDING_REVIEW = ['High', 'Pending classification'];

// The three conditions C1 names that the app cannot evaluate yet, in C1's own
// words, with what each is waiting for. Rendered on the readiness item.
export const UNEVALUATED_C1_CONDITIONS = [
  'wording is not in the approved Claims Library (the Claims Library content does not exist yet — F11)',
  'the market imposes a specific restriction (per-market restriction lists do not exist yet — F10)',
  'the claim relates to pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing or medical endorsement (reading that from the wording is a judgement, not a lookup)',
];

// What must be recorded for a triggering claim to count as reviewed. Modelled on
// D3, the shape the team themselves specified for the same situation at Gate 4
// (reviewer assessment + reviewer + date + rationale + evidence). C1 gives no
// equivalent list, so the shape is borrowed rather than invented
// [ASSUMPTION: R4-Q24].
export const CLAIM_REVIEW_COLUMNS = ['regulatoryReviewOutcome', 'regulatoryReviewer', 'regulatoryReviewDate'];

// C1's "the claim varies from previously approved wording", made checkable
// 2026-08-11 (project owner: at first declaration there IS no previous wording —
// so this condition must be about change over time, not about the moment a claim
// is created; and since C1 lists "not in the approved Claims Library" as its OWN
// separate condition, this one is not that).
//
// Read as: the wording changed AFTER the review that approved it. The scenario it
// catches is real — Gate 3 approves "helps soothe the APPEARANCE of dry skin",
// three weeks later it becomes "soothes irritated skin", and the old signature now
// sits under wording nobody reviewed.
//
// So the wording is snapshotted when a review is recorded (see
// ProjectsService.setRegisterRows), and a row whose current wording no longer
// matches its snapshot counts as needing review again.
//
// Whether "previously approved" means this claim's own last approval or an
// approval on another project/SKU, and whether a typo fix counts as varying, are
// [ASSUMPTION: R4-Q24].
export const CLAIM_REVIEWED_WORDING_COLUMN = 'reviewedWording';
export const CLAIM_WORDING_COLUMN = 'approvedWording';

// Outcome vocabulary: ours. D3's four values are about whether a watch-list hit
// is real, which does not transfer; these are the outcomes a claim review can
// have [ASSUMPTION: R4-Q24].
export const CLAIM_REVIEW_OUTCOMES = [
  'Approved',
  'Approved with conditions',
  'Not approved',
  'Further information required',
] as const;
