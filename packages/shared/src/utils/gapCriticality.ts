// Round 4 question 3 (2026-08-24) — and with it Round-2 A1, the general definition
// of "critical" that had been open since 21 July.
//
// Before this, a `Gap` status blocked a plain Proceed and allowed Proceed with
// Conditions, full stop. How serious the gap was existed only in whoever's head
// picked the decision. Question 3: "A gap must carry its own formal criticality
// assessment… assessed by a suitably qualified reviewer, not decided informally
// during the gate-decision step."
//
// This is also the missing half of confirmed rule F7, whose "critical gap → Hold /
// Backtrack / Reject" branch has been unenforceable since it was confirmed,
// because nothing recorded whether a gap was critical.
import type { GateDecision, GateRecord, NextAction } from '../types';
import { controlledActionGaps } from './controlledActions';

// Why a decision is refused on a gap, in the words the user needs to act on. `null`
// means the decision is allowed.
export interface GapVerdict {
  reason: string;
  // What the user can do instead. Question 3 says a Critical gap "must result in
  // Hold, Backtrack or Reject/Stop"; the first two are gate decisions. Reject/Stop
  // is the project's own final state (SW-31, `utils/projectStop.ts`), not a dropdown value —
  // the workbook owns that list.
  allowed: GateDecision[];
  // Fields that, once recorded, make the REFUSED decision valid — i.e. the remedy
  // is data entry, not a different decision.
  //
  // This exists because the first version conflated the two. A High gap with no
  // action recorded returned `allowed: ['Hold', 'Backtrack']`, which the Gate Flow
  // table rendered as *Record "Hold" or "Backtrack" instead* — telling the user to
  // abandon Proceed with Conditions when question 3 says a High gap may be carried
  // that way, just not until the controls are recorded. The block was right and the
  // instruction was wrong, which is worse than a bare refusal: it sends someone to
  // Hold a gate that did not need holding.
  missing?: string[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// SW-39. A gap whose assessment is kept and that has been RESOLVED no longer blocks: the assessment stays on the record (it is an event of the
// project) and the Resolve act adds who resolved it and when. It counts only while the stage status is not Gap - a gate that goes back to Gap
// drops the resolution (the server clears it and the history says so), and the assessment blocks again.
export function isGapResolved(gate: GateRecord): boolean {
  return text(gate.gapResolvedAt) !== '' && gate.status !== 'Gap';
}

// What still stands between a graded gap and the Resolve button. Empty = Resolve may be clicked. The resolution says HOW it was resolved
// and the evidence link is its proof; the assessor is the qualified person who graded it; the status must have left Gap.
export function gapResolveMissing(gate: GateRecord): string[] {
  const missing: string[] = [];
  if (text(gate.gapCriticality) === '') missing.push('a criticality assessment');
  if (text(gate.gapAssessor) === '') missing.push('the assessor');
  if (text(gate.gapResolution) === '') missing.push('how the gap was resolved');
  if (text(gate.gapEvidenceLink) === '') missing.push('the evidence link');
  if (gate.status === 'Gap') missing.push('a Stage status other than Gap');
  if (isGapResolved(gate)) missing.push('(already resolved)');
  return missing;
}

// Question 3's second rule: "A High gap may be carried conditionally only where —
// no mandatory safety, regulatory or release rule is breached; the relevant
// authorised function accepts the risk; a controlled action and due date are
// recorded."
//
// Only the third condition is checkable HERE. The first is what the rest of
// `gateBlockers()` already evaluates — a breached mandatory rule is a blocker in
// its own right, so re-testing it here would duplicate it. The second is a
// permission question that needs the per-gate sign-off (Round 4 question 29) to
// exist before it can mean anything; until then the assessor's name standing
// against the assessment is the nearest record of who accepted the risk.
//
// Condition 3 — "a controlled action and due date are recorded" — settled by Round 5 question 9: EVERY gap that is carried
// (High, Medium and Low) points at a tracked Next Action on this gate that is complete (description, completion criteria,
// accountable owner, due date, escalation trigger) and not cancelled; the gap shows the action's owner and date rather than
// keeping its own. The assessor named on the assessment stands as the qualified acceptance of the residual risk, as before
// [ASSUMPTION: R5-Q16] for who accepts, [ASSUMPTION: R6-Q15] for the reading of "controlled".
function missingGapControls(gate: GateRecord, nextActions: NextAction[]): string[] {
  const missing: string[] = [];
  if (text(gate.gapAssessor) === '') missing.push('the assessor who accepted the risk');
  const id = text(gate.gapLinkedNextActionId);
  const action = id ? nextActions.find((a) => a.id === id) : undefined;
  if (!action) {
    missing.push('a linked tracked Next Action');
  } else if (action.gateId !== gate.gateId) {
    missing.push(`a linked Next Action raised on ${gate.gateId} (the linked one belongs to ${action.gateId})`);
  } else if (action.status === 'Cancelled') {
    missing.push('a linked Next Action that is not cancelled');
  } else {
    const gaps = controlledActionGaps(action);
    if (gaps.length > 0) missing.push(`the linked Next Action to have ${gaps.join(', ')}`);
  }
  return missing;
}

// Is `decision` allowed on this gate, given its gap assessment? Returns null when
// there is nothing to refuse — no gap, or a gap whose grade permits the decision.
//
// Called from BOTH the API guard and the Gate Flow table, so the two cannot drift:
// the server is the authority (BACKEND_PLAN §3 principle 7) and the UI uses this
// only to avoid offering a decision the server would reject.
export function gapBlocksDecision(gate: GateRecord, decision: GateDecision, nextActions: NextAction[]): GapVerdict | null {
  if (decision !== 'Proceed' && decision !== 'Proceed with Conditions') return null;

  const criticality = text(gate.gapCriticality);

  // SW-39: a resolved gap's assessment is kept, but it no longer blocks.
  if (isGapResolved(gate)) return null;

  // A Critical or High grade stays in force when the status leaves Gap (SME rule
  // audit B14, 2026-10-04). Keying everything on `status === 'Gap'` let a save
  // that set the status to Complete and the decision to Proceed together skip
  // the assessment entirely — the gate-decision-step informality question 3
  // forbids. Closing such a gap is now an act on the gap record itself: clear the
  // grade (logged in the gate's change history) once it is resolved. That this is
  // how a gap gets closed is decided as SW-39: it becomes a Resolved state that keeps the assessment, not a clearing (not built yet). Medium and Low keep
  // their old status-bound treatment below.
  if (gate.status !== 'Gap') {
    // Round 5 question 9: a Low or Medium gap that was RESOLVED before signing records its resolution and the evidence; one still unresolved is carried by a
    // tracked Next Action instead. "It need not create an action solely to close it immediately." Either path satisfies the gate; neither blocks it.
    if (criticality === 'Low' || criticality === 'Medium') {
      const resolved = text(gate.gapResolution) !== '' && text(gate.gapEvidenceLink) !== '';
      if (resolved) return null;
      const stillNeeds = missingGapControls(gate, nextActions);
      if (stillNeeds.length === 0) {
        return decision === 'Proceed'
          ? { reason: `the gap (assessed ${criticality}) is carried by a tracked action rather than resolved`, allowed: ['Proceed with Conditions', 'Hold', 'Backtrack'] }
          : null;
      }
      return {
        reason: `a ${criticality} gap is recorded on this gate, so it must either be resolved or carried`,
        allowed: ['Hold', 'Backtrack'],
        missing: ['its resolution and the evidence of it (or, if it is not resolved, a tracked Next Action with the assessor)'],
      };
    }
    if (criticality !== 'Critical' && criticality !== 'High') return null;
    const stillRecorded = `a ${criticality} gap assessment is still recorded on this gate although the status is no longer Gap — clear the gap assessment once the gap is resolved`;
    if (criticality === 'Critical') return { reason: stillRecorded, allowed: ['Hold', 'Backtrack'] };
    if (decision === 'Proceed') {
      return { reason: stillRecorded, allowed: ['Proceed with Conditions', 'Hold', 'Backtrack'] };
    }
    const missing = missingGapControls(gate, nextActions);
    return missing.length > 0 ? { reason: stillRecorded, allowed: ['Hold', 'Backtrack'], missing } : null;
  }

  // NOTE (2026-11-12): everything below is reached only while the status is still Gap. A gate cannot be SIGNED with a passing decision in that
  // state (the sign-off needs Stage status Complete, and B1 needs it to pass), so for the sign-off path a gap is carried by keeping the assessment
  // and setting the status to Complete — the branch above. This branch still answers a direct decision check and the live Gate Flow guidance.

  // Not assessed. Deliberately refuses BOTH decisions, where the old behaviour let
  // Proceed with Conditions through: question 3 makes the grading a reviewer's act,
  // so "nobody has graded it" cannot be the state a gate passes in. This is the
  // same reading as question 7 — a missing assessment is not a benign one.
  if (criticality === '') {
    return {
      reason:
        'the stage status is Gap and nobody has assessed how critical it is. A qualified reviewer must record the criticality, impact category and rationale first',
      allowed: ['Hold', 'Backtrack'],
    };
  }

  // "A Critical gap cannot be carried under Proceed with Conditions. It must result
  // in Hold, Backtrack or Reject/Stop." Verbatim, and it closes F7's open branch.
  if (criticality === 'Critical') {
    return {
      reason: 'the gap is assessed as Critical, which cannot be carried under any Proceed decision',
      allowed: ['Hold', 'Backtrack'],
    };
  }

  if (criticality === 'High') {
    // A High gap never permits a plain Proceed — "may be carried CONDITIONALLY".
    if (decision === 'Proceed') {
      return {
        reason: 'the gap is assessed as High, which may only be carried under Proceed with Conditions',
        allowed: ['Proceed with Conditions', 'Hold', 'Backtrack'],
      };
    }
    const missing = missingGapControls(gate, nextActions);
    if (missing.length > 0) {
      return {
        reason: 'a High gap may be carried under Proceed with Conditions only once its controls are recorded',
        // Proceed with Conditions is deliberately NOT listed as an alternative: it
        // is the decision being refused, and offering it as the way out would read
        // as "pick this instead" when it is already picked.
        allowed: ['Hold', 'Backtrack'],
        missing,
      };
    }
    return null;
  }

  // Medium and Low: a Gap blocks a plain Proceed (B1). Question 3 grades only
  // the top two levels, but F7 — confirmed 2026-07-21 for EVERY gap — allows
  // Proceed with Conditions "only when … an authorised reviewer accepts the
  // temporary risk, and a controlled Next Action (owner, due date, escalation) is
  // created". That half was enforced for High alone (SME rule audit D,
  // 2026-10-04); it now applies at every grade, with the same tracked Next
  // Action as for High (Round 5 question 9) [ASSUMPTION: R6-Q15].
  if (decision === 'Proceed') {
    return {
      reason: `the stage status is Gap (assessed ${criticality})`,
      allowed: ['Proceed with Conditions', 'Hold', 'Backtrack'],
    };
  }
  const missing = missingGapControls(gate, nextActions);
  if (missing.length > 0) {
    return {
      reason: 'a gap may be carried under Proceed with Conditions only once its controls are recorded (F7)',
      allowed: ['Hold', 'Backtrack'],
      missing,
    };
  }
  return null;
}
