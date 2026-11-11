// Round 5 question 9 (SME answer, 2026-11-05): a gap carried when a gate proceeds is carried by a TRACKED Next Action, and the
// action "holds a unique ID, source gap/finding/requirement link, description and completion criteria, accountable owner, due
// date, priority, escalation trigger, status, evidence and closure/verification details". "A due date buried in free text is
// insufficient." The gap shows the linked action's owner and date instead of keeping competing copies.
//
// What makes an action CONTROLLED, as read here: it has a description, completion criteria, an accountable owner, a due date,
// a priority and an escalation trigger, and it has not been cancelled. The source link is the gap's own link to the action (and
// the action's gate), and the evidence and verification are recorded as the action is closed, so neither is needed for the
// action to exist. [ASSUMPTION: R6-Q15]
import type { NextAction } from '../types';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The fields a controlled action is still missing, in the words a person can act on. Empty = nothing missing.
export function controlledActionGaps(action: NextAction | undefined): string[] {
  if (!action) return ['a tracked Next Action'];
  const gaps: string[] = [];
  if (text(action.description) === '') gaps.push('a description');
  if (text(action.completionCriteria) === '') gaps.push('completion criteria');
  if (text(action.owner) === '') gaps.push('an accountable owner');
  if (text(action.dueDate) === '') gaps.push('a due date');
  if (text(action.escalationTrigger) === '') gaps.push('an escalation trigger');
  return gaps;
}

// A cancelled action is not a control: it tracks nothing (same reading as the watch-list's linked action).
export function isLiveControlledAction(action: NextAction | undefined): boolean {
  return !!action && action.status !== 'Cancelled' && controlledActionGaps(action).length === 0;
}
