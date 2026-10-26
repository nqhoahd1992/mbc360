import type { BomLine, RegisterRow } from '../types';
import { createEmptyRegisterRow, isRegisterRowBlank, getRegisterConfig } from '../config/registers';
import { matchIngredientWatchLists } from './ingredientWatch';

// The Ingredient-Level Safety Matrix follows the Formula BOM line by line, as the workbook's formulas do: each matrix row takes its
// Line, ingredient, % w/w, function and supplier from the BOM, and the two watch-list match counts (and the screening result they
// give) are computed from the ingredient.
// Only the assessment columns are entered by a person. The same function is applied on the server when the matrix is saved, so
// none of the BOM-derived or computed columns can be set by a request.
//
// A BOM line and a matrix row are the same ingredient when their RM code is the same, or — when either has no code — their INCI
// name is (the join the Gate 7 coverage check already makes). A row whose ingredient has left the BOM keeps what was entered on
// it (`line` blank) rather than vanishing: a removed BOM line must not silently erase safety evidence (B4).
export const SAFETY_MATRIX_KEY = 'formulationSafetyMatrix';

const text = (v: unknown) => String(v ?? '').trim();

function sameIngredient(line: BomLine, row: RegisterRow): boolean {
  const code = text(line.rmCode);
  const inci = text(line.inciName).toLowerCase();
  const rowCode = text(row.rmCode);
  const rowInci = text(row.inciName).toLowerCase();
  const inciMatches = inci !== '' && rowInci === inci;
  if (code !== '') return rowCode === code || (rowCode === '' && inciMatches);
  return inciMatches;
}

// The decision the workbook's formula gives from the two match counts. Only the two machine-written states move: a person's
// conclusion (Approved, Conditional, Rejected, Not Applicable) stands. "Needs Review" is the machine's "waiting", so it clears
// itself when the match goes, and it is not a conclusion (Gate 7 treats it as none).
export function screenedSafetyDecision(current: string, matches: number): string {
  const status = current.trim();
  if (matches > 0 && ['', 'Not Started', 'No listed match'].includes(status)) return 'Needs Review';
  if (matches === 0 && ['', 'Not Started', 'Needs Review'].includes(status)) return 'No listed match';
  return current;
}

// What the BOM line and the watch-lists decide for a matrix row; the rest of the row is what a person entered.
function computedFields(line: BomLine, current: RegisterRow) {
  const hits = matchIngredientWatchLists(line.inciName ?? '', line.casNo);
  // The workbook's COUNTIF: how many watch-list entries of each list the ingredient matches.
  const prohibited = hits.filter((h) => h.kind === 'prohibited').length;
  const caution = hits.filter((h) => h.kind === 'pbCaution').length;
  return {
    prohibitedMatch: prohibited,
    pbCautionMatch: caution,
    safetyDecision: screenedSafetyDecision(text(current.safetyDecision), prohibited + caution),
  };
}

// The rows already stored, with the computed columns brought up to date against the BOM (no row is added or dropped). Applied
// wherever the project is built, so the rules read the same values the screen shows.
export function refreshStoredSafetyMatrix(bom: BomLine[], rows: RegisterRow[]): RegisterRow[] {
  return rows.map((r) => {
    const line = bom.find((l) => (text(l.rmCode) !== '' || text(l.inciName) !== '') && sameIngredient(l, r));
    return line ? { ...r, ...computedFields(line, r) } : r;
  });
}

// `committed` (server): an unmatched row is kept only if the register already held it. Omitted (display): every unmatched row is
// kept, since the rows shown are the stored ones.
export function syncSafetyMatrix(bom: BomLine[], rows: RegisterRow[], committed?: RegisterRow[]): RegisterRow[] {
  const config = getRegisterConfig(SAFETY_MATRIX_KEY);
  const used = new Set<number>();
  const out: RegisterRow[] = [];
  bom.forEach((line, i) => {
    if (text(line.rmCode) === '' && text(line.inciName) === '') return;
    const at = rows.findIndex((r, idx) => !used.has(idx) && sameIngredient(line, r));
    if (at >= 0) used.add(at);
    const base = at >= 0 ? rows[at] : createEmptyRegisterRow(SAFETY_MATRIX_KEY);
    out.push({
      ...base,
      line: String(line.line || i + 1),
      rmCode: text(line.rmCode),
      inciName: text(line.inciName),
      percentWw: line.percentWw ?? 0,
      functionRole: text(line.functionRole),
      supplier: text(line.supplier),
      ...computedFields(line, base),
    });
  });
  rows.forEach((r, idx) => {
    if (used.has(idx)) return;
    if (config && isRegisterRowBlank(config, r)) return;
    if (committed && !committed.some((c) => text(c.rmCode) === text(r.rmCode) && text(c.inciName).toLowerCase() === text(r.inciName).toLowerCase())) return;
    out.push({ ...r, line: '' });
  });
  return out;
}
