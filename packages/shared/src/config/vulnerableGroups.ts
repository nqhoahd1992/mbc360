// Which Gate 02 target-user option implies which vulnerable group (2026-08-11,
// user-proposed: "map it and the app is more logical and far less error-prone").
//
// It closes a real hole. B5 insists the system distinguish "a target user was
// selected" from "a vulnerable-use group was explicitly recognised" — so the two
// records are deliberately separate. But nothing checked they AGREE: a project
// could tick Pregnancy in Target Users and record "No vulnerable-user group
// identified" in the Vulnerable-User Assessment, and Gate 02 passed. That is not
// two independent judgements, it is a contradiction.
//
// Read by the `vulnerableGroupsCovered` check: every mapped target user selected
// must have an assessment row naming its group. It can only ever ADD a
// requirement, never satisfy one — the row still needs its safety pathway,
// responsible reviewer and notes.
//
// The nine pairs below are CONFIRMED (Round 4 question 25(a), 2026-08-24) — four
// identical in wording (Pregnancy · Breastfeeding · Postpartum · Infant 0+) and
// five renames of the same population that appear near-verbatim in B5's own list
// (Child 2+/3+ -> Young child · Cancer patient support · Kidney disease support ·
// Sensitive skin). The two-way strengths this file feeds are confirmed too (25(d)):
// an exact contradiction is refused outright, while a renamed or broader group
// recorded with no matching target user warns and asks for a rationale, because
// the Safety/Regulatory reviewer may identify that context independently.
//
// The four options left unmapped were answered as follows, and only one of the
// four became a map entry:
//
//   Dry / eczema-prone skin — the combined option was SPLIT (2026-08-29, in
//     `phases.ts`), because the two halves get opposite answers: "dry skin alone
//     should not automatically be a vulnerable-user group. Eczema-prone or
//     compromised skin should." So 'Eczema-prone or compromised skin' is mapped
//     below and 'Dry skin' deliberately is not. Mapping the COMBINED option would
//     have misclassified every dry-skin-only project, which is why this waited
//     for the split rather than taking the answer's fallback ("if it cannot be
//     split, treat the combined option as triggering the review") — that fallback
//     is the conservative reading, and it is what the migration applies to ticks
//     recorded before the split.
//   Family use — not automatically vulnerable, but it must PROMPT confirmation of
//     the age groups actually included, and activate the relevant pathway when
//     infants or young children are among them. That is a question to ask, not a
//     row to require, so no map entry can express it — it is a new trigger, and
//     it belongs with the Infant & Baby Safety pathway (question 1, group 7).
//   Intimate area — triggers a specialised use-site and safety assessment, which
//     is a different control from the vulnerable-user assessment this map feeds.
//   Swimmers — confirmed as NOT a vulnerable population. Correctly absent.
//
// See docs/plans/Round4_Implementation_Roadmap.md, the independent items.
export const TARGET_USER_TO_VULNERABLE_GROUP: Record<string, string> = {
  Pregnancy: 'Pregnancy',
  Breastfeeding: 'Breastfeeding',
  Postpartum: 'Postpartum',
  'Infant 0+': 'Infant 0+',
  'Child 2+': 'Young child',
  'Child 3+': 'Young child',
  'Sensitive skin': 'Sensitive or compromised skin',
  // Question 25(b), 2026-08-29. Shares a group with 'Sensitive skin' on the
  // answer's own wording — "Sensitive or compromised skin" is one population.
  'Eczema-prone or compromised skin': 'Sensitive or compromised skin',
  'Cancer patient support': 'Oncology or medically vulnerable support context',
  'Kidney disease support': 'Renal or other health-related support context',
};

// The register value that records an absence. Recording it while a mapped target
// user is selected is the contradiction this whole file exists to catch.
export const NO_VULNERABLE_GROUP = 'No vulnerable-user group identified';
