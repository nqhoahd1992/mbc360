// Rule D3 (SME Round 3): what a flagged watch-list result must carry at Gate 4,
// and how each reviewer verdict affects the gate decision. Their four rules,
// verbatim:
//
//   Critical: hard-blocks Proceed and Proceed with Conditions.
//   Further information required: blocks Proceed; may allow Proceed with
//     Conditions only with authorised acceptance and a linked controlled action.
//   Non-critical: blocks plain Proceed until the assessment, rationale and action
//     are recorded; may permit Proceed with Conditions.
//   Not a true match: may be closed after reviewer rationale and evidence are
//     recorded.
//
// Before this (2026-08-12) none of it existed. A row at "REVIEW - possible formula
// match" passed Gate 4 on a plain Proceed with nobody having looked at it; the
// same value only blocked at Gate 7, by which point the formula was locked at
// Gate 5. We reported that gap to the team ourselves in Round 3 D3.
import type { NextAction, ProjectData, RegisterRow } from '../types';
import {
  WATCHLIST_ASSESSMENT_CRITICAL,
  WATCHLIST_ASSESSMENT_MORE_INFO,
  WATCHLIST_ASSESSMENT_NON_CRITICAL,
  WATCHLIST_ASSESSMENT_NOT_A_MATCH,
  WATCHLIST_FLAGGED_STATUSES,
} from '../config/registers';

export const WATCHLIST_REGISTER = 'prohibitedIngredients';
// Round 4 question 32(e) (2026-08-24): "The Pregnancy/Breastfeeding Caution list
// uses the same reviewer-trail fields for flagged findings." We raised this
// ourselves — D3 said "each flagged watch-list result" while its heading named only
// the formula match — and the answer is yes, both registers.
//
// Both carry the same column keys, so every function below serves both without a
// branch. That is why the columns were added to `pbCautionLimits` with identical
// keys rather than parallel names.
export const PB_CAUTION_REGISTER = 'pbCautionLimits';
export const WATCHLIST_REGISTERS: readonly string[] = [WATCHLIST_REGISTER, PB_CAUTION_REGISTER];

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function isFlaggedWatchlistRow(row: RegisterRow): boolean {
  return WATCHLIST_FLAGGED_STATUSES.includes(text(row.productStatus));
}

// Flagged rows across BOTH watch-lists. Note the two registers use different
// `productStatus` vocabularies — the prohibited list has "REVIEW - possible formula
// match", the caution list has "Exceeds limit - reformulate" — and only the three
// values in WATCHLIST_FLAGGED_STATUSES count as flagged on either. That is
// deliberate: `Prohibited - remove` and `Exceeds limit - reformulate` are direct
// hard blocks handled by their own readiness items, not findings awaiting a verdict.
export function flaggedWatchlistRows(project: ProjectData, gateId?: string): RegisterRow[] {
  return WATCHLIST_REGISTERS.flatMap((key) =>
    watchlistRowsInScope(project.registers[key] ?? [], gateId).filter(isFlaggedWatchlistRow),
  );
}

// Which gate each watch-list row belongs to is the workbook's own "Linked gate" column ("04_Ingredient_Screening",
// "06_Packaging_Artwork", "07_Maternal_Baby_Safety"). A row is in scope from the gate it is linked to onwards (project owner,
// 2026-10-14): an issue found at an earlier gate must still be closed by a later one, so the scope is "this gate or later",
// not "exactly this gate". A row whose Linked gate cannot be read is in scope everywhere. With no gate given every row is in
// scope. This narrows the answer's "every row" at Gate 4 [ASSUMPTION: R5-Q68].
export function watchlistLinkedGate(row: RegisterRow): number | undefined {
  const m = /^(\d{1,2})[_\s-]/.exec(text(row.linkedGate));
  return m ? Number(m[1]) : undefined;
}
export function watchlistRowInScope(row: RegisterRow, gateId?: string): boolean {
  if (!gateId) return true;
  const gate = Number(/(\d+)/.exec(gateId)?.[1]);
  const linked = watchlistLinkedGate(row);
  return linked === undefined || !Number.isFinite(gate) || gate >= linked;
}
export function watchlistRowsInScope(rows: RegisterRow[], gateId?: string): RegisterRow[] {
  return gateId ? rows.filter((r) => watchlistRowInScope(r, gateId)) : rows;
}

