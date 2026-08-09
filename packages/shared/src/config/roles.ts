import { GATES, PHASES } from './gates';

// A4 (confirmed): role-based permissions must be enforced — only the owning
// function can approve its decisions; anyone may contribute evidence.
//
// DEMO-PARITY ROLE MODEL: until follow-up F6's role×gate/phase PERMISSION
// GRID is confirmed, authorization is derived from each gate's "Primary
// owner" and each phase's responsible department by keyword match. This
// module is the single source for that mapping — the web "View as"
// simulation consumes the functions directly, and the backend seeder
// materialises the same mapping into the roles / permissions / role_permissions
// tables. When the grid is answered, replace `SSO_ROLES`'s `tokens` (and the
// special-cases in `canApprovePhase`/`canEditMarketTrack` below) with it.

export interface ViewRole {
  key: string;
  label: string;
  tokens: string[]; // matched (lower-case) against gate primaryOwner / phase department
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
  { key: ADMIN_ROLE, label: 'Admin (unrestricted)', tokens: [] },
  { key: 'project-owner', label: 'Project owner', tokens: ['project owner'] },
  { key: 'marketing-sales', label: 'Marketing / Sales', tokens: ['marketing', 'sales'] },
  { key: 'npd-ri', label: 'NPD / R&I', tokens: ['r&i', 'npd', 'study owner'] },
  { key: 'procurement', label: 'Procurement', tokens: ['procurement'] },
  { key: 'packaging', label: 'Packaging / Artwork', tokens: ['packaging', 'artwork'] },
  { key: 'manufacturing', label: 'Manufacturing', tokens: ['manufacturing'] },
  { key: 'quality', label: 'Quality', tokens: ['quality', 'pv/pms'] },
  { key: 'safety', label: 'Safety / Scientific Review', tokens: ['safety', 'scientific review'] },
  { key: 'regulatory', label: 'Regulatory / Claims', tokens: ['regulatory', 'claims', 'reg + mgt'] },
];

// F6 (confirmed 2026-07-21): the real, SSO-facing role list — "At least 17
// roles are defined" (docs/rules/Business_Rules_Confirmation_EN.md, A4/F6). This is
// now the SINGLE source for: (1) real role assignment on the Users & Roles
// page (`GET /api/admin/roles` filters to this list), (2) the header's "View
// as" demo simulator, and (3) the gate/phase/market-track keyword-match
// permission functions below — unifying what used to be `SSO_ROLES` (labels
// only) + `VIEW_ROLES` (labels + tokens) into one list, per explicit user
// request (2026-07-23) to make "View as" reflect the real 17 roles.
//
// `tokens` here is a REASONABLE DERIVED mapping (mirroring the same
// gate-primaryOwner / phase-department keyword strategy `VIEW_ROLES` used),
// NOT an SME-confirmed answer — the actual F6 role×gate/phase permission
// grid is still open. Three groups of roles deliberately get NO tokens
// (`[]`, meaning they can't decide any gate or approve any phase through
// this generic mechanism):
//   - Study workflow roles (Department/Independent Study Reviewer) — their
//     real authority is the dedicated 3-role C2 Study Approval workflow
//     (`ProjectData.studyApprovals`), not general gate decisions.
//   - Published Information Technical Reviewer — its real authority is the
//     F11 published-info workflow states, not general gate decisions.
//   - Read-only Viewer — deliberately has no decide/approve authority
//     anywhere (there's no separate "can't even contribute" enforcement yet;
//     that would be new scope beyond this role list).
// "Final Approver" and "System Administrator" don't fit the per-gate/phase
// keyword model at all (cross-cutting sign-off authority, and unrestricted
// admin, respectively) — both are special-cased directly in `canApprovePhase`
// (Final Approver) and are already unrestricted via the existing `admin`
// short-circuit (System Administrator, which deliberately reuses `ADMIN_ROLE`
// rather than a new key — see `canDecideGate`/`canApprovePhase` below).
export const SSO_ROLES: ViewRole[] = [
  { key: 'sso-project-owner', label: 'Project Owner', tokens: ['project owner'] },
  { key: 'sso-formulation-contributor', label: 'R&I/Formulation Contributor', tokens: ['r&i', 'npd', 'study owner'] },
  { key: 'sso-safety-reviewer', label: 'Safety Reviewer', tokens: ['safety', 'scientific review'] },
  { key: 'sso-quality-reviewer', label: 'Quality Reviewer', tokens: ['quality', 'pv/pms'] },
  { key: 'sso-regulatory-reviewer', label: 'Regulatory Reviewer', tokens: ['regulatory', 'claims'] },
  { key: 'sso-packaging-artwork-contributor', label: 'Packaging/Artwork Contributor', tokens: ['packaging', 'artwork'] },
  { key: 'sso-marketing-sales-contributor', label: 'Marketing/Sales Contributor', tokens: ['marketing', 'sales'] },
  { key: 'sso-supply-chain-contributor', label: 'Supply Chain Contributor', tokens: ['supply chain'] },
  { key: 'sso-manufacturing-link-contributor', label: 'Manufacturing Link Contributor', tokens: ['manufacturing'] },
  { key: 'sso-study-author', label: 'Study Author', tokens: ['study owner'] },
  { key: 'sso-department-study-reviewer', label: 'Department Study Reviewer', tokens: [] },
  { key: 'sso-independent-study-reviewer', label: 'Independent Study Reviewer', tokens: [] },
  { key: 'sso-published-info-technical-reviewer', label: 'Published Information Technical Reviewer', tokens: [] },
  { key: 'sso-published-info-regulatory-reviewer', label: 'Published Information Regulatory Reviewer', tokens: ['regulatory'] },
  { key: 'sso-final-approver', label: 'Final Approver', tokens: [] },
  { key: ADMIN_ROLE, label: 'System Administrator', tokens: [] },
  { key: 'sso-read-only-viewer', label: 'Read-only Viewer', tokens: [] },
];

function roleTokens(roleKey: string): string[] | null {
  if (roleKey === ADMIN_ROLE) return null; // unrestricted
  return SSO_ROLES.find((r) => r.key === roleKey)?.tokens ?? [];
}

function matches(tokens: string[] | null, ownerText: string | undefined): boolean {
  if (tokens === null) return true; // admin
  if (!ownerText) return false;
  const owner = ownerText.toLowerCase();
  return tokens.some((t) => owner.includes(t));
}

// Only the gate's primary-owner function (or admin) may record its decision.
export function canDecideGate(roleKey: string, gateId: string): boolean {
  const gate = GATES.find((g) => g.id === gateId);
  return matches(roleTokens(roleKey), gate?.primaryOwner);
}

// Only the phase's responsible department (or admin) may sign "Approved by".
// Final Approver is cross-cutting sign-off authority by design (that's the
// whole point of the role) rather than tied to any one phase's department
// keyword, so it's special-cased here instead of via `tokens`.
export function canApprovePhase(roleKey: string, phase: number): boolean {
  if (roleKey === 'sso-final-approver') return true;
  const meta = PHASES.find((p) => p.phase === phase);
  return matches(roleTokens(roleKey), meta?.department);
}

// Market regulatory/launch tracking is a Regulatory approval (rule A4 example:
// "only Regulatory can approve regulatory decisions").
export function canEditMarketTrack(roleKey: string): boolean {
  return roleKey === ADMIN_ROLE || roleKey === 'sso-regulatory-reviewer';
}

export function roleLabel(roleKey: string): string {
  return SSO_ROLES.find((r) => r.key === roleKey)?.label ?? roleKey;
}
