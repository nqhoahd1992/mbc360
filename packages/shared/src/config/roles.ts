import { GATES, PHASES } from './gates';

// A4 (confirmed): role-based permissions must be enforced — only the owning
// function can approve its decisions; anyone may contribute evidence.
//
// DEMO-PARITY ROLE MODEL: until follow-up F6 delivers the real role/permission
// matrix (and its SSO/AD source), authorization is derived from each gate's
// "Primary owner" and each phase's responsible department by keyword match.
// This module is the single source for that mapping — the web "View as"
// simulation consumes the functions directly, and the backend seeder
// materialises the same mapping into the roles / permissions / role_permissions
// tables. When F6 is answered, replace the seed data (and this mapping).

export interface ViewRole {
  key: string;
  label: string;
  tokens: string[]; // matched (lower-case) against gate primaryOwner / phase department
}

export const ADMIN_ROLE = 'admin';

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

function roleTokens(roleKey: string): string[] | null {
  if (roleKey === ADMIN_ROLE) return null; // unrestricted
  return VIEW_ROLES.find((r) => r.key === roleKey)?.tokens ?? [];
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
export function canApprovePhase(roleKey: string, phase: number): boolean {
  const meta = PHASES.find((p) => p.phase === phase);
  return matches(roleTokens(roleKey), meta?.department);
}

// Market regulatory/launch tracking is a Regulatory approval (rule A4 example:
// "only Regulatory can approve regulatory decisions").
export function canEditMarketTrack(roleKey: string): boolean {
  return roleKey === ADMIN_ROLE || roleKey === 'regulatory';
}

export function roleLabel(roleKey: string): string {
  return VIEW_ROLES.find((r) => r.key === roleKey)?.label ?? roleKey;
}