// Which authority a flagged row needs from the person who ASSESSES it as one that may be carried under Proceed with
// Conditions (SW-32, project owner, 2026-10-14). Round 4 question 32(c) says "the gate approver has the required Safety or
// Regulatory authority"; the project owner moved that authority from the approver to the qualified reviewer who records the
// assessment, so the gate is signed as usual — the readiness list already checks the finding. [ASSUMPTION: R5-Q67]
// Which authority is required is decided as follows:
//   - a status that NAMES a function decides it: Needs Safety Review -> Safety, Needs Regulatory Review -> Regulatory;
//   - otherwise (a "possible formula match" — a status a PERSON chose after the Formula BOM screen showed a match, and
//     which names no function) the row's own Owner column decides: it names Safety and/or
//     Regulatory;
//   - a row whose Owner names both, or neither, is satisfied by either authority.
// The returned list is what ANY ONE of will satisfy.
export type WatchlistAuthority = 'safety' | 'regulatory';
export function watchlistRequiredAuthority(row: RegisterRow): WatchlistAuthority[] {
  const status = text(row.productStatus);
  if (status === 'Needs Safety Review') return ['safety'];
  if (status === 'Needs Regulatory Review') return ['regulatory'];
  const owner = text(row.owner).toLowerCase();
  const safety = owner.includes('safety');
  const regulatory = owner.includes('regulatory');
  if (safety && !regulatory) return ['safety'];
  if (regulatory && !safety) return ['regulatory'];
  return ['safety', 'regulatory'];
}

// The rows whose assessment was just set (or changed) to a verdict that lets a finding be carried under Proceed with
// Conditions — the act that needs the authority above. Rows are matched by their group name, which is unique on both
// fixed watch-lists. The same test runs on the server at save and in the drawer, so they cannot disagree.
export function newlyCarriedVerdictRows(committed: RegisterRow[], next: RegisterRow[]): RegisterRow[] {
  const carried = (r: RegisterRow | undefined) => {
    const v = text(r?.reviewerAssessment);
    return v === WATCHLIST_ASSESSMENT_NON_CRITICAL || v === WATCHLIST_ASSESSMENT_MORE_INFO;
  };
  return next.filter((row) => {
    if (!carried(row)) return false;
    const old = committed.find((c) => text(c.ingredientGroup) === text(row.ingredientGroup));
    return text(old?.reviewerAssessment) !== text(row.reviewerAssessment);
  });
}

// The flagged rows whose Reviewer was just set or changed: the person named must hold the authority the finding needs.
export function newlyNamedReviewerRows(committed: RegisterRow[], next: RegisterRow[]): RegisterRow[] {
  return next.filter((row) => {
    if (text(row.reviewer) === '' || !isFlaggedWatchlistRow(row)) return false;
    const old = committed.find((c) => text(c.ingredientGroup) === text(row.ingredientGroup));
    return text(old?.reviewer) !== text(row.reviewer);
  });
}

export const WATCHLIST_AUTHORITY_LABEL: Record<WatchlistAuthority, string> = { safety: 'Safety', regulatory: 'Regulatory' };

export function watchlistLabel(row: RegisterRow): string {
  return text(row.ingredientGroup) || '(unnamed row)';
}

// "A genuine controlled Next Action must be used. A note alone is not
// sufficient." So the linked id has to resolve to a real record — an id typed
// into a box proves nothing, which is the whole point of that sentence.
export function linkedNextAction(project: ProjectData, row: RegisterRow): NextAction | undefined {
  const id = text(row.linkedNextActionId);
  return id ? project.nextActions.find((a) => a.id === id) : undefined;
}

// A Cancelled action does not count as the controlled action D3 requires
// (2026-08-12, found while answering "where does the link point?"). The first cut
// only checked that the id resolved, so a Non-critical finding could rest on an
// action somebody had since abandoned — tracking nothing, which is precisely what
// "a note alone is not sufficient" is guarding against.
//
// `Closed` DOES count: a completed and verified action means the finding was dealt
// with, which is better than an open one, not worse. Only `Cancelled` is the
// abandonment case, so it is named rather than reusing
// NEXT_ACTION_TERMINAL_STATUSES, which lumps the two together for a different
// purpose (whether an action still blocks a gate).
export function isControlledAction(action: NextAction | undefined): boolean {
  return !!action && action.status !== 'Cancelled';
}

