import type { NextAction } from '../types';

// Who may change or delete a Next Action's RECORD (project owner's rule,
// 2026-10-07): only the person who created it, the project's Lead or a System
// Administrator.
//
// "The record" is what the action IS: description, gate, owner, due date and
// priority — and the action's existence. Moving it through its workflow (Status
// and the dates/verifier that follow from it) is deliberately NOT covered: F8
// already decides that, and it is the assignee who reports progress and the
// raiser / gate owner / authorised reviewer who verifies and closes. Locking
// Status as well would make F8's own closure route impossible for anyone who did
// not happen to create the action. The server and the screen both call this one
// predicate so they cannot disagree.
export const NEXT_ACTION_RECORD_FIELDS = ['description', 'gateId', 'owner', 'dueDate', 'priority'] as const;

export interface NextActionActor {
  displayName?: string;
  isProjectLead: boolean;
  isAdmin: boolean;
}

// An action saved before attribution existed has no `raisedBy`, so nobody is its
// creator and only the Lead or an administrator may change it — it is never
// credited to whoever happens to open it next.
export function mayEditNextActionRecord(action: Pick<NextAction, 'raisedBy'>, actor: NextActionActor): boolean {
  if (actor.isAdmin || actor.isProjectLead) return true;
  const me = (actor.displayName ?? '').trim();
  return me !== '' && (action.raisedBy ?? '').trim() === me;
}

// Removing is stricter than editing (project owner, 2026-10-07): ONLY the person
// who raised the action may delete it — not the Lead, not an administrator. An
// action with no recorded raiser (saved before attribution existed) therefore
// cannot be deleted by anyone; it can still be Cancelled through its Status.
// F8 says who CLOSES an action, not who deletes one [ASSUMPTION: R5-Q58].
export function mayRemoveNextAction(action: Pick<NextAction, 'raisedBy'>, actor: Pick<NextActionActor, 'displayName'>): boolean {
  const me = (actor.displayName ?? '').trim();
  return me !== '' && (action.raisedBy ?? '').trim() === me;
}

const norm = (value: string | undefined) => (value ?? '').trim();

export function nextActionRecordChanged(before: NextAction, after: NextAction): boolean {
  return NEXT_ACTION_RECORD_FIELDS.some((field) => norm(before[field]) !== norm(after[field]));
}

export const NEXT_ACTION_REMOVE_LOCK_REASON =
  'Only the person who raised this action can remove it. If it is no longer needed, set its Status to Cancelled instead.';

export const NEXT_ACTION_RECORD_LOCK_REASON =
  'Only the person who created this action, the project Lead or a System Administrator can edit it. You can still update its Status.';
