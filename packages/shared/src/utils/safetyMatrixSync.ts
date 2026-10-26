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
    const hits = matchIngredientWatchLists(line.inciName ?? '', line.casNo);
    // The workbook's COUNTIF: how many watch-list entries of each list the ingredient matches.
    const prohibited = hits.filter((h) => h.kind === 'prohibited').length;
    const caution = hits.filter((h) => h.kind === 'pbCaution').length;
    out.push({
      ...(at >= 0 ? rows[at] : createEmptyRegisterRow(SAFETY_MATRIX_KEY)),
      line: String(line.line || i + 1),
      rmCode: text(line.rmCode),
      inciName: text(line.inciName),
      percentWw: line.percentWw ?? 0,
      functionRole: text(line.functionRole),
      supplier: text(line.supplier),
      prohibitedMatch: prohibited,
      pbCautionMatch: caution,
      screeningResult: prohibited + caution > 0 ? 'Needs Review' : 'No listed match',
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