// The reviewer trail every flagged row needs, whatever the verdict: who, when,
// why. D3 lists Reviewer, Review date and Rationale for every flagged result, not
// only for some verdicts.
function trailGaps(row: RegisterRow): string[] {
  return [
    ['Reviewer assessment', row.reviewerAssessment],
    ['Reviewer', row.reviewer],
    ['Review date', row.reviewDate],
    ['Rationale', row.reviewRationale],
  ]
    .filter(([, value]) => text(value) === '')
    .map(([label]) => label as string);
}

function hasReviewTrail(row: RegisterRow): boolean {
  return trailGaps(row).length === 0;
}

// What each verdict additionally requires before it counts as recorded.
//   Non-critical / Further information required — a linked controlled action,
//     named in D3 for both.
//   Not a true match — "reviewer rationale and evidence", so the evidence link.
//   Critical — nothing further; it blocks regardless, so demanding paperwork
//     before the block would only delay the block.
function verdictGap(project: ProjectData, row: RegisterRow): string | undefined {
  const verdict = text(row.reviewerAssessment);
  if (verdict === WATCHLIST_ASSESSMENT_NON_CRITICAL || verdict === WATCHLIST_ASSESSMENT_MORE_INFO) {
    return isControlledAction(linkedNextAction(project, row)) ? undefined : 'Linked Next Action';
  }
  if (verdict === WATCHLIST_ASSESSMENT_NOT_A_MATCH) return text(row.evidenceLink) !== '' ? undefined : 'Evidence link';
  return undefined;
}

function verdictDocumented(project: ProjectData, row: RegisterRow): boolean {
  return verdictGap(project, row) === undefined;
}

// The field labels a flagged row is still missing, for the UI to name — built
// from the SAME two predicates the blockers below use, so the list on screen and
// the reason a gate is blocked cannot disagree. Empty for a row that is not
// flagged, since D3's trail applies only to flagged results.
export function watchlistReviewGaps(project: ProjectData, row: RegisterRow): string[] {
  if (!isFlaggedWatchlistRow(row)) return [];
  const gap = verdictGap(project, row);
  return gap ? [...trailGaps(row), gap] : trailGaps(row);
}

// Rows that block even Proceed with Conditions: a Critical verdict, and a flagged
// row nobody has assessed.
//
// The second half is a reading, not D3's words: D3 says what each VERDICT does but
// not what an unassessed row does. Treating "no verdict yet" as PwC-clearable
// would make the whole mechanism optional — pick Proceed with Conditions and no
// assessment is ever needed — which cannot be the intent of a rule whose own
// sentences all begin "blocks Proceed until…". CONFIRMED by Round 4 question
// 32(d), 2026-08-24: "An unassessed flagged row must block both Proceed and
// Proceed with Conditions."
export function watchlistHardBlockers(project: ProjectData, gateId?: string): RegisterRow[] {
  return flaggedWatchlistRows(project, gateId).filter(
    (row) =>
      text(row.reviewerAssessment) === WATCHLIST_ASSESSMENT_CRITICAL ||
      !hasReviewTrail(row) ||
      !verdictDocumented(project, row),
  );
}

// Rows that block a plain Proceed but are allowed to stay open under Proceed with
// Conditions — D3's Non-critical and Further information required, once each is
// properly recorded. `Not a true match` is deliberately absent: D3 lets it be
// closed, so a documented one blocks nothing.
export function watchlistConditionalRows(project: ProjectData, gateId?: string): RegisterRow[] {
  return flaggedWatchlistRows(project, gateId).filter((row) => {
    const verdict = text(row.reviewerAssessment);
    if (verdict !== WATCHLIST_ASSESSMENT_NON_CRITICAL && verdict !== WATCHLIST_ASSESSMENT_MORE_INFO) return false;
    // An under-documented row is already in `watchlistHardBlockers`; listing it
    // here as well would show the same row as two separate blockers.
    return hasReviewTrail(row) && verdictDocumented(project, row);
  });
}

// Guard, not a readiness check: a linked Next Action id that resolves to nothing
// is broken data — the reference has to point at a real controlled action, which
// is exactly what D3's "a note alone is not sufficient" is guarding against.
export function brokenNextActionLinks(project: ProjectData, rows: RegisterRow[]): RegisterRow[] {
  return rows.filter((row) => text(row.linkedNextActionId) !== '' && !linkedNextAction(project, row));
}
