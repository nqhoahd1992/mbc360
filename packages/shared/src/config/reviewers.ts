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
  // Absent on the FUNCTION roles below: they are not people the workbook names, so there is no account to seed for them.
  workbookName?: string;
  // True on a FUNCTION role (added 2026-11-05): who holds a professional function on this project — Safety / Scientific
  // Review, Technical Claims, Quality, … — as opposed to who owns a workbook area. Never required to create a project: a
  // project may have nobody in the function, and then it reads "Unassigned" and whatever needs that authority waits
  // (Round 5 question 37(b): "show Unassigned and block decisions that need that authority; do not silently substitute the
  // Lead"). The project's Lead assigns or changes them at any time (PUT …/function-assignees); the thirteen area roles
  // stay write-once at creation.
  optional?: boolean;
  // Set on a SUB-ROLE: a specialist who sits INSIDE the function named by this key — "Quality / microbiology reviewer" is a
  // specialism within Quality, "Safety / study reviewer" within Safety (2026-11-06, project owner's reading of how the review
  // team writes these names in Round 5 question 1(a): a lower-case word after the slash is a specialism inside the function
  // before it, a capitalised name is an independent function). Holding the parent does NOT hold the sub-role, and a
  // sub-role's holder acknowledges only the items that name the sub-role. [ASSUMPTION: R6-Q1]
  parent?: string;
  // The area this person owns, shown ONLY where the job title alone is
  // ambiguous (2026-10-01). Set it when `label` collides with something else on
  // the same screen; leave it undefined otherwise, so twelve of thirteen rows
  // stay the plain job title the company actually uses.
  area?: string;
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
  // The project's accountable owner (Round 5 question 37(a): "Project owner -> Project Manager is acceptable only if that person is
  // the nominated accountable owner"; project owner's choice, 2026-11-06). The workbook says "Project owner" in about 25 Owner cells
  // and never says who that is, and the review team separates it from the project Lead (who leads the project) and from the
  // Project Manager, so it is its own field, named by the Lead when the project is created — it may be the same person as either.
  // It owns no sheets: it is what the "Project owner" Owner cells stand for. A project that predates the field shows it as
  // Unassigned until its Lead names one (LEAD_ASSIGNABLE_ROLE_KEYS). No account is seeded for it.
  { key: 'project-owner', label: 'Project owner' },
  // Project Manager now owns real content (the NPD Front-End Roadmap group),
  // not just cross-cutting co-sign — see REVIEW_SPECS.npdFrontEnd below.
  { key: 'project-manager', label: 'Project Manager', workbookName: 'Chris' }, // dept-npd-frontend
  // The four area names below are the workbook's own words from its REVIEW OWNER headers — Formulation, Quality & GMP, Raw
  // Material Operations, Supply Chain (project owner, 2026-11-06, after an audit found the job titles that had replaced them
  // on 2026-08-27 — Technical Services, QA & Regulatory Affairs, Raw Material Coordinator, Logistics & Supply Chain Manager —
  // appear in neither the workbook nor the review team's own words).
  { key: 'formulation', label: 'Formulation', workbookName: 'Tuan' }, // dept-formulation
  { key: 'quality-gmp', label: 'Quality & GMP', workbookName: 'Sekar' }, // dept-quality-gmp
  // 'quality' and 'packaging' ARE the Quality and Packaging / Artwork functions (2026-11-06, project owner): the company job
  // titles that used to label them, "Production Support" and "Sales Manager", are the same roles under different names, and the
  // review team (Round 5 question 37(a)) found those titles misleading. So the one person named here holds the function; there
  // is no second, optional Quality or Packaging / Artwork field.
  { key: 'quality', label: 'Quality', workbookName: 'Sankar' }, // dept-production-support
  { key: 'ri', label: 'R&I', workbookName: 'George' }, // dept-quality (the old "Quality" group's real R&I content)
  // 'regulatory' IS the Regulatory function (2026-11-06, project owner: "Regulatory Affairs Manager" and "Regulatory" are one role,
  // as with Quality and Packaging / Artwork above), so the Regulatory acknowledgements and the Owner cells that say Regulatory
  // both read this one required field. Regulatory Claims below is a separate function the review team lists in question 37(b).
  { key: 'regulatory', label: 'Regulatory', workbookName: 'Chi Chu' }, // dept-regulatory
  { key: 'packaging', label: 'Packaging / Artwork', workbookName: 'Lily' }, // dept-packaging
  { key: 'raw-material', label: 'Raw Material Operations', workbookName: 'Chidkamon' }, // dept-raw-material
  // Sales & Marketing is its OWN role, separate from the project's Lead (project owner, 2026-11-06). It was labelled "Project Lead"
  // (the person's job title) from the 2026-08-27 relabel, which collided with the Project Identification block's own
  // `projectLead` field — the form showed two pickers both called "Project Lead" and had to add an area to tell them apart. They
  // are different roles: this one owns the Sales & Marketing sheets (campaigns, HCP/distributor answer packs, panel feedback,
  // change control, templates) and is the "commercial lead" the Marketing and Sales Owner cells stand for; `projectLead` is whoever
  // leads the individual project. Naming this one for its area ends the collision, so `area` is no longer set anywhere.
  { key: 'sales-marketing', label: 'Sales & Marketing', workbookName: 'Nguyen' }, // dept-sales-marketing — Nguyen is also the company's real CEO/project sponsor
  { key: 'supply-chain', label: 'Supply Chain', workbookName: 'Hannah' }, // dept-supply-chain
  // own no sheets — co-review / co-sign only
  { key: 'facility-pm', label: 'Facility / PM Operations', workbookName: 'Kaukab' },
  { key: 'hr-quality', label: 'HR/Quality', workbookName: 'Lani' },
  { key: 'digital-platforms', label: 'Digital / Platforms', workbookName: 'Anki' },

  // ---- FUNCTION roles (2026-11-05). Round 5 questions 1(b) and 37(b): the review team names the FUNCTION that has to
  // acknowledge a "not applicable" reason (Safety, Regulatory, Quality, Technical claims, …) and says a function is a named
  // person on the project, never derived from a job title that merely looks similar. Quality and Packaging / Artwork are NOT
  // repeated here: they are the 'quality' and 'packaging' area roles above (see the note there). Everything below is optional;
  // nothing seeds an account.
  { key: 'safety-scientific', label: 'Safety / Scientific Review', optional: true },
  { key: 'clinical-study', label: 'Clinical / Study Coordinator', optional: true },
  { key: 'technical-claims', label: 'Technical Claims', optional: true },
  // "Technical claims reviewer" and "Authorised human-study reviewer" are worded exactly as the review team wrote them in the
  // acknowledgement table of Round 5 question 1(a) and have no parent function the team names, so each stays its OWN function:
  // nothing says "Technical claims reviewer" is the "Technical Claims" function above or "Authorised human-study reviewer" the
  // "Clinical / Study Coordinator" (2026-11-06, project owner: no inference). If the team later says they are, merge them.
  // [ASSUMPTION: R5-Q6]
  { key: 'technical-claims-reviewer', label: 'Technical claims reviewer', optional: true },
  { key: 'human-study-reviewer', label: 'Authorised human-study reviewer', optional: true },
  // A specialism inside Safety (see `parent`), worded as the team wrote it.
  { key: 'safety-study-reviewer', label: 'Safety / study reviewer', optional: true, parent: 'safety-scientific' },
  { key: 'regulatory-claims', label: 'Regulatory Claims', optional: true },
  // Three specialisms INSIDE Quality (see `parent`), each named exactly as the review team wrote it in Round 5 question 1(a).
  // "Quality / microbiology reviewer" acknowledges Preservative strategy (Gate 5) and Preservative efficacy status (Gate 9);
  // "Quality / post-market reviewer" the Gate 12 feedback and surveillance reviews; "Quality / change-control reviewer" the
  // Gate 12 change-control links. The Quality holder does not stand in for them.
  { key: 'quality-microbiology', label: 'Quality / microbiology reviewer', optional: true, parent: 'quality' },
  { key: 'quality-post-market', label: 'Quality / post-market reviewer', optional: true, parent: 'quality' },
  { key: 'quality-change-control', label: 'Quality / change-control reviewer', optional: true, parent: 'quality' },
  { key: 'manufacturing', label: 'Manufacturing', optional: true },
  { key: 'finance', label: 'Finance', optional: true },
  { key: 'legal-ip', label: 'Legal / IP', optional: true },
  { key: 'commercial-approver', label: 'Commercial Approver', optional: true },
];

