import { GATES, phaseLabel } from '@mbc360/shared/config/gates';
import type { PermissionDef } from './permissions';

// The seven groups every screen shows capabilities in — the Roles editor and
// My Account read this one list, so "what a role may do" reads the same on
// both (2026-10-02). Moved out of RoleCapabilityEditor unchanged.

export interface CapGroup {
  key: string;
  title: string;
  hint?: string;
  caps: { id: string; label: string }[];
}

// Display labels for every capability that is not a gate or a phase. The DB
// description stays the record of where a capability came from; this is only
// what an administrator reads.
const CAP_LABELS: Record<string, { group: string; label: string }> = {
  'gate-signoff|represent-technical': { group: 'signoff', label: 'Technical' },
  'gate-signoff|represent-safety': { group: 'signoff', label: 'Safety / Scientific Review' },
  'gate-signoff|represent-quality': { group: 'signoff', label: 'Quality' },
  'gate-signoff|represent-regulatory': { group: 'signoff', label: 'Regulatory' },
  'claims-library|approve-technical': { group: 'claims', label: 'Approve Claims Library wording — Technical' },
  'claims-library|approve-regulatory': { group: 'claims', label: 'Approve Claims Library wording — Regulatory' },
  'claim-exemption|confirm': { group: 'claims', label: 'Confirm a “no product claim” exemption' },
  'watchlist-finding|accept-safety': { group: 'accept', label: 'Safety-escalated watch-list finding' },
  'watchlist-finding|accept-regulatory': { group: 'accept', label: 'Regulatory-escalated watch-list finding' },
  'change-impact|acknowledge': { group: 'accept', label: 'Open change control at Gate 11' },
  'reference:market-profile|edit': { group: 'reference', label: 'Edit market profiles' },
  'reference:rm-risk|edit': { group: 'reference', label: 'Edit the raw-material risk overlay' },
  'reference:claims-library|edit': { group: 'reference', label: 'Edit and propose Claims Library entries' },
  'formulation-change|approve-commercial': { group: 'commercial', label: 'Sign the commercial (NP) approval on a formulation change' },
  'market-track|approve': { group: 'commercial', label: 'Approve market PIF, regulatory, claims and launch statuses' },
  // Deleting a project is deliberately NOT a capability: it is an isAdmin()
  // check in the API, so it cannot be handed to another role from here.
  'project|archive': { group: 'commercial', label: 'Archive and restore a project' },
};

const GROUP_META: Omit<CapGroup, 'caps'>[] = [
  { key: 'gate', title: 'Gate decisions', hint: 'Record the decision that passes a gate' },
  { key: 'phase', title: 'Phase approvals', hint: 'Sign the “Approved by” row that closes a phase' },
  { key: 'signoff', title: 'Gate sign-off representation', hint: "Count as that function on a critical gate's sign-off" },
  { key: 'claims', title: 'Claims' },
  { key: 'accept', title: 'Accept under conditions', hint: 'Carry an open item under Proceed with Conditions' },
  { key: 'reference', title: 'Company reference data' },
  { key: 'commercial', title: 'Commercial & lifecycle' },
  // Catch-all: a capability added later without a label above still shows up
  // (and stays grantable) instead of vanishing from this screen.
  { key: 'other', title: 'Other' },
];

export function buildCapabilityGroups(defs: PermissionDef[]): CapGroup[] {
  const byGroup = new Map<string, CapGroup['caps']>();
  const push = (group: string, cap: CapGroup['caps'][number]) => byGroup.set(group, [...(byGroup.get(group) ?? []), cap]);
  for (const d of defs) {
    if (d.resource.startsWith('gate:')) {
      const g = GATES.find((x) => x.id === d.resource.slice('gate:'.length));
      push('gate', { id: d.id, label: g ? `Gate ${g.number} — ${g.name}` : d.resource });
    } else if (d.resource.startsWith('phase:')) {
      const n = Number(d.resource.slice('phase:'.length));
      push('phase', { id: d.id, label: phaseLabel(n) });
    } else {
      const known = CAP_LABELS[d.id];
      push(known?.group ?? 'other', { id: d.id, label: known?.label ?? d.description ?? d.id });
    }
  }
  // Labelled capabilities read in the order CAP_LABELS lists them (Technical
  // before Regulatory, as on a sign-off), not in the DB's alphabetical order.
  const order = Object.keys(CAP_LABELS);
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
  return GROUP_META.filter((g) => byGroup.has(g.key)).map((g) => ({
    ...g,
    caps: g.key === 'gate' || g.key === 'phase' ? byGroup.get(g.key)! : [...byGroup.get(g.key)!].sort((x, y) => rank(x.id) - rank(y.id)),
  }));
}

