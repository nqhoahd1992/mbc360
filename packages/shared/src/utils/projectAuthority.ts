// Who may decide a gate, backtrack, approve a phase or change market approvals on a project (SW-37, project owner 2026-10-15;
// plan: docs/plans/Permission_Model_Plan.md stage 5).
//
// Inside a project authority comes from the project's own ASSIGNMENT, not from a role grid (the grid keeps only project-level
// actions and the screens outside a project):
//   - the gate decision belongs to the gate's nominated "Approved by" signer (their signature IS the decision, Round 4 q29(5)),
//     to the project Lead and to an administrator;
//   - Backtrack belongs to the same people, judged on the gate being backtracked from;
//   - the phase "Approved by" row needs nothing beyond being the person the Lead nominated for it;
//   - market approvals (PIF, regulatory, claims, launch) belong to the project's Regulatory and Project Manager people, the Lead
//     and an administrator.
// One function per question, read by the server (which refuses) and the screens (which grey the control), so they cannot disagree.
import type { ProjectData } from '../types';

export interface ProjectActor {
  displayName: string;
  isAdmin: boolean;
}

const norm = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export function isProjectLead(project: ProjectData, actor: ProjectActor): boolean {
  return norm(project.identity.projectLead) !== '' && norm(project.identity.projectLead) === norm(actor.displayName);
}

// Names nominated as "Approved by" for this gate, on any market lane.
export function gateApproverNames(project: ProjectData, gateId: string): Set<string> {
  const names = new Set<string>();
  for (const row of project.gateSignOffs) {
    if (row.gateId === gateId && row.role === 'Approved by' && norm(row.assignedToName)) names.add(norm(row.assignedToName));
  }
  return names;
}

export function canDecideGate(project: ProjectData, gateId: string, actor: ProjectActor): boolean {
  if (actor.isAdmin || isProjectLead(project, actor)) return true;
  return gateApproverNames(project, gateId).has(norm(actor.displayName));
}

export function gateDecisionReason(gateId: string): string {
  return `Only the person nominated as "Approved by" for ${gateId}, the project Lead or an administrator records its decision or backtracks from it`;
}

// People who change a market's PIF, regulatory, claims and launch approvals: the project's Regulatory and Project Manager
// assignees (the review areas the registers of those approvals belong to), plus the Lead and administrators.
// [ASSUMPTION: R5-Q69]
export function canChangeMarketTracks(project: ProjectData, actor: ProjectActor): boolean {
  if (actor.isAdmin || isProjectLead(project, actor)) return true;
  const reviewers = project.identity.reviewers ?? {};
  return [reviewers['regulatory'], reviewers['project-manager']].some((name) => norm(name) !== '' && norm(name) === norm(actor.displayName));
}

export const MARKET_TRACKS_REASON =
  "Only the project's Regulatory and Project Manager people, the project Lead and administrators change market approvals";
