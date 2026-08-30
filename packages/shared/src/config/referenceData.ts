// Company-level controlled reference data (Round 4 questions 4, 17 and 28 —
// 2026-08-24).
//
// A new kind of thing in this app. The ~30 evidence registers are PER PROJECT:
// `RegisterConfig` declares their columns and every project gets its own copy of
// the rows at creation. That is the wrong shape for a shared list, and question 28
// says so outright — "Projects read from the library but do not directly edit it".
// One list, maintained in one place, that every project consults.
//
// Three datasets, one shape:
//
//   market-profile  (q4 · q27(d) · q35(b))  Regulatory's per-market requirements
//   rm-risk         (q17)                   the Raw Material Risk Overlay
//   claims-library  (q28)                   approved claim wording
//
// What they genuinely share is the thin part: company scope, an append-only
// revision history, a role-gated write, an evidence link and a review date, and
// read-only access from a project. What they do NOT share is workflow — only the
// Claims Library has a two-party approval gate and a withdrawal cascade — which is
// why this is a shared foundation rather than a generic framework.

import type { RawMaterialRisk } from '../types';

export const REFERENCE_DATASETS = ['market-profile', 'rm-risk', 'claims-library'] as const;
export type ReferenceDataset = (typeof REFERENCE_DATASETS)[number];

// Capability id per dataset, following the existing `${resource}|${action}` format
// (`gate:SG07|decide`, `market-track|approve`). One capability per dataset rather
// than one for "reference data" as a whole: question 17 names Technical, Safety and
// Regulatory for the risk overlay while question 4 names Regulatory alone for
// market profiles, so they are not the same authority.
export const referenceEditCapability = (dataset: ReferenceDataset): string => `reference:${dataset}|edit`;

// The three datasets' own shapes live in the canonical data model, because
// `ProjectData.reference` carries a resolved copy of them and `types/index.ts`
// imports nothing. Re-exported here so a caller reading about reference data has
// one module to import from.
export type {
  ClaimLibraryEntry,
  ClaimLibraryStatus,
  MarketProfile,
  ProjectReferenceData,
  RawMaterialRisk,
  RmRiskFlag,
} from '../types';
export { CLAIM_LIBRARY_AUDIENCES, CLAIM_LIBRARY_STATUSES, RM_RISK_FLAGS } from '../types';

// Round 4 question 28(3): "Technical AND Regulatory must both approve an entry
// before it becomes Approved Library Wording. Marketing/Brand may propose wording
// but not provide final technical/regulatory approval."
//
// Two capabilities, not one — the answer names two functions that must BOTH act,
// so a single "may approve" grant could not express it. Editing and proposing stay
// on the existing `reference:claims-library|edit`, which is what Marketing needs.
export const CLAIMS_LIBRARY_TECHNICAL_APPROVAL = 'claims-library|approve-technical';
export const CLAIMS_LIBRARY_REGULATORY_APPROVAL = 'claims-library|approve-regulatory';
export const CLAIMS_LIBRARY_APPROVAL_CAPABILITIES: readonly string[] = [
  CLAIMS_LIBRARY_TECHNICAL_APPROVAL,
  CLAIMS_LIBRARY_REGULATORY_APPROVAL,
];

// The status an entry SHOULD hold, derived from its two approval stamps and its
// withdrawal. Derived rather than stored-and-settable: "Approved Library Wording"
// is a consequence of two people having approved, and a status a person can type
// is a status that can say Approved with nobody's name against it.
export function claimLibraryStatusFor(entry: {
  technicalApprovedBy?: string;
  regulatoryApprovedBy?: string;
  withdrawnAt?: string;
}): ClaimLibraryStatusValue {
  if ((entry.withdrawnAt ?? '').trim() !== '') return 'Withdrawn';
  const technical = (entry.technicalApprovedBy ?? '').trim() !== '';
  const regulatory = (entry.regulatoryApprovedBy ?? '').trim() !== '';
  return technical && regulatory ? 'Approved' : 'Proposed';
}
type ClaimLibraryStatusValue = 'Proposed' | 'Approved' | 'Withdrawn';

// Question 28(2): "A project claim links to a library entry where it reuses
// approved wording. A genuinely new claim may be proposed WITHOUT a library link
// but must be identified as 'New claim — not yet in Claims Library', which
// triggers Regulatory and Technical review."
//
// So the marker is the answer's own words, and it is not a way out of anything —
// it is what makes C1's library condition fire.
export const CLAIM_NOT_IN_LIBRARY = 'New claim — not yet in Claims Library';
export const CLAIM_LIBRARY_LINK_OPTIONS = ['Linked to Claims Library', CLAIM_NOT_IN_LIBRARY] as const;
export const CLAIM_LIBRARY_ENTRY_COLUMN = 'libraryEntryId';

