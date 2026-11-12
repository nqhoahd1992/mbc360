// Round 5 question 11(2) (SME answer, 2026-11-05): "Any change to an already approved formula, market authorisation, released pack/claim or other
// controlled baseline requires CHG, even if the project has been sent back to Gate 5. Backtracking does not erase that controlled history."
//
// utils/formulaBaseline.ts covers the formula. This file covers the other three the answer names, by the same rule: once the thing has been approved,
// changing it needs an OPEN change record of this project whose impact area is the one concerned. What counts as the baseline in each case, and which
// edits count as a change to it, are our readings, [ASSUMPTION: R6-Q17]:
//   - a market authorisation: a market's PIF, regulatory, claims or launch approval that stood at Approved is being taken back from Approved;
//   - a released pack: a Released Label Control row whose "New label released to market?" is Y is being edited (apart from owner and notes);
//   - a released claim: a claim whose current revision has been approved is being moved to a new revision.
import type { ChangeRecord, MarketTrack, ProjectData, RegisterRow } from '../types';
import { CHANGE_IMPACT_LAUNCH, isChangeOpen } from '../config/changeTriggers';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : String(value ?? '').trim());

function openChangesFor(project: ProjectData, areas: readonly string[], market?: string): ChangeRecord[] {
  return project.changes.filter((c) => {
    if (c.projectId && c.projectId !== project.identity.id) return false;
    if (!isChangeOpen(c.status)) return false;
    if (!(c.impactAreas ?? []).some((a) => areas.includes(a))) return false;
    if (market && (c.markets ?? []).length > 0 && !(c.markets ?? []).includes(market)) return false;
    return true;
  });
}

const MARKET_APPROVAL_FIELDS = ['pifStatus', 'regulatoryStatus', 'claimsApproval', 'launchApproval'] as const;
const MARKET_AREAS = ['Regulatory', CHANGE_IMPACT_LAUNCH] as const;

// Why this market's approval may not be taken back right now, or undefined when it may.
export function marketAuthorisationRequirement(project: ProjectData, prev: MarketTrack, next: MarketTrack): string | undefined {
  const reverted = MARKET_APPROVAL_FIELDS.filter((f) => prev[f] === 'Approved' && next[f] !== 'Approved');
  if (reverted.length === 0) return undefined;
  if (openChangesFor(project, MARKET_AREAS, next.market).length > 0) return undefined;
  return `${next.market}: ${reverted.join(', ')} already stood at Approved, so the market authorisation is a controlled baseline — raise a change with the Regulatory (or Launch) impact area for this market and keep it open before taking an approval back`;
}

const LABEL_AREAS = ['Artwork', 'Packaging'] as const;
const LABEL_UNCONTROLLED_COLUMNS = ['owner', 'notes'];

export function isReleasedLabelRow(row: RegisterRow): boolean {
  return text(row.newLabelReleased) === 'Y';
}

// The released label rows a save edits (other than owner and notes) with no open Artwork or Packaging change to cover it.
export function releasedLabelEditsWithoutChange(project: ProjectData, before: readonly RegisterRow[], after: readonly RegisterRow[]): string[] {
  if (openChangesFor(project, LABEL_AREAS).length > 0) return [];
  const previous = new Map(before.filter((r) => text(r.recordId) !== '').map((r) => [text(r.recordId), r]));
  const out: string[] = [];
  for (const row of after) {
    const old = previous.get(text(row.recordId));
    if (!old || !isReleasedLabelRow(old)) continue;
    const keys = new Set([...Object.keys(old), ...Object.keys(row)]);
    const changed = [...keys].filter((k) => !LABEL_UNCONTROLLED_COLUMNS.includes(k) && text(old[k]) !== text(row[k]));
    if (changed.length > 0) out.push(`${text(row.recordId)} (${changed.join(', ')})`);
  }
  return out;
}

// Claims whose approved revision is moved to a new one in this save with no open Claims change to cover it. (An edit WITHOUT a new revision is
// already refused by the revision freeze, question 26 / 30(b).)
export function approvedClaimRevisionsWithoutChange(project: ProjectData, before: readonly RegisterRow[], after: readonly RegisterRow[]): string[] {
  if (openChangesFor(project, ['Claims']).length > 0) return [];
  const previous = new Map(before.filter((r) => text(r.claimId) !== '').map((r) => [text(r.claimId), r]));
  const out: string[] = [];
  for (const row of after) {
    const old = previous.get(text(row.claimId));
    if (!old) continue;
    const approved = text(old.revisionApprovedBy) !== '' && text(old.revisionApprovedDate) !== '';
    if (approved && text(row.revision) !== text(old.revision)) out.push(text(row.claimId));
  }
  return out;
}
