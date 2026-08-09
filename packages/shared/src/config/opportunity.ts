// Gate 1 "Opportunity & Request" capture — added 2026-08-09 from the SME's
// Round 3 answers B1, B2 and B3 (docs/rounds/2026-08-07-sme-reply-round3.txt).
// Every option below is transcribed verbatim from that reply; do not paraphrase.

// B1: "Yes, this is distinct from the person who submitted the request." The
// requester's own name and department stay as separate fields — this records
// where the request ORIGINATED, not who filed it.
export const REQUEST_ORIGIN_OPTIONS = [
  'Internal product-development proposal',
  'Management request',
  'Sales request',
  'Marketing request',
  'Customer request',
  'Distributor request',
  'Healthcare-professional request',
  'Consumer feedback',
  'Complaint or post-market signal',
  'Market research or identified opportunity',
  'Competitor or benchmark response',
  'Regulatory change',
  'Supplier or ingredient opportunity',
  'Manufacturing or quality improvement',
  'Reformulation or lifecycle improvement',
  'Other — specify',
] as const;

// B2 asks the "Initial product scope defined" supporting field to capture four
// things: proposed product type, intended purpose, WHETHER IT IS new
// development / reformulation / claim change / packaging change / market
// extension / lifecycle improvement, and the known boundaries of the request.
//
// Three of those four are prose and live in `initialScope` free text. The third
// is deliberately a controlled dropdown instead, because a trigger has to read
// it: A3's competitor-review condition is "mandatory where the project is a new
// product, claim extension, repositioning project ... NOT mandatory for a purely
// administrative change", and Gate 9's scale-up condition reads the same
// property. A free-text blob cannot drive either. Which of these values counts
// as "purely administrative" is Round 4 question 11 [ASSUMPTION: R4-Q7].
export const PROJECT_NATURE_OPTIONS = [
  'New development',
  'Reformulation',
  'Claim change',
  'Packaging change',
  'Market extension',
  'Lifecycle improvement',
] as const;

export type RequestOrigin = (typeof REQUEST_ORIGIN_OPTIONS)[number];
export type ProjectNature = (typeof PROJECT_NATURE_OPTIONS)[number];

// Gate 5 / Gate 9 — microbiological susceptibility of the formula (2026-08-09).
// Two Conditional triggers read this one property: A3's preservative strategy
// at Gate 5 and preservative efficacy at Gate 9, so it is modelled once.
//
// The five values are lifted almost verbatim from A3's own sentence: "mandatory
// for water-containing, water-available, multi-use or otherwise
// microbiologically susceptible products. N/A may be used for genuinely
// anhydrous, self-preserving, sterile or single-use products with documented
// rationale."
//
// Deliberately a recorded human judgement rather than a value derived from the
// BOM. "Contains water" IS derivable — an INCI line of Aqua/Water — and the UI
// uses that as a suggestion. But "water-available, multi-use" is not: an
// anhydrous balm in a jar, opened with wet hands, is still susceptible, and no
// composition data says so. A3 also asks for a documented rationale, which only
// a person can supply.
export const MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS = [
  'Susceptible',
  'Anhydrous',
  'Self-preserving',
  'Sterile',
  'Single-use',
] as const;

export type MicrobiologicalSusceptibility = (typeof MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS)[number];
