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
  // The V18 workbook's demo name for this role — used as the Create-form
  // placeholder and to seed the demo projects, so the app looks unchanged
  // until someone assigns real people.
  defaultName: string;
}

// The full set collected at project creation (all required). Order is the
// order shown on the Create New Project form.
export const REVIEW_ROLES: ReviewRole[] = [
  { key: 'project-manager', label: 'Project Manager', defaultName: 'Chris' },
  { key: 'formulation', label: 'Formulation', defaultName: 'Tuan' },
  { key: 'ri', label: 'R&I', defaultName: 'George' },
  { key: 'quality', label: 'Quality', defaultName: 'Sankar' },
  { key: 'quality-gmp', label: 'Quality & GMP', defaultName: 'Sekar' },
  { key: 'regulatory', label: 'Regulatory', defaultName: 'Chi Chu' },
  { key: 'raw-material', label: 'Raw Material Operations', defaultName: 'Chidkamon' },
  { key: 'packaging', label: 'Packaging', defaultName: 'Lily' },
  { key: 'sales-marketing', label: 'Sales & Marketing', defaultName: 'Nguyen' },
  { key: 'supply-chain', label: 'Supply Chain', defaultName: 'Hannah' },
  { key: 'facility-pm', label: 'Facility / PM Operations', defaultName: 'Kaukab' },
  { key: 'hr-quality', label: 'HR/Quality', defaultName: 'Lani' },
  { key: 'digital-platforms', label: 'Digital / Platforms', defaultName: 'Anki' },
];

export const REVIEW_ROLE_KEYS = REVIEW_ROLES.map((r) => r.key);

export function reviewRoleLabel(key: string): string {
  return REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
}

// Map of role key -> workbook demo name; seeds demo projects and fills the
// Create-form defaults so the app reads exactly as before until reassigned.
export const DEFAULT_REVIEWERS: Record<string, string> = Object.fromEntries(
  REVIEW_ROLES.map((r) => [r.key, r.defaultName]),
);

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
  rawMaterial: { owner: { role: 'raw-material' } },
  formulation: { owner: { role: 'formulation' } },
  formulationProductDevReport: { owner: { role: 'formulation', hat: 'Product Development Reporting' } },
  quality: { owner: { role: 'quality' }, coSign: [{ role: 'hr-quality' }] },
  qualityGmp: { owner: { role: 'quality-gmp' } },
  qualityGmpPet: { owner: { role: 'quality-gmp' }, coSign: [{ role: 'formulation', hat: 'PET' }] },
  qualityGmpStability: { owner: { role: 'quality-gmp' }, coSign: [{ role: 'formulation', hat: 'Stability' }] },
  regulatory: { owner: { role: 'regulatory' } },
  regulatoryWithRi: { owner: { role: 'regulatory' }, coSign: [{ role: 'ri' }] },
  ri: { owner: { role: 'ri' } },
  packaging: { owner: { role: 'packaging' } },
  releasedLabel: { owner: { role: 'packaging' }, coReview: [{ role: 'digital-platforms' }] },
  salesMarketing: { owner: { role: 'sales-marketing' } },
  supplyChain: { owner: { role: 'supply-chain' } },
  facilityPm: { owner: { role: 'facility-pm' } },
  // NPD Front-End Roadmap (v2 workbook, 2026-07-24) — Competitor Landscape is
  // owned by Marketing with R&I co-review (Roadmap: "Marketing / R&I");
  // Evidence & Claim Support is owned by R&I with Quality co-review (Roadmap:
  // "R&I / Quality"). The other new NPD sheets reuse the existing `ri` spec.
  npdCompetitor: { owner: { role: 'sales-marketing' }, coReview: [{ role: 'ri' }] },
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
