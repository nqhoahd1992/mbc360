// The authorised role matrix: for every role a project can name, who holds it on THIS project and what it is authorised to do
// (Round 5 question 37(b): "Record the authorised role matrix and named assignments"; project owner, 2026-11-06).
//
// Nothing here is a rule of its own. Every column is read from the place that enforces it — the review specs (who owns,
// co-reviews, co-signs a sheet), ACKNOWLEDGEMENT_FUNCTIONS (who acknowledges which generated "not applicable"), and the
// project-authority constants — so this page cannot say something the application does not do. It exists so that the review team
// can read the whole matrix in one place and confirm or correct it; what it shows is our reading until they do
// [ASSUMPTION: R6-Q2].
import type { ProjectData } from '../types';
import { getNavGroups, getRegisterConfig, type NavItem } from '../config/registers';
import { GATE_READINESS } from '../config/gateReadiness';
import { CRITICAL_GATES, INDEPENDENT_FUNCTION_BY_GATE } from '../config/gateSignOff';
import { REVIEW_ROLES, involvementIn, reviewRoleFieldLabel } from '../config/reviewers';
import { ACKNOWLEDGEMENT_FUNCTIONS } from './readinessAck';
import { MARKET_TRACK_ROLE_KEYS } from './projectAuthority';

export type RoleKind = 'area' | 'function' | 'specialist';

export interface RoleAcknowledgement {
  gateId: string;
  itemId: string;
  label: string; // the readiness item's own name
  // The other functions that must ALSO acknowledge the same reason ("both conclusions must be recorded").
  togetherWith: string[];
  // Other roles that may acknowledge it in this role's place ("Manufacturing / R&I": either).
  orInstead: string[];
}

export interface RoleMatrixRow {
  key: string;
  label: string;
  kind: RoleKind;
  parentLabel?: string; // the function a specialist sits inside
  requiredAtCreation: boolean;
  holder?: string; // the person on this project; undefined reads Unassigned
  sheetsOwned: number;
  sheetsCoReviewed: number;
  sheetsCoSigned: number;
  acknowledges: RoleAcknowledgement[];
  alsoAuthorised: string[]; // plain sentences for authority that is neither a sheet nor an acknowledgement
}

function labelOf(key: string): string {
  return REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
}

function itemLabel(gateId: string, itemId: string): string {
  return (GATE_READINESS[gateId] ?? []).find((r) => r.id === itemId)?.label ?? itemId;
}

function acknowledgementsOf(roleKey: string): RoleAcknowledgement[] {
  const out: RoleAcknowledgement[] = [];
  for (const [gateId, reqs] of Object.entries(GATE_READINESS)) {
    for (const req of reqs) {
      const slots = ACKNOWLEDGEMENT_FUNCTIONS[req.id];
      if (!slots) continue;
      const mine = slots.find((slot) => slot.includes(roleKey));
      if (!mine) continue;
      out.push({
        gateId,
        itemId: req.id,
        label: itemLabel(gateId, req.id),
        togetherWith: slots.filter((slot) => slot !== mine).map((slot) => slot.map(labelOf).join(' or ')),
        orInstead: mine.filter((k) => k !== roleKey).map(labelOf),
      });
    }
  }
  return out;
}

function sheetCounts(roleKey: string): { owned: number; coReviewed: number; coSigned: number } {
  let owned = 0;
  let coReviewed = 0;
  let coSigned = 0;
  for (const group of getNavGroups()) {
    for (const item of group.items as NavItem[]) {
      const config = item.registerKey ? getRegisterConfig(item.registerKey) : undefined;
      const spec = config?.reviewOwner ?? item.reviewOwner ?? group.reviewOwner;
      const involvement = involvementIn(spec, [roleKey]);
      if (involvement.includes('owner')) owned++;
      if (involvement.includes('co-review')) coReviewed++;
      if (involvement.includes('co-sign')) coSigned++;
    }
  }
  return { owned, coReviewed, coSigned };
}

export function roleMatrix(project: ProjectData): RoleMatrixRow[] {
  return REVIEW_ROLES.map((role) => {
    const counts = sheetCounts(role.key);
    const alsoAuthorised: string[] = [];
    if (MARKET_TRACK_ROLE_KEYS.includes(role.key)) {
      alsoAuthorised.push("Changes a market's PIF, regulatory, claims and launch approvals");
    }
    if (role.key === 'project-manager') {
      alsoAuthorised.push('Co-signs every review area (added automatically to every sheet)');
    }
    return {
      key: role.key,
      label: reviewRoleFieldLabel(role),
      kind: role.parent ? 'specialist' : role.optional ? 'function' : 'area',
      parentLabel: role.parent ? labelOf(role.parent) : undefined,
      requiredAtCreation: !role.optional,
      holder: project.identity.reviewers?.[role.key]?.trim() || undefined,
      sheetsOwned: counts.owned,
      sheetsCoReviewed: counts.coReviewed,
      sheetsCoSigned: counts.coSigned,
      acknowledges: acknowledgementsOf(role.key),
      alsoAuthorised,
    };
  });
}

// Authority that does NOT belong to a role: it follows the project's own assignment (SW-37) or the gate's nominated signers.
// Written as sentences because that is how the review team will read and confirm them. Each is enforced elsewhere; this list
// repeats no logic, and `verify:ack` checks it names the same things.
export const PROJECT_WIDE_AUTHORITY: { action: string; whoMay: string }[] = [
  { action: "Record a gate's decision, or backtrack from it", whoMay: 'The person nominated as "Approved by" for that gate, the project Lead, or an administrator' },
  { action: 'Approve a phase ("Approved by" row of the close-out)', whoMay: 'The person the project Lead nominated for that row' },
  { action: "Change a market's PIF, regulatory, claims and launch approvals", whoMay: 'The project\'s Regulatory and Project Manager people, the project Lead, or an administrator' },
  { action: 'Confirm that an old formula version is superseded in a market', whoMay: 'The project Lead, or an administrator' },
  { action: 'Nominate who signs a phase or a gate', whoMay: 'The project Lead, or an administrator' },
  { action: 'Assign or change who holds a function on the project', whoMay: 'The project Lead, or an administrator' },
  { action: 'Acknowledge a "not applicable" reason the system wrote', whoMay: 'The person holding the function named for that item (see the table above); never an administrator or the Lead on their own account' },
];

// On the critical gates one of the Reviewer or Approver must also represent an independent function. That function comes from a
// system role (Users & Roles), not from the per-project roles above, so it is listed separately.
export function independentFunctionsByGate(): { gateId: string; function: string }[] {
  return CRITICAL_GATES.map((gateId) => ({ gateId, function: INDEPENDENT_FUNCTION_BY_GATE[gateId]?.label ?? '—' }));
}
