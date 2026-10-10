import { createHash } from 'node:crypto';
import type { ProjectData } from '@mbc360/shared/types';
import { canonicalJson } from '@mbc360/shared/utils/gateSnapshot';
import { registerClosureContent, registerRowCells, registerRowSignContent } from '@mbc360/shared/utils/registerClosureContent';

// The hashes a signature is bound to. They live in ONE file because two places must agree on them
// exactly: the signing endpoints (which hash what the signer was shown) and the project mapper (which
// recomputes the hash on every read to tell whether a signature has gone stale). A copy in each would
// drift, and a drift reads as every signature in the system being stale, or none of them.
const sha256 = (value: unknown): string => createHash('sha256').update(canonicalJson(value)).digest('hex');

// A closing signature on a whole register.
export function registerContentHashOf(project: ProjectData, registerKey: string): string | undefined {
  const content = registerClosureContent(project, registerKey);
  return content ? sha256(content) : undefined;
}

// A signature cell on one row. The position and the column are part of what is signed, not only the cells.
export function rowSignatureHash(rowIndex: number, column: string, content: object): string {
  return sha256({ rowIndex, column, ...content });
}

export function registerRowContentHashOf(
  project: ProjectData,
  registerKey: string,
  rowIndex: number,
  column: string,
): string | undefined {
  const content = registerRowSignContent(project, registerKey, rowIndex, column);
  return content ? rowSignatureHash(rowIndex, column, content) : undefined;
}

// The same hash for a row that is about to be written (not yet in the project).
export function rowHashFromCells(
  registerKey: string,
  rowIndex: number,
  column: string,
  source: Record<string, unknown>,
): string | undefined {
  const content = registerRowCells(registerKey, source, column);
  return content ? rowSignatureHash(rowIndex, column, content) : undefined;
}
