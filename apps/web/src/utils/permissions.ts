import { ADMIN_ROLE } from '@mbc360/shared/config/roles';

// The role x capability permission grid, loaded from the backend
// (`GET /api/rbac/permissions-grid`) into the store. A capability id is
// `${resource}|${action}` — the same format the API returns — e.g.
// `gate:SG07|decide`, `phase:3|approve`, `market-track|approve`.
//
// This replaces the old keyword-match token logic (`canDecideGate` etc. in
// @mbc360/shared/config/roles) as the runtime source for the frontend "View
// as" demo simulation (2026-07-23, user-requested): editing a role's
// capabilities in the Users & Roles Role Editor now changes what that role
// can do here, live, once the grid is reloaded. The shared token functions
// remain only as the SEED DEFAULT that `seedRbac()` uses to populate the DB
// grid initially.
export interface PermissionDef {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export interface PermissionGrid {
  permissions: PermissionDef[];
  grants: Record<string, string[]>; // roleKey -> capability ids
}

// Stable empty reference so a component selecting `grants` from an unloaded
// grid doesn't churn re-renders.
export const EMPTY_GRANTS: Record<string, string[]> = {};

function has(grants: Record<string, string[]>, roleKey: string, capabilityId: string): boolean {
  // System Administrator is unrestricted (mirrors PermissionsService.isAdmin
  // on the server) — it never carries explicit grants.
  if (roleKey === ADMIN_ROLE) return true;
  return grants[roleKey]?.includes(capabilityId) ?? false;
}

export function canDecideGate(grants: Record<string, string[]>, roleKey: string, gateId: string): boolean {
  return has(grants, roleKey, `gate:${gateId}|decide`);
}

export function canApprovePhase(grants: Record<string, string[]>, roleKey: string, phase: number): boolean {
  return has(grants, roleKey, `phase:${phase}|approve`);
}

export function canEditMarketTrack(grants: Record<string, string[]>, roleKey: string): boolean {
  return has(grants, roleKey, 'market-track|approve');
}
