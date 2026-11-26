// Round 5 question 25 (SME answer, 2026-11-05): "Do not force withdrawal of the approved existing version merely because a draft PIF update is opened.
// Keep the approved PIF/version and market launch decision intact; create a separate draft revision under CHG. The new formula/PIF version cannot
// release until approved. If new information undermines the current version's safety/compliance, Regulatory/Quality must suspend the affected current
// approval and record the reason. Version-specific approvals prevent a draft edit from either cancelling a valid approval or silently changing its basis."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q33]`): a draft revision is opened only against a PIF that is Approved; it is
// raised under a master Change Control record; one revision per market and formula version is in progress at a time; approving it is an act of the
// people who may change the market tracks, and what it approves is the revision, never the market's PIF status or launch approval, which it leaves as
// they are; suspending is Regulatory's or Quality's act and moves the launch approval to Blocked.
import type { MarketTrack, PifRevision, PifRevisionStatus, ProjectData } from '../types';

export const PIF_REVISION_OPEN_STATUSES: readonly PifRevisionStatus[] = ['Draft', 'Under Review'];

// Where a revision may go from where it stands.
export function pifRevisionNextStatuses(status: PifRevisionStatus): PifRevisionStatus[] {
  if (status === 'Draft') return ['Under Review', 'Withdrawn'];
  if (status === 'Under Review') return ['Approved', 'Draft', 'Withdrawn'];
  return [];
}

// The revision of this market and version that is still in progress, if any.
export function openPifRevision(project: Pick<ProjectData, 'pifRevisions'>, market: string, formulaVersion: string): PifRevision | undefined {
  return (project.pifRevisions ?? []).find((r) => r.market === market && r.formulaVersion === formulaVersion && PIF_REVISION_OPEN_STATUSES.includes(r.status));
}

// What stands in the way of opening a revision for this track, as a list; empty = it may be opened.
export function pifRevisionOpenProblems(project: ProjectData, track: MarketTrack | undefined, input: { changeId?: string; reason?: string }): string[] {
  const out: string[] = [];
  if (!track) return ['the market has no track for this formula version'];
  if (track.pifStatus !== 'Approved') out.push('the market has no approved PIF to revise — its PIF status is set directly until it is approved');
  if (openPifRevision(project, track.market, track.formulaVersion)) out.push('a revision of this PIF is already in progress — approve or withdraw it first');
  if ((input.changeId ?? '').trim() === '') out.push('the Change Control record it is raised under');
  if ((input.reason ?? '').trim() === '') out.push('the reason for the revision');
  return out;
}

// A launch approval that Regulatory or Quality suspended and nobody has given again.
export function isApprovalSuspended(track: Pick<MarketTrack, 'approvalSuspendedAt' | 'launchApproval'>): boolean {
  return !!track.approvalSuspendedAt && track.launchApproval !== 'Approved';
}
