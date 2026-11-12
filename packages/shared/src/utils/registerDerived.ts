import type { ProjectData, RegisterRow } from '../types';
import { RULEBOOK_CATEGORY, applyRulebookChanges } from './changeRulebooks';
import { FORMULATION_CHANGE_VIEW, applyChangeView } from './changeViews';
import { WATCH_LIST_VERSION, matchIngredientWatchLists, watchlistMatchLines } from './ingredientWatch';

// Columns and blocks the workbook computes with formulas, computed here the same way. Applied on the server when a register is
// saved (so a request cannot set a computed cell) and when it is shown (so the screen is never stale).

const text = (v: unknown) => String(v ?? '').trim();

// --- Formulation Change Register -------------------------------------------------------------------------------------------
// The workbook's "Overall status" (S) formula, with its NP wording written as the app's Final Approver. NP's sign-off (T) is the
// signature on the row; the approval cell (E) follows it.
export const FORMULA_CHANGE_STATUSES = {
  awaitingDecision: 'Awaiting Final Approver decision',
  rejected: 'Rejected - no change',
  onHold: 'On hold',
  awaitingSignOff: 'Awaiting Final Approver sign-off',
  closed: 'Closed',
  commsPending: 'Approved - market comms pending',
  vnPending: 'Approved - VN re-registration pending',
  approvedOpen: 'Approved - open',
} as const;

export function formulaChangeStatus(row: RegisterRow): string {
  if (text(row.changeId) === '' && text(row.changeTitle) === '') return '';
  const approval = text(row.approvedByNp);
  if (approval === '' || approval === 'Pending Final Approver decision') return FORMULA_CHANGE_STATUSES.awaitingDecision;
  if (approval === 'Rejected') return FORMULA_CHANGE_STATUSES.rejected;
  if (approval === 'On hold') return FORMULA_CHANGE_STATUSES.onHold;
  if (approval !== 'Approved') return FORMULA_CHANGE_STATUSES.awaitingDecision;
  if (text(row.npSignOff) === '') return FORMULA_CHANGE_STATUSES.awaitingSignOff;
  if (text(row.closed) === 'Yes') return FORMULA_CHANGE_STATUSES.closed;
  if (text(row.marketCommRequired) === 'Yes' && text(row.communicatedToMarket) !== 'Yes') return FORMULA_CHANGE_STATUSES.commsPending;
  if (text(row.vnRegistrationRequired) === 'Yes') return FORMULA_CHANGE_STATUSES.vnPending;
  return FORMULA_CHANGE_STATUSES.approvedOpen;
}

// --- Prohibited Ingredient Watch-list ----------------------------------------------------------------------------------------
// The workbook's G: how many Formula BOM lines the row's ingredient group matches (by CAS first, then name — the same matcher the
// BOM screen uses, which is better than the sheet's plain text search of the BOM).
export function formulaMatchCount(project: ProjectData, ingredientGroup: string, kind: 'prohibited' | 'pbCaution' = 'prohibited'): number {
  return project.bom.filter((l) =>
    matchIngredientWatchLists(l.inciName ?? '', l.casNo).some((h) => h.kind === kind && h.group === ingredientGroup),
  ).length;
}

// The two watch-lists: which matcher list each reads and the status a row ships with while nothing matches.
export const WATCHLIST_KINDS: Record<string, { kind: 'prohibited' | 'pbCaution'; noMatch: string }> = {
  prohibitedIngredients: { kind: 'prohibited', noMatch: 'No formula match recorded' },
  pbCautionLimits: { kind: 'pbCaution', noMatch: 'Not assessed' },
};

// The columns of the two watch-lists the server writes: a person never types them, so a closing signature does not lock them and a
// save that carries a stale copy of them is not a change.
export const WATCHLIST_DERIVED_COLUMNS: ReadonlySet<string> = new Set(['formulaMatchCount', 'matchBasis', 'matchedAgainst', 'reassessmentNeeded', 'basisAtReview']);

// What the match looked like when the reviewer recorded their conclusion, kept so a later change of basis can be seen. 'none' stands for
// "no match then", because an empty value means "no conclusion recorded yet".
export const WATCHLIST_BASIS_NONE = 'none';
export const watchlistBasisKey = (lines: readonly string[]): string => (lines.length === 0 ? WATCHLIST_BASIS_NONE : lines.join('\n'));

// Round 5 question 4(a), "Retain the matching result separately from the reviewer's disposition, with formula/list version and match basis.
// A changed formula must mark a prior conclusion for reassessment where its basis changes, even if a person previously selected a status."
// A conclusion is stale when a basis was recorded with it (basisAtReview, written by the server whenever the review date or the classification
// is recorded) and the basis now differs. The person's own status and classification are never overwritten: the row is only marked.
// [ASSUMPTION: R6-Q10]
export function watchlistConclusionStale(project: ProjectData, registerKey: string, row: RegisterRow): boolean {
  const def = WATCHLIST_KINDS[registerKey];
  const recorded = text(row.basisAtReview);
  if (!def || recorded === '') return false;
  return recorded !== watchlistBasisKey(watchlistMatchLines(project, def.kind, text(row.ingredientGroup)));
}

