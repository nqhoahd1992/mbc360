import type { NextAction } from '../types';
import { NEXT_ACTION_TERMINAL_STATUSES } from '../types';

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

// What a passed gate leaves open on a Next Action (software rule SW-19, decided by the
// project owner 2026-10-09; the reading of the SME's Q29(1) it rests on is
// [ASSUMPTION: R5-Q59]).
//
// A gate cannot pass with an open Critical action (hardGateBlockers, even under Proceed
// with Conditions), so every action still open on a passed gate is non-Critical and is a
// CONDITION its Approved signature accepted. Once the gate has passed:
//   - a Closed or Cancelled action is frozen entirely — it is a verified record;
//   - an action still open may only be PROGRESSED: its Status, Owner and Due date.
//     Everything else is frozen — description, gate and priority (up as well as down;
//     raising one to Critical would contradict the rule that let the gate pass).
// Adding an action and deleting one stay refused elsewhere (R5-Q57, B4).
// The server and the screen call this one function so they cannot disagree.
export interface NextActionFreeze {
  // Nothing about the action may change.
  all: boolean;
  // Open action: description, gate and priority are frozen (Status, Owner, Due date are not).
  rewrite: boolean;
}

export const NO_NEXT_ACTION_FREEZE: NextActionFreeze = { all: false, rewrite: false };

const isTerminal = (status: NextAction['status']): boolean =>
  (NEXT_ACTION_TERMINAL_STATUSES as readonly string[]).includes(status);

export function nextActionFreeze(committed: NextAction | undefined, gatePassed: boolean): NextActionFreeze {
  if (!committed || !gatePassed) return NO_NEXT_ACTION_FREEZE;
  return { all: isTerminal(committed.status), rewrite: true };
}

// `dateCompleted` and `verifiedBy` follow from Status (the server stamps the verifier), so
// they move with it on an open action and are not separately editable.
const FROZEN_WHEN_TERMINAL = [
  'description', 'gateId', 'owner', 'dueDate', 'priority', 'status', 'dateCompleted', 'verifiedBy',
] as const;
const FROZEN_WHEN_OPEN = ['description', 'gateId', 'priority'] as const;

// Why a proposed change to a committed action is refused after its gate passed, or
// undefined when it is allowed.
export function nextActionFreezeViolation(committed: NextAction, proposed: NextAction): string | undefined {
  const freeze = nextActionFreeze(committed, true);
  if (freeze.all) {
    const changed = FROZEN_WHEN_TERMINAL.filter((f) => norm(committed[f]) !== norm(proposed[f]));
    return changed.length > 0
      ? `"${committed.description}" is ${committed.status} on ${committed.gateId}, which has passed — a closed action is a verified record and cannot change (use Backtrack)`
      : undefined;
  }
  const changed = FROZEN_WHEN_OPEN.filter((f) => norm(committed[f]) !== norm(proposed[f]));
  if (changed.length > 0) {
    return `"${committed.description}" is a condition accepted when ${committed.gateId} passed — only its Status, Owner and Due date can change, not its ${changed.join(', ')} (use Backtrack)`;
  }
  return undefined;
}

export const NEXT_ACTION_FROZEN_REASON =
  'This gate has passed. A closed or cancelled action is frozen. A condition still open can only have its Status, Owner and Due date changed.';
