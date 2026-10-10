import { getRegisterConfig } from '../config/registers';
import type { ProjectData } from '../types';

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

export function registerClosureContent(project: ProjectData, registerKey: string): RegisterClosureContent | undefined {
  const config = getRegisterConfig(registerKey);
  if (!config) return undefined;
  const columns = config.columns.map((c) => ({ key: c.key, label: c.label }));
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
