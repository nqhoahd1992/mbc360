import { getRegisterConfig } from '../config/registers';
import type { ProjectData } from '../types';
import { closureColumns } from './registerClosures';

// What a closing signature on a register attests to: the register's rows exactly as they stand, in the
// column order the register itself declares. This is the ONE definition — the signing preview shows it
// and the server hashes it, so the person reads precisely what their signature is bound to.
//
// Every column the register declares, and nothing else: the internal `__…` bookkeeping a signature
// column carries (who signed, when, the image) is not content the closer is vouching for, and a
// signature column's own display value is what its row shows.
export interface RegisterClosureContent {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}

// With `gateId` the content is only what a closure at that gate attests to: the register's settled columns at that gate (SW-36).
export function registerClosureContent(project: ProjectData, registerKey: string, gateId?: string): RegisterClosureContent | undefined {
  const config = getRegisterConfig(registerKey);
  if (!config) return undefined;
  const covered = gateId ? new Set(closureColumns(config, gateId)) : undefined;
  const columns = config.columns.filter((c) => !covered || covered.has(c.key)).map((c) => ({ key: c.key, label: c.label }));
  const rows = (project.registers[registerKey] ?? []).map((row) => {
    const cells: Record<string, string> = {};
    for (const c of columns) {
      const v = row[c.key];
      cells[c.key] = v === undefined || v === null ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
    }
    return cells;
  });
  return { columns, rows };
}

// What a signature CELL on one register row attests to: that row's cells, in the register's column
// order. Left out: the column being signed (it is empty until the signature exists, and its own fields
// are the signature, not content being vouched for) and any column DERIVED from it (see
// `derivedFromSignature`). Same single definition for the preview and the hash. Returns undefined when
// the register does not exist.
export interface RegisterRowSignContent {
  columns: { key: string; label: string }[];
  row: Record<string, string>;
}

const cellText = (v: unknown): string =>
  v === undefined || v === null ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);

// The cells of ONE row, from the row itself — so the server can compute the content of a row it is about
// to write, not only of one that is already stored.
export function registerRowCells(
  registerKey: string,
  source: Record<string, unknown>,
  signatureColumn: string,
): RegisterRowSignContent | undefined {
  const config = getRegisterConfig(registerKey);
  if (!config) return undefined;
  const columns = config.columns
    .filter((c) => c.key !== signatureColumn && c.derivedFromSignature !== signatureColumn)
    .map((c) => ({ key: c.key, label: c.label }));
  const row: Record<string, string> = {};
  for (const c of columns) row[c.key] = cellText(source[c.key]);
  return { columns, row };
}

export function registerRowSignContent(
  project: ProjectData,
  registerKey: string,
  rowIndex: number,
  signatureColumn: string,
): RegisterRowSignContent | undefined {
  const source = project.registers[registerKey]?.[rowIndex];
  if (!source || !Number.isInteger(rowIndex) || rowIndex < 0) return undefined;
  return registerRowCells(registerKey, source, signatureColumn);
}
