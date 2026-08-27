// Review owners / co-signers (2026-07-23, user-requested). Previously each
// page's "Review owner · Co-sign: …" caption was a hardcoded demo-name string
// baked into config (registers.ts SHEET_METADATA / DEPARTMENTS, phases.ts). Now
// the PEOPLE are entered per-project on the Create New Project form and stored
// on `ProjectIdentity.reviewers` (keyed by the role keys below); config only
// declares the STRUCTURE (which role owns / co-reviews / co-signs each area),
// and each page composes the caption from the current project's assigned people
// via composeReviewOwner(). Project Manager is the near-universal final
// co-signer, so composeReviewOwner appends it automatically — specs only
// declare the owner plus any EXTRA co-reviewers/co-signers.

export interface ReviewRole {
  key: string;
  label: string; // responsibility shown in parentheses, e.g. "Formulation"
  // The name the V18 workbook prints for this area. Digitised, a person is
  // never configuration: every project picks its own people at creation
  // (ProjectIdentity.reviewers), so this is NOT a default and nothing reads it
  // at runtime. Its one job is `seedReviewOwnerUsers()` creating a real User
  // account per name, so those people are selectable in the pickers.
  // Renamed from `defaultName` on 2026-08-20 — the old name claimed exactly the
  // behaviour this comment denies.
  workbookName: string;
}

// The full set collected at project creation (all required).
//
// Labels re-derived from the company's real job titles (2026-08-27,
// user-supplied), replacing the earlier dev-invented functional-area names —
// the sheet-to-person mapping comes from who actually owns each real
// workbook tab, not from a guessed department name. Two people previously
// assumed to be the same ("Sankar"/"Sekar", one letter apart) turned out to
// be genuinely different: Sankar owns exactly one tab (Stability_Release),
// Sekar owns two (GMP_Links, Micro_PET_Evidence) — see `dept-quality`/
// `dept-quality-gmp`/the new production-support group in registers.ts.
//
// ORDER MATTERS and is not arbitrary (reordered 2026-07-26, re-sequenced
// 2026-08-27 to match the new job-title grouping): it mirrors the
// `DEPARTMENTS` order in config/registers.ts — the sidebar's "WORKBOOK BY
// RESPONSIBILITY" groups — so the Reviewers popover, the Create New Project
// form fields and the Sheet Map's responsibility facet all read in the same
// sequence the user navigates the workbook in. Previously the two lists were
// in completely different orders, so the same 13 people appeared in one
// sequence in the sidebar and another in every reviewer list.
//
// Facility / PM Operations, HR/Quality and Digital / Platforms stay last:
// they own no sheet of their own (they only ever co-review or co-sign), so
// they have no place in the lifecycle sequence — no new job title was
// supplied for these 3 either, so their labels are untouched.
//
// If DEPARTMENTS is reordered, reorder this list to match.
export const REVIEW_ROLES: ReviewRole[] = [
  // Project Manager now owns real content (the NPD Front-End Roadmap group),
  // not just cross-cutting co-sign — see REVIEW_SPECS.npdFrontEnd below.
  { key: 'project-manager', label: 'Project Manager', workbookName: 'Chris' }, // dept-npd-frontend
  { key: 'formulation', label: 'Technical Services', workbookName: 'Tuan' }, // dept-formulation
  { key: 'quality-gmp', label: 'QA & Regulatory Affairs', workbookName: 'Sekar' }, // dept-quality-gmp
  { key: 'quality', label: 'Production Support', workbookName: 'Sankar' }, // dept-production-support
  { key: 'ri', label: 'R&I', workbookName: 'George' }, // dept-quality (the old "Quality" group's real R&I content)
  { key: 'regulatory', label: 'Regulatory Affairs Manager', workbookName: 'Chi Chu' }, // dept-regulatory
  { key: 'packaging', label: 'Sales Manager', workbookName: 'Lily' }, // dept-packaging
  { key: 'raw-material', label: 'Raw Material Coordinator', workbookName: 'Chidkamon' }, // dept-raw-material
  { key: 'sales-marketing', label: 'Project Lead', workbookName: 'Nguyen' }, // dept-sales-marketing — Nguyen is also the company's real CEO/project sponsor
  { key: 'supply-chain', label: 'Logistics & Supply Chain Manager', workbookName: 'Hannah' }, // dept-supply-chain
  // own no sheets — co-review / co-sign only
  { key: 'facility-pm', label: 'Facility / PM Operations', workbookName: 'Kaukab' },
  { key: 'hr-quality', label: 'HR/Quality', workbookName: 'Lani' },
  { key: 'digital-platforms', label: 'Digital / Platforms', workbookName: 'Anki' },
];

