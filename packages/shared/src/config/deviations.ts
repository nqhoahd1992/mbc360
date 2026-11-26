// Round 5 question 26: the vocabularies of a deviation record (see utils/deviations.ts for the rules). Kept apart from the rules so the register
// config can use them without importing the rule code. `[ASSUMPTION: R6-Q34]`
export const DEVIATION_SOURCES = ['Published outside the workflow', 'Released content no longer valid', 'Other'] as const;
// The four kinds that hold a market's release, taken from the answer; "Other" is recorded and reviewed but does not hold Gate 11.
export const DEVIATION_ISSUE_TYPES = ['Safety', 'Compliance', 'Claims', 'Version mismatch', 'Other'] as const;
export const DEVIATION_BLOCKING_ISSUE_TYPES: readonly string[] = ['Safety', 'Compliance', 'Claims', 'Version mismatch'];
export const DEVIATION_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const DEVIATION_DISPOSITIONS = ['Open', 'Contained', 'Corrected', 'Accepted under controlled action', 'Closed'] as const;
export const DEVIATION_ACCEPTED = 'Accepted under controlled action';
// What the owner of released content records when a warning on it comes up (Round 5 question 26(d)).
export const VALIDITY_DISPOSITIONS = ['Re-reviewed — still valid', 'Use restricted', 'Withdrawn or superseded', 'Deviation raised'] as const;