// C1's remaining condition, at last evaluable: "wording is not in the approved
// Claims Library". A claim counts as covered ONLY by a link to an entry that is
// currently Approved — a Proposed entry has not been through the two-party gate,
// and a Withdrawn one is exactly what question 28(5) says must "flag affected
// material for re-review".
export function claimCoveredByLibrary(
  row: { [key: string]: unknown },
  library: readonly { id: string; status: string }[],
): boolean {
  const linked = String(row[CLAIM_LIBRARY_ENTRY_COLUMN] ?? '').trim();
  if (linked === '') return false;
  return library.some((e) => e.id === linked && e.status === 'Approved');
}

// A3's Gate 4 trigger, verbatim: "The ingredient or raw material contains
// fragrance, essential oils, botanical extracts, proteins, known allergens,
// residual solvents, heavy-metal risk, microbiological risk, restricted
// impurities, processing residues, or variable natural-source composition."
//
// Every one of the eleven flags is one of those, so ANY flag on ANY material the
// project uses fires the trigger. No subset — the answer lists them as
// alternatives, not as a scale.
//
// Two predicates rather than one boolean, because Round 4 question 7 requires a
// THIRD answer: a material with no overlay entry has not been classified, which is
// neither "carries a risk" nor "carries none". `evaluateTrigger` in
// utils/gateProgress.ts composes them into the tri-state — the composition lives
// there because that is where TriggerState is defined, and a config module
// importing the rule engine would be the wrong direction.

// Materials the project uses that carry at least one risk classification.
export function rmCodesWithRiskFlags(
  rmCodes: readonly string[],
  overlay: readonly Pick<RawMaterialRisk, 'rmCode' | 'flags'>[],
): string[] {
  const flagged = new Set(overlay.filter((r) => r.flags.length > 0).map((r) => r.rmCode));
  return rmCodes.filter((code) => flagged.has(code));
}

// Materials the project uses that have NO entry in the overlay at all.
//
// An entry with an empty `flags` list is deliberately NOT counted here: saving a
// row is the act of classifying, and ticking none of the eleven is a real answer.
// Absence of the row is the only thing that means "nobody has looked".
export function rmCodesUnclassified(
  rmCodes: readonly string[],
  overlay: readonly Pick<RawMaterialRisk, 'rmCode' | 'flags'>[],
): string[] {
  const known = new Set(overlay.map((r) => r.rmCode));
  return rmCodes.filter((code) => !known.has(code));
}

// One entry of the shared revision log, for display.
export interface ReferenceRevision {
  revision: number;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

// Question 4's fourteen enhanced-surveillance conditions, transcribed. Only some
// are readable from project data today; the market-specific one comes from
// `enhancedSurveillance` above. Kept here as the authoritative list so the Gate 12
// item can say which of them it actually checks.
export const ENHANCED_PMS_CONDITIONS: readonly string[] = [
  'Infant or young-child product',
  'Pregnancy, breastfeeding or postpartum product',
  'Intimate-use product',
  'Eye-area product or product with foreseeable eye exposure',
  'Product for sensitive, eczema-prone or compromised skin',
  'Product directed at a medically vulnerable population',
  'High-risk or therapeutic-adjacent claim',
  'New or unusual active ingredient',
  'Safety signal',
  'Adverse event',
  'Significant complaint trend',
  'Recurring quality or performance issue',
  'Market-specific vigilance requirement',
  'Requirement in an approved surveillance plan',
];

// Question 4's "market-specific vigilance requirement" limb, and the sentence that
// makes it a limb at all: "Do not use a permanently hard-coded country list.
// Regulatory maintains a configurable market profile." So the answer is read from
// the profile, and a market with no profile row contributes nothing — an absent
// profile is not evidence that a market has no vigilance requirement, which is
// why this can only ever ADD the enhanced review, never rule it out.
export function marketRequiresEnhancedSurveillance(
  projectMarkets: readonly string[],
  profiles: readonly { market: string; enhancedSurveillance: boolean }[],
): boolean {
  return profiles.some((p) => projectMarkets.includes(p.market) && p.enhancedSurveillance);
}

// Question 13's company schedule, in months from the ACTUAL commercial launch date
// — not the launch approval date, which is what `MarketTrack.launchApprovedDate`
// holds. The one-month review applies only to enhanced-surveillance products.
export const POST_LAUNCH_REVIEW_SCHEDULE = {
  enhancedFirstReviewMonths: 1,
  standardFirstReviewMonths: 3,
  fullReviewMonths: 12,
  annuallyThereafter: true,
} as const;