export const REVIEW_ROLE_KEYS = REVIEW_ROLES.map((r) => r.key);

export function reviewRoleLabel(key: string): string {
  return REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
}

export interface ReviewCredit {
  role: string; // ReviewRole.key
  hat?: string; // optional sub-hat, e.g. "PET", "Stability", "Formula BOM & sensory testing"
}

export interface ReviewOwnerSpec {
  owner: ReviewCredit;
  coReview?: ReviewCredit[]; // rendered "· Co-review: …"
  coSign?: ReviewCredit[]; // EXTRA co-signers, rendered before the auto-appended Project Manager
}

// Reusable specs mirroring the V18 workbook's per-area review-owner combos.
// (Project Manager is auto-appended to Co-sign by composeReviewOwner.)
export const REVIEW_SPECS = {
  // Project Manager's real content ownership (2026-08-27): the NPD
  // Front-End Roadmap group, previously attributed to 'ri' (R&I) as a
  // placeholder — Chris's real job title is Project Manager, and this is
  // what he actually owns per the company's org structure.
  npdFrontEnd: { owner: { role: 'project-manager' } },
  rawMaterial: { owner: { role: 'raw-material' } },
  formulation: { owner: { role: 'formulation' } },
  formulationProductDevReport: { owner: { role: 'formulation', hat: 'Product Development Reporting' } },
  quality: { owner: { role: 'quality' }, coSign: [{ role: 'hr-quality' }] },
  qualityGmp: { owner: { role: 'quality-gmp' } },
  qualityGmpPet: { owner: { role: 'quality-gmp' }, coSign: [{ role: 'formulation', hat: 'PET' }] },
  // Stability_Release's real tab is 'Sankar-Stability_Release' (v2, the sole
  // authoritative file) — Sankar is 'quality', not 'quality-gmp' (Sekar).
  // This spec previously had owner: 'quality-gmp', contradicting its own tab
  // prefix; renamed from qualityGmpStability and corrected (2026-08-27,
  // found while explaining why this sheet sits in the "Quality & GMP" nav
  // group at all — it stays there, content-grouped alongside GMP_Links/
  // Micro_PET_Evidence, same pattern as R&I sheets filed under "Quality";
  // the owner correction is what makes it badge "· Quality" there instead of
  // silently reading as Sekar's own).
  qualityStability: { owner: { role: 'quality' }, coSign: [{ role: 'formulation', hat: 'Stability' }] },
  regulatory: { owner: { role: 'regulatory' } },
  regulatoryWithRi: { owner: { role: 'regulatory' }, coSign: [{ role: 'ri' }] },
  ri: { owner: { role: 'ri' } },
  packaging: { owner: { role: 'packaging' } },
  releasedLabel: { owner: { role: 'packaging' }, coReview: [{ role: 'digital-platforms' }] },
  salesMarketing: { owner: { role: 'sales-marketing' } },
  supplyChain: { owner: { role: 'supply-chain' } },
  facilityPm: { owner: { role: 'facility-pm' } },
  // NPD Front-End Roadmap (v2 workbook, 2026-07-24) — Evidence & Claim
  // Support is owned by R&I with Quality co-review (Roadmap: "R&I /
  // Quality"). The other new NPD sheets reuse the existing `ri` spec.
  //
  // Competitor Landscape's owner was originally 'sales-marketing' (Roadmap:
  // "Marketing / R&I") — changed to 'project-manager' (2026-08-27,
  // user-requested), overriding that Roadmap-sheet cell: these 4 registers
  // have no real per-sheet workbook tab of their own (they're app-side
  // splits of one companion sheet with no owner prefix at all), sit inside
  // the "Project Manager" nav group, and the user chose to match the group
  // rather than keep the Roadmap's own "Marketing" assignment.
  npdCompetitor: { owner: { role: 'project-manager' }, coReview: [{ role: 'ri' }] },
  npdEvidence: { owner: { role: 'ri' }, coReview: [{ role: 'quality' }] },
} satisfies Record<string, ReviewOwnerSpec>;

