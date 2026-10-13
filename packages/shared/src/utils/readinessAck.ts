// Acknowledgement of auto-generated "not applicable" reasons (Round 4 question 16).
//
// The SME's rule: where the system works out from controlled data that a
// condition does not apply it may write the N/A reason itself, but "for safety-,
// regulatory-, claims- or release-critical items, the system-generated rationale
// must still be acknowledged by the responsible reviewer before gate closure".
// Two things the answer does not say are decided HERE, in one place, so that when
// the review team answers it is one edit rather than a hunt:
//
//   1. which items are critical, and
//   2. who the responsible reviewer of an item is.
//
// Both are our reading, put to the team as Round 5 question 1
// [ASSUMPTION: R5-Q6].
import type { ProjectData, ReadinessAcknowledgement } from '../types';
import { GATES } from '../config/gates';
import { CRITICAL_GATES } from '../config/gateSignOff';

// (1) Critical = the item sits on one of the seven gates Round 4 question 29(3)
// calls critical. A mechanical reading — nobody judged item by item. The draft
// of question 1 lists the 31 items that can carry a generated N/A and flags the
// ones where this rule and the item's own wording seem to disagree; the team's
// corrections go in this map as `itemId: true | false` and nowhere else.
export const CRITICAL_ITEM_OVERRIDES: Record<string, boolean> = {};

export function isCriticalForAcknowledgement(gateId: string, itemId: string): boolean {
  const override = CRITICAL_ITEM_OVERRIDES[itemId];
  return override ?? CRITICAL_GATES.includes(gateId);
}

// (2) The responsible reviewer is whoever the project's Lead nominated as
// "Reviewed by" on the sign-off of the PHASE the gate belongs to. Not the gate's
// own Reviewer lane: that lane is nominated lazily and per market, and the phase
// nomination is the one that exists from the day the project is created.
export interface ResponsibleReviewer {
  phase: number;
  userId?: string;
  name?: string;
}

export function responsibleReviewer(project: ProjectData, gateId: string): ResponsibleReviewer | undefined {
  const phase = GATES.find((g) => g.id === gateId)?.phase;
  if (!phase) return undefined;
  const row = project.phaseClosures?.[phase]?.signOffs.find((s) => s.role === 'Reviewed by');
  return { phase, userId: row?.assignedToUserId, name: row?.assignedToName };
}

// There is one row per (gate, item); it is edited in place, and its earlier values
// live in the audit trail.
export function currentAcknowledgement(
  project: ProjectData,
  gateId: string,
  itemId: string,
): ReadinessAcknowledgement | undefined {
  return (project.readinessAcknowledgements ?? []).find((a) => a.gateId === gateId && a.itemId === itemId);
}

// 'stale' = there is an assessment but of a rationale the engine no longer
// generates: the facts behind the N/A changed after it was given, so it counts
// for nothing and the reviewer must look again. 'rejected' = the reviewer looked
// and recorded that they do NOT acknowledge it; it blocks like a missing one but
// says why.
export type AcknowledgementState = 'acknowledged' | 'rejected' | 'stale' | 'missing';

export function acknowledgementState(
  project: ProjectData,
  gateId: string,
  itemId: string,
  rationale: string,
): { state: AcknowledgementState; ack?: ReadinessAcknowledgement } {
  const ack = currentAcknowledgement(project, gateId, itemId);
  if (!ack) return { state: 'missing' };
  if (ack.rationale !== rationale) return { state: 'stale', ack };
  return { state: ack.outcome === 'Not acknowledged' ? 'rejected' : 'acknowledged', ack };
}
