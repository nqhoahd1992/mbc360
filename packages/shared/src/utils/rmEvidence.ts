// Rule D4 (SME Round 3), the parts that decide whether a gate may pass.
//
// D4 gives Gate 4 two ways through: a raw material is either "adequately
// reviewed" or "formally accepted through a controlled conditional decision".
// Implementing only the first would drop half the rule — the same mistake as
// recording "a Change Control record has been opened" while quietly ignoring "or
// should be opened" (see CLAUDE.md). So both routes are represented, and they
// differ in severity: a reviewed material lets the gate pass outright, a
// conditionally accepted one only under Proceed with Conditions.
//
// "Adequately reviewed" is read as the `approvedForUse` tick, not as a count of
// filled evidence columns. D4's own next line — "It must not default to Approved
// for Use" — says that tick is what an unreviewed row must NOT have, so the tick
// is the review verdict. Computing adequacy from columns would also mean deciding
// which of the eight evidence columns are mandatory per material type, which
// nobody has said: "Micro / preservative info" and "Origin / vegan / natural
// proof" plainly do not apply to every raw material.
import type { RegisterRow } from '../types';
import { RM_EVIDENCE_CONDITIONAL, RM_EVIDENCE_NOT_USED } from '../config/registers';

export const RM_EVIDENCE_REGISTER = 'supplierRmEvidence';

const status = (row: RegisterRow): string => String(row.evidenceStatus ?? '').trim();

// Reviewed and usable — D4's "adequately reviewed".
export function isRmApproved(row: RegisterRow): boolean {
  return row.approvedForUse === true;
}

// Screened, and deliberately not part of this formula. Not a D4 concept; see the
// note on RM_EVIDENCE_NOT_USED for why the rule is unsatisfiable without it.
export function isRmNotUsed(row: RegisterRow): boolean {
  return status(row) === RM_EVIDENCE_NOT_USED;
}

// D4's "formally accepted through a controlled conditional decision".
export function isRmConditionallyAccepted(row: RegisterRow): boolean {
  return !isRmApproved(row) && status(row) === RM_EVIDENCE_CONDITIONAL;
}

// Someone has reached a conclusion about this material, whichever it is. A row
// that is still "Incomplete — evidence review required", or has no status at all,
// has not been dispositioned — and D4 calls exactly that an "unresolved
// identity-only stub".
export function isRmDispositioned(row: RegisterRow): boolean {
  return isRmApproved(row) || isRmNotUsed(row) || isRmConditionallyAccepted(row);
}

export function unresolvedRmRows(rows: RegisterRow[]): RegisterRow[] {
  return rows.filter((row) => !isRmDispositioned(row));
}

export function conditionallyAcceptedRmRows(rows: RegisterRow[]): RegisterRow[] {
  return rows.filter(isRmConditionallyAccepted);
}

// Guard, not a readiness check: a row cannot be approved for use while also
// saying its evidence review has not happened, or that the material is not used.
// Enforced in the UI (the two cells disable each other) and in the API, because
// "the UI disables it" is not enforcement.
export function rmEvidenceContradictions(rows: RegisterRow[]): RegisterRow[] {
  // Every one of the three statuses describes an UNapproved row — review not done,
  // accepted only conditionally, or not used at all — so none of them can stand
  // beside the approval tick. An approved row therefore carries no status.
  return rows.filter((row) => isRmApproved(row) && status(row) !== '');
}

export function rmCodeOf(row: RegisterRow): string {
  return String(row.rmCode ?? '').trim();
}
