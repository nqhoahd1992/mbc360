import type { BomLine } from '../types';

export type FormulaBomDiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface FormulaBomDiffRow {
  key: string;
  ingredient: string;
  status: FormulaBomDiffStatus;
  before?: BomLine;
  after?: BomLine;
}

// Fields that count toward "did this line change" between two versions.
const COMPARABLE_FIELDS: (keyof BomLine)[] = [
  'inciName',
  'casNo',
  'functionRole',
  'supplier',
  'percentWw',
  'costPerKg',
];

function lineKey(line: BomLine, index: number): string {
  return line.rmCode?.trim() || `#${index}:${line.inciName}`;
}

function linesDiffer(a: BomLine, b: BomLine): boolean {
  return COMPARABLE_FIELDS.some((field) => a[field] !== b[field]);
}

// Compares two Formula BOM snapshots (e.g. two formula versions) line by
// line, matched by rmCode (falling back to position+INCI name for lines
// without one). Rows are sorted so real differences surface first.
export function diffFormulaBom(before: BomLine[], after: BomLine[]): FormulaBomDiffRow[] {
  const beforeByKey = new Map(before.map((line, i) => [lineKey(line, i), line]));
  const afterByKey = new Map(after.map((line, i) => [lineKey(line, i), line]));
  const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

  const rows: FormulaBomDiffRow[] = [];
  for (const key of keys) {
    const b = beforeByKey.get(key);
    const a = afterByKey.get(key);
    let status: FormulaBomDiffStatus;
    if (b && !a) status = 'removed';
    else if (!b && a) status = 'added';
    else status = linesDiffer(b!, a!) ? 'changed' : 'unchanged';

    rows.push({
      key,
      ingredient: (a ?? b)!.inciName || (a ?? b)!.rmCode || key,
      status,
      before: b,
      after: a,
    });
  }

  const statusOrder: Record<FormulaBomDiffStatus, number> = { removed: 0, added: 1, changed: 2, unchanged: 3 };
  rows.sort((x, y) => statusOrder[x.status] - statusOrder[y.status] || x.ingredient.localeCompare(y.ingredient));
  return rows;
}
