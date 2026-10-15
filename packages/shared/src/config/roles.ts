// Roles. A4 (confirmed): role-based permissions must be enforced — only the owning function can approve its decisions; anyone
// may contribute evidence. Since SW-37 (2026-10-15) the Role Editor governs only project-level actions and the screens outside a
// project; inside a project authority comes from the project's assignment (utils/projectAuthority.ts, registerAccess.ts).

export interface ViewRole {
  key: string;
  label: string;
}

export const ADMIN_ROLE = 'admin';

// Legacy demo/"View as" role list — superseded by `SSO_ROLES` below
// (2026-07-23, user-requested) as the source for both the "View as" simulator
// and the keyword-match permission functions. Kept only because
// `apps/api/prisma/seed.ts`'s `seedRbac()` still seeds these into the `roles`
// table for backward compat with whatever `@…demo.mbc360.local` accounts an
// existing dev database already has from before this change (never deleted —
// seeding here is additive-only) — nothing creates NEW users against these
// keys any more (`seedDemoUsers()` moved to `SSO_ROLES`), and nothing reads
// `tokens` from this list any more either. Safe to delete entirely once no
// dev database anywhere still has `UserRole` rows pointing at these keys.
export const VIEW_ROLES: ViewRole[] = [
  { key: ADMIN_ROLE, label: 'Admin (unrestricted)' },
  { key: 'project-owner', label: 'Project owner' },
  { key: 'marketing-sales', label: 'Marketing / Sales' },
  { key: 'npd-ri', label: 'NPD / R&I' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'packaging', label: 'Packaging / Artwork' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'quality', label: 'Quality' },
  { key: 'safety', label: 'Safety / Scientific Review' },
  { key: 'regulatory', label: 'Regulatory / Claims' },
];

// F6 (confirmed 2026-07-21): the real, SSO-facing role list — "At least 17 roles are defined"
// (docs/rules/Business_Rules_Confirmation_EN.md, A4/F6). The single source for role assignment on the Users & Roles page
// (`GET /api/admin/roles` filters to this list) and for the header's "View as" preview.
export const SSO_ROLES: ViewRole[] = [
  { key: 'sso-project-owner', label: 'Project Owner' },
  { key: 'sso-formulation-contributor', label: 'R&I/Formulation Contributor' },
  { key: 'sso-safety-reviewer', label: 'Safety Reviewer' },
  { key: 'sso-quality-reviewer', label: 'Quality Reviewer' },
  { key: 'sso-regulatory-reviewer', label: 'Regulatory Reviewer' },
  { key: 'sso-packaging-artwork-contributor', label: 'Packaging/Artwork Contributor' },
  { key: 'sso-marketing-sales-contributor', label: 'Marketing/Sales Contributor' },
  { key: 'sso-supply-chain-contributor', label: 'Supply Chain Contributor' },
  { key: 'sso-manufacturing-link-contributor', label: 'Manufacturing Link Contributor' },
  { key: 'sso-study-author', label: 'Study Author' },
  { key: 'sso-department-study-reviewer', label: 'Department Study Reviewer' },
  { key: 'sso-independent-study-reviewer', label: 'Independent Study Reviewer' },
  { key: 'sso-published-info-technical-reviewer', label: 'Published Information Technical Reviewer' },
  { key: 'sso-published-info-regulatory-reviewer', label: 'Published Information Regulatory Reviewer' },
  { key: 'sso-final-approver', label: 'Final Approver' },
  { key: ADMIN_ROLE, label: 'System Administrator' },
  { key: 'sso-read-only-viewer', label: 'Read-only Viewer' },
];

export function roleLabel(roleKey: string): string {
  return SSO_ROLES.find((r) => r.key === roleKey)?.label ?? roleKey;
}
