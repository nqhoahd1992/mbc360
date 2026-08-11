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
// THREE LEVELS OF CERTAINTY, worth keeping straight [ASSUMPTION: R4-Q22]:
//
//   1. Identical wording — no interpretation at all:
//        Pregnancy · Breastfeeding · Postpartum · Infant 0+
//   2. A rename of the same population, near-verbatim in B5's own list:
//        Child 2+ / Child 3+          -> Young child
//        Cancer patient support       -> Oncology or medically vulnerable …
//        Kidney disease support       -> Renal or other health-related …
//        Sensitive skin               -> Sensitive or compromised skin
//   3. NOT mapped, because it would be our reading rather than a rename:
//        Dry / eczema-prone skin  (is eczema-prone "compromised skin"? medically
//          it reads that way, but B5 never says so — the closest call here)
//        Intimate area · Swimmers · Family use  (a family product may reach
//          children; the workbook does not say it does)
//        Oily skin · General adult · Professional / HCP recommendation ·
//          Other - specify  (no vulnerability implied)
//
// Level 3 is the part to revisit when the SME answers: an unmapped option means a
// project targeting ONLY that group can still record "none" and pass.
export const TARGET_USER_TO_VULNERABLE_GROUP: Record<string, string> = {
  Pregnancy: 'Pregnancy',
  Breastfeeding: 'Breastfeeding',
  Postpartum: 'Postpartum',
  'Infant 0+': 'Infant 0+',
  'Child 2+': 'Young child',
  'Child 3+': 'Young child',
  'Sensitive skin': 'Sensitive or compromised skin',
  'Cancer patient support': 'Oncology or medically vulnerable support context',
  'Kidney disease support': 'Renal or other health-related support context',
};

// The register value that records an absence. Recording it while a mapped target
// user is selected is the contradiction this whole file exists to catch.
export const NO_VULNERABLE_GROUP = 'No vulnerable-user group identified';
