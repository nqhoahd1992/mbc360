// Rule C1 (SME Round 3, confirmed): "A Regulatory review is mandatory where:
// category = Borderline / therapeutic-adjacent; category = Therapeutic — not
// permitted; risk = High; wording is not in the approved Claims Library; the
// claim varies from previously approved wording; the market imposes a specific
// restriction; the claim relates to pregnancy, breastfeeding, infant use,
// disease, treatment, prevention, healing or medical endorsement."
//
// Seven conditions. FIVE are evaluable today — the three reading B7's per-claim
// classification and the wording-drift check (CLAIM_REVIEWED_WORDING_COLUMN
// below), all built 2026-08-11, plus the market restriction, which became readable
// on 2026-08-24 when question 4's Market profiles dataset shipped
// (`marketRestrictsClaims` below). The other TWO are listed in
// UNEVALUATED_C1_CONDITIONS below and are shown to the user on the readiness
// item, because silently enforcing half a rule and reporting it as covered is one
// of the two mistakes this project has already made once (see CLAUDE.md).

export const CLAIM_CATEGORIES_NEEDING_REVIEW = [
  'Borderline / therapeutic-adjacent',
  'Therapeutic — not permitted within the cosmetic claim pathway',
];

// 'High' is C1's own word. 'Pending classification' is NOT in C1 — we read an
// unclassified claim as needing review, since "we have not decided how risky this
// is" cannot be a reason to skip the review. CONFIRMED by Round 4 question 7
// (2026-08-24), which states it as a rule in its own right: "A Pending claim
// classification must trigger Regulatory review until classified."
export const CLAIM_RISKS_NEEDING_REVIEW = ['High', 'Pending classification'];

// The conditions C1 names that the app cannot evaluate yet, in C1's own words,
// with what each is waiting for. Rendered on the readiness item.
//
// Was three; two remain. Round 4 questions 28, 4 and 27 (2026-08-24) each supplied
// the missing piece, and question 4's is BUILT — the market-restriction condition
// left this list when the Market profiles dataset shipped. The other two wait on
// their data sources: the Claims Library (question 28, group 4d) and the structured
// claim-subject flags (question 27, group 5) [R4-REWORK: câu 27(1)(3)].
export const UNEVALUATED_C1_CONDITIONS = [
  // Question 28 settles what kind of thing the library is, which was the real
  // blocker: a COMPANY-LEVEL list that a project claim POINTS AT, so "not in the
  // library" becomes a fact the system knows rather than a judgement someone
  // makes. A claim with no link is permitted but must be marked "New claim — not
  // yet in Claims Library", which itself triggers Regulatory and Technical
  // review — so this condition becomes evaluable in both directions. Neither
  // workbook has a Claims Library tab — checked; it is new software.
  //
  // One part of question 28 is not buildable as written: changing or withdrawing a
  // library entry "must not automatically remove a product from the market unless
  // the change is critical or required by Regulatory" — and who declares a change
  // critical, and whether that is the same `Critical` as the four-level scale
  // questions 3/33/34 settled, is not said [ASSUMPTION: R5-Q9].
  'wording is not in the approved Claims Library (the Claims Library does not exist yet — F11)',
  // ✅ "the market imposes a specific restriction" LEFT this list on 2026-08-24,
  // when question 4's market profile gave it a data source: the
  // `claimNeedsRegulatoryReview` trigger now calls `marketRestrictsClaims` below
  // against the profiles for this project's own markets.
  //
  // Worth being precise about what that does and does not assert. The app reads
  // Regulatory's own record, and a market with no restriction recorded is Regulatory
  // saying there is none — that is what the Market profiles page exists to state, so
  // it counts as checked. What it is NOT is a guarantee that Regulatory has got
  // round to every market: an unconfigured market is visible as such on that page
  // ("not set"), which is where a gap in the reference data belongs, rather than
  // being reported here as a gap in the rule.
  // Question 27: replaced by eleven structured claim-subject flags (Pregnancy ·
  // Breastfeeding · Postpartum · Infant or child · Disease or condition ·
  // Treatment or prevention · Healing or repair · Medical or HCP endorsement ·
  // Safety or tolerance · Comparative or superiority · Other sensitive topic),
  // "rather than inferring from free text" — so it stops being a judgement.
  'the claim relates to pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing or medical endorsement (reading that from the wording is a judgement, not a lookup)',
];

// What must be recorded for a triggering claim to count as reviewed. Modelled on
// D3, the shape the team themselves specified for the same situation at Gate 4
// (reviewer assessment + reviewer + date + rationale + evidence). C1 gives no
// equivalent list, so the shape was borrowed rather than invented. CONFIRMED by
// Round 4 question 27(a), 2026-08-24: "Accept the proposed Regulatory review
// fields … For a triggered claim, all five must be completed."
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
// Both readings are CONFIRMED (2026-08-24). Question 27 settles the mechanism —
// "A later change to the reviewed wording must invalidate the previous review and
// trigger reassessment" — i.e. this claim's own last approval, which is what the
// snapshot holds; wording approved elsewhere in the company is the Claims Library
// question instead (28). Question 30(a) settles the typo: only whitespace-only
// changes may be ignored, and every other difference is "reviewed by a person,
// not auto-judged equivalent" — so treating a typo fix as varying is right.
export const CLAIM_REVIEWED_WORDING_COLUMN = 'reviewedWording';
export const CLAIM_WORDING_COLUMN = 'approvedWording';

// C1's "the market imposes a specific restriction", made evaluable 2026-08-24 by
// Round 4 question 4's configurable market profile.
//
// Reads whether ANY market this project sells into has a restriction recorded. Not
// which market or which claim: C1 uses the condition to decide whether a
// Regulatory review is REQUIRED, and a restriction in one of the project's markets
// makes the review required for the project's claims — narrowing it per claim
// would need a per-claim market list, which the declaration register does not have
// (markets live on the SKU usage rows, question 19(b)).
//
// The condition is only honestly "checked" once at least one profile exists, which
// is why `UNEVALUATED_C1_CONDITIONS` keeps its line until then. An empty table is
// not evidence of no restriction.
export function marketRestrictsClaims(
  projectMarkets: readonly string[],
  profiles: readonly { market: string; claimRestrictions?: string }[],
): boolean {
  return profiles.some(
    (p) => projectMarkets.includes(p.market) && (p.claimRestrictions ?? '').trim() !== '',
  );
}

// Outcome vocabulary: ours originally — D3's four values are about whether a
// watch-list hit is real, which does not transfer. CONFIRMED by Round 4 question
// 27(b), 2026-08-24, which accepts all four.
//
// ⚠️ The reply writes them capitalised: "Approved · Approved with Conditions ·
// Not Approved · Further Information Required". This repo transcribes controlled
// values verbatim, and question 29's mandatory-comment list names the same three
// strings, so the two must not drift [R4-REWORK: câu 27(b)].
export const CLAIM_REVIEW_OUTCOMES = [
  'Approved',
  'Approved with conditions',
  'Not approved',
  'Further information required',
] as const;