// Written by the server when a reviewer's conclusion is recorded: take a snapshot of the match basis when the classification is first given or
// the review date or the classification changes; otherwise carry the stored one. The client's own value is always discarded. A row with no
// classification has no conclusion to go stale, so it carries no basis.
export function snapshotWatchlistBasis(project: ProjectData, registerKey: string, committed: RegisterRow[], rows: RegisterRow[]): RegisterRow[] {
  const def = WATCHLIST_KINDS[registerKey];
  if (!def) return rows;
  const before = new Map(committed.map((r) => [text(r.ingredientGroup), r]));
  return rows.map((row) => {
    const group = text(row.ingredientGroup);
    const prev = before.get(group);
    if (text(row.gate4Disposition) === '') return { ...row, basisAtReview: '' };
    const current = watchlistBasisKey(watchlistMatchLines(project, def.kind, group));
    const recorded = text(prev?.basisAtReview);
    const changed =
      recorded === '' || text(prev?.reviewDate) !== text(row.reviewDate) || text(prev?.gate4Disposition) !== text(row.gate4Disposition);
    return { ...row, basisAtReview: changed ? current : recorded };
  });
}

// The workbook's H: a match reads "REVIEW - possible formula match", no match "No formula match recorded". The app lets a PERSON'S
// conclusion stand: only the two machine-written states move. A row with a match and no conclusion of its own (blank, or still
// "No formula match recorded") is set to REVIEW, so a match can never sit beside a clean status; a row set to REVIEW whose match has
// gone is set back. "Not present - evidence linked", "Present within restriction", "Prohibited - remove" and the escalations are
// decisions somebody took, and are kept — which is also how a false match is cleared. [ASSUMPTION: R5-Q76]
export const WATCHLIST_NO_MATCH = 'No formula match recorded';
export const WATCHLIST_MATCH_REVIEW = 'REVIEW - possible formula match';
export function screenedProductStatus(current: string, matches: number, noMatch: string = WATCHLIST_NO_MATCH): string {
  const status = current.trim();
  if (matches > 0 && (status === '' || status === noMatch)) return WATCHLIST_MATCH_REVIEW;
  if (matches === 0 && status === WATCHLIST_MATCH_REVIEW) return noMatch;
  return current;
}

export function deriveRegisterRows(registerKey: string, rows: RegisterRow[], project: ProjectData): RegisterRow[] {
  // The two rulebook sheets show the changes of each type, read from the Change Control log (Round 5 question 11).
  if (RULEBOOK_CATEGORY[registerKey]) return applyRulebookChanges(registerKey, rows, project);
  if (registerKey === 'formulationChangeRegister') {
    // The base columns come from the master Change Control record (utils/changeViews.ts); the status follows from them and the overlay.
    return applyChangeView(FORMULATION_CHANGE_VIEW, rows, project).map((r) => ({ ...r, overallStatus: formulaChangeStatus(r) }));
  }
  const watch = WATCHLIST_KINDS[registerKey];
  if (watch) {
    return rows.map((r) => {
      const group = text(r.ingredientGroup);
      const matches = formulaMatchCount(project, group, watch.kind);
      const lines = watchlistMatchLines(project, watch.kind, group);
      return {
        ...r,
        formulaMatchCount: matches,
        productStatus: screenedProductStatus(text(r.productStatus), matches, watch.noMatch),
        // The matching result, kept apart from the reviewer's classification: what matched, and against which formula and list.
        matchBasis: lines.length > 0 ? lines.join('\n') : 'No match',
        matchedAgainst: `Formula ${project.formulaVersion || '—'} · list ${WATCH_LIST_VERSION}`,
        reassessmentNeeded: watchlistConclusionStale(project, registerKey, r) ? 'Yes' : '',
      };
    });
  }
  return rows;
}

// --- Blocks the workbook shows under a register ---------------------------------------------------------------------------------
export interface RegisterSummary {
  title: string;
  note?: string;
  head: string[];
  rows: string[][];
}

const count = (rows: RegisterRow[], predicate: (r: RegisterRow) => boolean) => String(rows.filter(predicate).length);

export function registerSummary(registerKey: string, rows: RegisterRow[]): RegisterSummary | undefined {
  if (registerKey === 'formulationChangeRegister') {
    const is = (status: string) => (r: RegisterRow) => formulaChangeStatus(r) === status;
    const S = FORMULA_CHANGE_STATUSES;
    return {
      title: 'Closure control summary',
      note: 'Live — counted from the log above.',
      head: ['Metric', 'Value'],
      rows: [
        ['Total changes logged', count(rows, (r) => text(r.changeId) !== '')],
        ['Awaiting Final Approver decision', count(rows, is(S.awaitingDecision))],
        ['Approved but still open', count(rows, is(S.approvedOpen))],
        ['Market comms pending', count(rows, is(S.commsPending))],
        ['VN re-registration pending', count(rows, is(S.vnPending))],
        ['Closed', count(rows, is(S.closed))],
        ['Rejected', count(rows, is(S.rejected))],
        ['Awaiting Final Approver sign-off', count(rows, is(S.awaitingSignOff))],
      ],
    };
  }
  if (registerKey === 'productFamilyRegister') {
    const codes: string[] = [];
    for (const r of rows) {
      const c = text(r.familyCode);
      if (c && !codes.some((x) => x.toLowerCase() === c.toLowerCase())) codes.push(c);
    }
    return {
      title: 'Family roll-up',
      note: 'Live count of versions per family.',
      head: ['Family code', 'Product family name', 'No. of versions on record', 'Current market version', 'Any version needing market comms?'],
      rows: codes.map((code) => {
        const mine = rows.filter((r) => text(r.familyCode).toLowerCase() === code.toLowerCase());
        const current = mine.find((r) => text(r.currentMarketVersion) === 'Yes');
        const comms = mine.some((r) => text(r.marketCommNeeded) === 'Yes')
          ? 'YES - comms needed'
          : mine.some((r) => text(r.marketCommNeeded) === 'To assess')
            ? 'To assess'
            : 'No';
        return [code, text(mine[0].familyName) || '—', String(mine.length), current ? text(current.versionFormulaNo) || '—' : 'none marked current', comms];
      }),
    };
  }
  return undefined;
}
