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
import type { GateDecision, GateRecord } from '../types';

// Why a decision is refused on a gap, in the words the user needs to act on. `null`
// means the decision is allowed.
export interface GapVerdict {
  reason: string;
  // What the user can do instead. Question 3 says a Critical gap "must result in
  // Hold, Backtrack or Reject/Stop"; only the first two exist as decisions in this
  // app, and the workbook's own dropdown is the authority on that list, so we do
  // not invent a third [ASSUMPTION: R5-Q13].
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
// ⚠️ Condition 3 is enforced by HALF. It says "a controlled action **and due date**
// are recorded", and a gap has nowhere to put a due date: question 3's own field
// list is the eight fields on `GateRecord`, and none of them is a date for the
// action. Nor is "controlled" settled — question 33(c), the same round, defines a
// controlled action as a linked Next Action and says free text "must not replace
// the controlled action record", while question 3 lists Required action and Action
// owner as plain fields, which reads like the self-contained version. The two
// readings need different data (a ninth column, or a Next Action picker like the
// one on safety findings), so this does not guess — it enforces what exists and
// says on screen what it does not [ASSUMPTION: R5-Q16].
const HIGH_GAP_CONTROLS: { field: keyof GateRecord; label: string }[] = [
  { field: 'gapRequiredAction', label: 'a required action' },
  { field: 'gapActionOwner', label: 'an action owner' },
  { field: 'gapAssessor', label: 'the assessor who accepted the risk' },
];

function missingHighGapControls(gate: GateRecord): string[] {
  return HIGH_GAP_CONTROLS.filter(({ field }) => text(gate[field]) === '').map(({ label }) => label);
}

// Is `decision` allowed on this gate, given its gap assessment? Returns null when
// there is nothing to refuse — no gap, or a gap whose grade permits the decision.
//
// Called from BOTH the API guard and the Gate Flow table, so the two cannot drift:
// the server is the authority (BACKEND_PLAN §3 principle 7) and the UI uses this
// only to avoid offering a decision the server would reject.
export function gapBlocksDecision(gate: GateRecord, decision: GateDecision): GapVerdict | null {
  if (gate.status !== 'Gap') return null;
  if (decision !== 'Proceed' && decision !== 'Proceed with Conditions') return null;

  const criticality = text(gate.gapCriticality);

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
    const missing = missingHighGapControls(gate);
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

  // Medium and Low keep the pre-existing B1 treatment: a Gap blocks a plain
  // Proceed, and Proceed with Conditions carries it. Question 3 grades the top two
  // levels and says nothing about the lower two, so nothing here changes for them.
  if (decision === 'Proceed') {
    return {
      reason: `the stage status is Gap (assessed ${criticality})`,
      allowed: ['Proceed with Conditions', 'Hold', 'Backtrack'],
    };
  }
  return null;
}
