// Round 5 question 28(b): the vocabularies of the Gate 9 stability conclusion and the Gate 11 release authorisation (rules in utils/releaseAuthorisation.ts),
// kept apart so the register config can use them without importing rule code. `[ASSUMPTION: R6-Q36]`
export const RELEASE_AUTHORISATIONS = ['Pending', 'Authorised', 'Not authorised'] as const;
export const STABILITY_CONCLUSIONS = ['Not Started', 'Meets criteria', 'Meets criteria with conditions', 'Does not meet criteria'] as const;
// Round 5 question 28(a): did the evidence demonstrated support the final claim wording?
export const BASIS_SUPPORT_OPTIONS = ['Yes', 'Partly — the wording must change', 'No'] as const;
export const BASIS_SUPPORTS_YES = 'Yes';
// Does the claim state an effect of the FINISHED product? Decides whether an ingredient-level evidence basis can exempt it.
export const FINISHED_PRODUCT_EFFECT_OPTIONS = ['Yes', 'No'] as const;
