import { ADMIN_ROLE } from '@mbc360/shared/config/roles';
import { referenceEditCapability, type ReferenceDataset } from '@mbc360/shared/config/referenceData';

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

// Archive / restore a project (2026-07-26). Seeded to Project Owner only.
// Deliberately checked against the REAL signed-in roles, not the "View as"
// simulator: archiving changes real data, so a demo role switch must not grant
// it. Deleting a project is not here at all — it is an isAdmin() check on the
// server and cannot be granted from the Roles page.
export function canArchiveProject(grants: Record<string, string[]>, roleKeys: string[]): boolean {
  return roleKeys.some((key) => has(grants, key, 'project|archive'));
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

// Round 4 question 32(c) (2026-08-24): recording Proceed with Conditions serves as
// the authorised acceptance of a flagged watch-list finding only where "the gate
// approver has the required Safety or Regulatory authority".
//
// EITHER authority is enough, not both. The answer names them as alternatives —
// "the required Safety **or** Regulatory authority" — because which one a finding
// needs depends on how it was escalated, and the app cannot always tell: a row at
// "REVIEW - possible formula match" was flagged by the automated screen, not by a
// named function [ASSUMPTION: R5-Q14].
export function canAcceptWatchlistFinding(grants: Record<string, string[]>, roleKey: string): boolean {
  return (
    has(grants, roleKey, 'watchlist-finding|accept-safety') ||
    has(grants, roleKey, 'watchlist-finding|accept-regulatory')
  );
}

// Round 4 question 34(d): "Only a person authorised to approve the relevant Gate 11
// impact may acknowledge it."
export function canAcknowledgeChangeImpact(grants: Record<string, string[]>, roleKey: string): boolean {
  return has(grants, roleKey, 'change-impact|acknowledge');
}

// Company-level reference data (Round 4 questions 4, 17, 28). Takes the REAL
// signed-in roles, not the "View as" simulator role, and any one of them is
// enough — these lists are company-wide rules, so a demo role switch must not
// grant the ability to change them. Same reasoning as `canArchiveProject`.
export function canEditReferenceData(
  grants: Record<string, string[]>,
  roleKeys: string[],
  dataset: ReferenceDataset,
): boolean {
  return roleKeys.some((key) => has(grants, key, referenceEditCapability(dataset)));
}

// Any capability by id, for the growing set of one-off authorities that are not
// per-gate, per-phase or per-column — Round 4 question 28's two Claims Library
// approvals are the first. Same REAL-roles rule as everything else here.
export function hasCapability(
  grants: Record<string, string[]>,
  roleKeys: string[],
  capabilityId: string,
): boolean {
  return roleKeys.some((key) => has(grants, key, capabilityId));
}

// Signing a `signature` column on a register row (2026-08-26). The capability
// is declared per column (`RegisterColumn.signCapability`), so this takes the id
// rather than hard-coding one — a second signature column must not need a second
// helper here. REAL signed-in roles, not the "View as" simulator: a signature is
// a real act on real data, exactly like archiving a project.
export function canSignRegisterColumn(
  grants: Record<string, string[]>,
  roleKeys: string[],
  capabilityId: string | undefined,
): boolean {
  if (!capabilityId) return false;
  return roleKeys.some((key) => has(grants, key, capabilityId));
}
