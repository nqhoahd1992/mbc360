import type { ProjectData, RegisterRow } from '../types';
import { matchIngredientWatchLists } from './ingredientWatch';

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
export function formulaMatchCount(project: ProjectData, ingredientGroup: string): number {
  return project.bom.filter((l) =>
    matchIngredientWatchLists(l.inciName ?? '', l.casNo).some((h) => h.kind === 'prohibited' && h.group === ingredientGroup),
  ).length;
}

// The workbook's H: a match reads "REVIEW - possible formula match", no match "No formula match recorded". The app lets a PERSON'S
// conclusion stand: only the two machine-written states move. A row with a match and no conclusion of its own (blank, or still
// "No formula match recorded") is set to REVIEW, so a match can never sit beside a clean status; a row set to REVIEW whose match has
// gone is set back. "Not present - evidence linked", "Present within restriction", "Prohibited - remove" and the escalations are
// decisions somebody took, and are kept — which is also how a false match is cleared. [ASSUMPTION: R5-Q76]
export const WATCHLIST_NO_MATCH = 'No formula match recorded';
export const WATCHLIST_MATCH_REVIEW = 'REVIEW - possible formula match';
export function screenedProductStatus(current: string, matches: number): string {
  const status = current.trim();
  if (matches > 0 && (status === '' || status === WATCHLIST_NO_MATCH)) return WATCHLIST_MATCH_REVIEW;
  if (matches === 0 && status === WATCHLIST_MATCH_REVIEW) return WATCHLIST_NO_MATCH;
  return current;
}

export function deriveRegisterRows(registerKey: string, rows: RegisterRow[], project: ProjectData): RegisterRow[] {
  if (registerKey === 'formulationChangeRegister') return rows.map((r) => ({ ...r, overallStatus: formulaChangeStatus(r) }));
  if (registerKey === 'prohibitedIngredients') {
    return rows.map((r) => {
      const matches = formulaMatchCount(project, text(r.ingredientGroup));
      return { ...r, formulaMatchCount: matches, productStatus: screenedProductStatus(text(r.productStatus), matches) };
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
