// Rule E1 (SME Round 3), Gate 7: "Please add a distinct safety-finding control
// rather than relying solely on the Final Safety Sign-off… Gate 7 cannot pass
// while any critical safety finding is open."
//
// Until 2026-08-12 `sg07-no-critical` shared `sg07-final-safety`'s check, so a
// green tick reading "no unresolved critical safety finding" only ever meant "the
// ten Final Safety Sign-off questions are Completed". E1 rejects exactly that
// reading, in its first sentence.
//
// Round 4 question 33 (2026-08-24) then replaced E1's binary with a GRADED rule.
// The old code asked one question — "is this row critical and open?" — and that
// turns out to be three different questions with three different answers.
import type { ProjectData, RegisterRow } from '../types';
import { NEXT_ACTION_TERMINAL_STATUSES, RISK_LEVELS_HARD_BLOCKING } from '../types';
import { RESOLUTION_CLOSED_STATES, SAFETY_FINDING_YES } from '../config/registers';
import { isControlledAction, linkedNextAction } from './watchlistReview';

export const SAFETY_FINDINGS_REGISTER = 'criticalSafetyFindings';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function safetyFindingRows(project: ProjectData): RegisterRow[] {
  return project.registers[SAFETY_FINDINGS_REGISTER] ?? [];
}

// Not closed. Derived from the terminal states rather than compared against
// 'Open', so the four intermediate states question 33(b) added (Under Review,
// Action Pending, Verification Pending) all count as open without having to be
// listed — and a state added later cannot silently read as closed. An empty
// status is open too: a finding with no status recorded is not a finished one.
const isOpen = (row: RegisterRow): boolean => !RESOLUTION_CLOSED_STATES.includes(text(row.findingStatus));

// Question 33(e): "Closing a High or Critical finding requires: Safety reviewer
// conclusion · Evidence link · Linked action completed · Verification · Verifier ·
// Closure date." THREE of the six are checkable — the two text columns, and the
// linked action, which became checkable when question 33(c) added the picker.
// Verification, verifier and closure date have no columns yet and are disclosed on
// the readiness item rather than quietly dropped.
//
// "Linked action completed" is read as: there is a controlled action and it has
// reached a terminal status. A cancelled action does not count, matching the
// correction already made for the watch-list trail — an abandoned action tracks
// nothing.
//
// Applied to `Superseded` as well as `Closed`, which is OUR reading: question
// 33(b) adds Superseded to the lifecycle without saying what closing evidence a
// superseded finding needs. The conservative direction was chosen — a High finding
// should not become passable just by being marked superseded, and if it really was
// replaced, saying so in the conclusion is a sentence, not a burden. But it is a
// blocking behaviour on a safety gate resting on an unstated rule
// [ASSUMPTION: R5-Q12].
function closedWithoutClosureRecord(project: ProjectData, row: RegisterRow): boolean {
  if (text(row.safetyReviewerConclusion) === '' || text(row.evidenceLink) === '') return true;
  const action = linkedNextAction(project, row);
  return !isControlledAction(action) || !NEXT_ACTION_TERMINAL_STATUSES.includes(action!.status);
}

// The severity a row carries, or '' when nobody has judged it yet. `criticalFinding`
// is E1's own Yes/No flag and `severity` is its scale; the flag stays authoritative
// for "is this critical", because a row can be flagged Yes before anyone grades it.
function severityOf(row: RegisterRow): string {
  const flag = text(row.criticalFinding);
  const severity = text(row.severity);
  if (flag === SAFETY_FINDING_YES && severity === '') return 'Critical';
  return severity;
}

// Question 33(c): "A controlled Next Action is required for Critical findings ·
// High findings · Medium findings requiring corrective activity. Free text may
// describe the action but must not replace the controlled action record."
//
// A cancelled action does not count — it tracks nothing, the same correction
// already made for the watch-list trail. Reuses `linkedNextAction` and
// `isControlledAction` rather than re-implementing them, so "what counts as a
// controlled action" has one definition across both registers.
//
// Where this bites is worth being precise about, because "required for Critical and
// High findings" on its own changes nothing: an OPEN Critical or High finding
// already blocks whether or not an action is linked. The requirement has teeth in
// two other places —
//
//   at CLOSURE, via question 33(e)'s "Linked action completed": a Critical or High
//     finding cannot be closed on a description alone (see closedWithoutClosureRecord);
//   at the MEDIUM band, where question 33 allows Proceed with Conditions only
//     "where formally accepted and controlled" — so an uncontrolled Medium finding
//     is not carryable, and sits in the hard-block list rather than the
//     conditional one.
//
// The answer qualifies Medium with "requiring corrective activity", and nothing
// records whether a given Medium finding needs one. Reading it as "if you want a
// decision to carry it, it needs an action" is narrower than demanding one of every
// Medium row, and matches "and controlled" exactly.
function missingControlledAction(project: ProjectData, row: RegisterRow): boolean {
  return !isControlledAction(linkedNextAction(project, row));
}

// Findings that stop Gate 7 outright, Proceed with Conditions included:
//
//   1. an OPEN Critical or High finding — question 33: "Open Critical and High
//      findings hard-block Gate 7". High blocking is new; E1 named only Critical;
//   2. a finding nobody has judged. Question 33(d) confirms it: "Unjudged finding
//      — must block Gate 7." Without this a finding can be parked with no verdict
//      and the gate closes over it, which is the opposite of a control;
//   3. a Critical or High finding recorded as closed without the closure record
//      question 33(e) requires;
//   4. a MEDIUM finding, open, with no controlled action — see below. It sits here
//      rather than in the conditional list because question 33 permits Proceed
//      with Conditions only "where formally accepted **and controlled**", so an
//      uncontrolled Medium is not something a decision can carry.
export function hardBlockingSafetyFindings(project: ProjectData): RegisterRow[] {
  return safetyFindingRows(project).filter((row) => {
    const severity = severityOf(row);
    if (severity === '') return true;
    if (severity === 'Medium') return isOpen(row) && missingControlledAction(project, row);
    if (!RISK_LEVELS_HARD_BLOCKING.includes(severity as never)) return false;
    return isOpen(row) || closedWithoutClosureRecord(project, row);
  });
}

// Findings that block a plain Proceed but may be carried under Proceed with
// Conditions — question 33: "A Medium finding may permit Proceed with Conditions
// where formally accepted **and controlled**."
//
// Both halves of that phrase are enforced, in different places. "Formally
// accepted" is the Proceed-with-Conditions decision itself, an audited act by
// someone permitted to decide the gate — the same mechanism D3 uses for a
// watch-list verdict and F9 for an open change control. "And controlled" is the
// linked action, which is why an UNcontrolled Medium finding is in the hard-block
// list above instead: a decision cannot carry what nothing is tracking.
export function conditionalSafetyFindings(project: ProjectData): RegisterRow[] {
  return safetyFindingRows(project).filter(
    (row) => severityOf(row) === 'Medium' && isOpen(row) && !missingControlledAction(project, row),
  );
}

// Question 33: "A Low finding may generate a warning or an action per the
// reviewer's conclusion", and — the sentence that matters more — "A finding
// assessed as non-critical must still be appropriately dispositioned; it should
// not disappear merely because it is not Critical." So a Low finding left open is
// surfaced rather than dropped, without blocking anything.
export function warningSafetyFindings(project: ProjectData): RegisterRow[] {
  return safetyFindingRows(project).filter((row) => severityOf(row) === 'Low' && isOpen(row));
}

export function safetyFindingLabel(row: RegisterRow): string {
  return text(row.findingDescription).slice(0, 60) || '(no description)';
}