// The two halves of REVIEW_ROLES: the thirteen workbook AREA roles every project must name at creation, and the FUNCTION
// roles a project may leave unassigned.
export const AREA_ROLES = REVIEW_ROLES.filter((r) => !r.optional);
export const FUNCTION_ROLES = REVIEW_ROLES.filter((r) => r.optional);

// Roles the project's Lead (or an administrator) may assign or change AFTER the project is created: every function, plus the
// Project owner, which a project created before the field existed has to be able to get. The other review areas are named once,
// at creation. One list for the server (which refuses anything else) and the team card (which shows the picker).
export const LEAD_ASSIGNABLE_ROLE_KEYS: readonly string[] = [...FUNCTION_ROLES.map((r) => r.key), 'project-owner'];

export const REVIEW_ROLE_KEYS = REVIEW_ROLES.map((r) => r.key);

export function reviewRoleLabel(key: string): string {
  return REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
}

// The label for a picker that sits next to fields which are NOT review roles —
// today only the Create New Project form, where "Project Lead" otherwise reads
// identically to the Project Identification field of the same name. Everywhere
// else (captions, My Sheets, the Reviewers popover) every entry is a review
// role, so the job title alone is unambiguous and `reviewRoleLabel` is right.
export function reviewRoleFieldLabel(role: ReviewRole): string {
  return role.area ? `${role.label} · ${role.area}` : role.label;
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

// A fixed row's Owner is a FUNCTION ("Project owner", "R&I / Regulatory"), because the workbook has no project to name a person
// from. On a project the function is somebody: this writes the person beside each function that matches one of the project's
// review roles — "Project owner — Chris", "R&I — George / Regulatory — Chi Chu" — and leaves a function with no matching role as it
// is rather than guessing a name for it. Round 5 question 37 (answered 2026-11-05): a function is never derived from a similar
// job label. A function nobody holds reads "Unassigned" ("show Unassigned … do not silently substitute the Lead").
// Quality and Packaging / Artwork are the 'quality' and 'packaging' area roles themselves (project owner, 2026-11-06:
// "Production Support" is Quality and "Sales Manager" is Packaging / Artwork), so they are always held by a named person.
// R&I, Procurement (Raw Material Operations) and Marketing/Sales
// (the nominated commercial lead) keep the area role the team accepted. "Project owner" is its own role named by the Lead
// (project owner, 2026-11-06), not the Project Manager. [ASSUMPTION: R5-Q74]
// "Claims" is left unmapped: it could be Technical or Regulatory Claims and nothing says which.
const OWNER_FUNCTION_ROLES: Record<string, string> = {
  'project owner': 'project-owner',
  'r&i': 'ri',
  regulatory: 'regulatory',
  marketing: 'sales-marketing',
  sales: 'sales-marketing',
  procurement: 'raw-material',
  formulation: 'formulation',
  npd: 'formulation',
  // functions (Round 5 question 37(b))
  safety: 'safety-scientific',
  clinical: 'clinical-study',
  quality: 'quality',
  manufacturing: 'manufacturing',
  packaging: 'packaging',
  artwork: 'packaging',
  finance: 'finance',
  legal: 'legal-ip',
};

// The word the Owner cell shows for a role whose workbook words differ from its name on the form (project owner, 2026-11-06:
// "Formulation" and "NPD" are the one Formulation role).
const OWNER_FUNCTION_DISPLAY: Record<string, string> = { formulation: 'Formulation' };

export function ownerFunctionWithPeople(text: string, reviewers: Record<string, string> | undefined): string {
  if (!text || !reviewers) return text;
  // Keep the workbook's own separators ("/", "+", "->") exactly where they were.
  const pieces = text.split(/(\s+\/\s+|\s*\+\s*|\s*->\s*)/);
  const entries: { sep: string; text: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pieces.length; i += 2) {
    const sep = i === 0 ? '' : pieces[i - 1];
    const token = pieces[i].trim();
    const role = OWNER_FUNCTION_ROLES[token.toLowerCase().replace(/ owner$/, token.toLowerCase() === 'project owner' ? ' owner' : '')];
    // Two workbook words for one role read as that one role ("Formulation / NPD" is the Formulation role, once).
    const shown = (role && OWNER_FUNCTION_DISPLAY[role]) || token;
    const name = role ? reviewers[role]?.trim() : '';
    let rendered: string;
    if (name) rendered = `${shown} — ${name}`;
    // A FUNCTION nobody holds on this project says so; an area role is always filled (the Create form requires it).
    else if (role && LEAD_ASSIGNABLE_ROLE_KEYS.includes(role)) rendered = `${shown} — Unassigned`;
    else rendered = pieces[i];
    if (role && seen.has(rendered)) continue;
    if (role) seen.add(rendered);
    entries.push({ sep, text: rendered });
  }
  return entries.map((e, i) => (i === 0 ? '' : e.sep) + e.text).join('');
}

// The register columns that hold such a function: fixed, plain text, named Owner or Person in charge.
export function isOwnerFunctionColumn(column: { key: string; type: string; editable?: boolean }): boolean {
  return column.editable === false && column.type === 'text' && (column.key === 'owner' || column.key === 'personInCharge');
}
