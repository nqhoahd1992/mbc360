// Round 5 question 22 (SME answer, 2026-11-05): how a post-launch finding is dealt with, and which signals bring a review forward.
//
//   (a) "Triage and assignment alone close the intake step. The performance finding also needs a recorded assessment, conclusion, evidence, impact on
//        claims/quality and CHG decision. Corrective work requires verified closure, or an explicitly accepted non-critical open action with a due date in
//        the current review. No separate duplicate performance report is needed if these fields are in the same Post-Market/CAPA review. A Critical
//        unresolved issue blocks closure."
//   (b)(i) "A significant adverse event, material quality signal, regulator request or meaningful complaint trend brings review forward. Log other reports
//        for triage; every minor query need not start a full review. Record severity, significance, reviewer and escalation decision. Urgent safety triage
//        must not wait for a scheduled milestone."
//   (b)(ii) "Record trends in Post-Market Sources/CAPA: source records, period, market, product/version/batches, number of reports, denominator where
//        available, comparison period, interpretation, reviewer/date and action. Do not require an arbitrary universal numerical threshold."
//   (b)(iii) "Yes. Distinguish performance/efficacy questions, safety/adverse events, quality/packaging, regulatory and general information. A performance
//        challenge triggers technical review according to significance; a routine wording query can be handled without advancing the whole review schedule."
//
// The five categories are the answer's own list, worded as the team wrote it. The other values are ours: the answer names the facts to record (significance,
// escalation decision, change decision) but not their choices [ASSUMPTION: R6-Q30].
export const POST_MARKET_CATEGORIES = [
  'Performance or efficacy question',
  'Safety or adverse event',
  'Quality or packaging',
  'Regulatory',
  'General information',
] as const;
export const CATEGORY_PERFORMANCE = 'Performance or efficacy question';

export const POST_MARKET_SIGNIFICANCE = ['Significant', 'Not significant'] as const;
export const SIGNIFICANT = 'Significant';

// What the reviewer decided about the review schedule. "Urgent safety triage must not wait for a scheduled milestone" is its own choice.
export const ESCALATION_DECISIONS = ['Review brought forward', 'Urgent safety triage', 'Not escalated — handled in triage'] as const;
export const ESCALATION_FORWARD: readonly string[] = ['Review brought forward', 'Urgent safety triage'];

export const CHANGE_DECISIONS = ['Change Control raised', 'No change needed'] as const;
export const CHANGE_DECISION_RAISED = 'Change Control raised';

// A trend row's own conclusion (no numerical threshold: the interpretation is the reviewer's).
export const TREND_CONCLUSIONS = ['Meaningful trend', 'Not a meaningful trend'] as const;
export const TREND_MEANINGFUL = 'Meaningful trend';