// Compose the "Owner (Area) · Co-review: … · Co-sign: …, Chris (Project Manager)"
// caption from a spec + a project's assigned reviewers. An unassigned role
// falls back to a bracketed area label so a partially-filled project never
// renders a blank name (creation requires all roles, so this is defensive).
export function composeReviewOwner(spec: ReviewOwnerSpec, reviewers: Record<string, string> | undefined): string {
  const people = reviewers ?? {};
  const credit = (c: ReviewCredit): string => {
    const label = reviewRoleLabel(c.role);
    const hatted = c.hat ? `${label} – ${c.hat}` : label;
    const name = people[c.role]?.trim() || `‹${label}›`;
    return `${name} (${hatted})`;
  };
  let out = credit(spec.owner);
  if (spec.coReview && spec.coReview.length > 0) {
    out += ` · Co-review: ${spec.coReview.map(credit).join(', ')}`;
  }
  const coSign: ReviewCredit[] = [...(spec.coSign ?? []), { role: 'project-manager' }];
  out += ` · Co-sign: ${coSign.map(credit).join(', ')}`;
  return out;
}

// Register closing (2026-08-27) — which REVIEW_ROLES key must sign each of
// the 2 closing roles, straight from the register's own spec: no separate
// nomination step exists (unlike phase sign-off), so this IS the assignment.
// 'Review owner' -> spec.owner.role; 'Co-sign' -> the first declared co-signer,
// or Project Manager if the spec names none (mirrors composeReviewOwner's own
// auto-append). Shared by the API (apps/api/src/projects/projects.service.ts)
// and the frontend closing panel — never re-derive this independently.
export function registerClosureSignerRole(
  spec: ReviewOwnerSpec,
  role: 'Review owner' | 'Co-sign',
): string {
  return role === 'Review owner' ? spec.owner.role : (spec.coSign?.[0]?.role ?? 'project-manager');
}

// ---------------------------------------------------------------------------
// Person -> responsibility lookups (2026-07-25)
// ---------------------------------------------------------------------------
// The source workbook encoded "who is responsible" as a tab-name PREFIX
// (Tuan-, George-, ChiChu-, …), which is how a person found their own tabs.
// Digitised, that prefix must NOT be a fixed folder: the people are assigned
// per project on the Create New Project form (ProjectIdentity.reviewers), so
// "my sheets" is a per-project lookup, not a static grouping. These helpers
// back the "My Sheets" page and the Sheet Map's responsibility facet.

export type ReviewInvolvement = 'owner' | 'co-review' | 'co-sign';

// Which review roles a person holds on a project. Matched on the stored
// displayName (what the Create-form user picker writes), trimmed and
// case-insensitive so a differently-cased directory name still matches.
export function rolesAssignedTo(
  reviewers: Record<string, string> | undefined,
  personName: string | undefined,
): string[] {
  const needle = personName?.trim().toLowerCase();
  if (!needle || !reviewers) return [];
  return Object.entries(reviewers)
    .filter(([, name]) => name?.trim().toLowerCase() === needle)
    .map(([role]) => role);
}

// How the holder of `roleKeys` is involved in one review spec. Mirrors
// composeReviewOwner's auto-appended Project Manager co-signature, so the
// Project Manager correctly comes back as a co-signer of EVERY area rather
// than appearing to own nothing.
export function involvementIn(
  spec: ReviewOwnerSpec | undefined,
  roleKeys: string[],
): ReviewInvolvement[] {
  if (!spec || roleKeys.length === 0) return [];
  const holds = (c: ReviewCredit) => roleKeys.includes(c.role);
  const out: ReviewInvolvement[] = [];
  if (holds(spec.owner)) out.push('owner');
  if ((spec.coReview ?? []).some(holds)) out.push('co-review');
  const coSign: ReviewCredit[] = [...(spec.coSign ?? []), { role: 'project-manager' }];
  if (coSign.some(holds)) out.push('co-sign');
  return out;
}

// The assigned person for a spec's OWNER role, e.g. to label a nav group with
// who actually holds it on this project. Falls back to the area label.
export function ownerName(
  spec: ReviewOwnerSpec | undefined,
  reviewers: Record<string, string> | undefined,
): string | undefined {
  if (!spec) return undefined;
  return reviewers?.[spec.owner.role]?.trim() || `‹${reviewRoleLabel(spec.owner.role)}›`;
}
