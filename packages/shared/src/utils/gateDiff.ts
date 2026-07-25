// Diffing an ordinary Phase Gate Flow edit (rule B4's "no silent corrections"
// applied to everyday edits, not just backtracks).
//
// Moved out of apps/web/src/store/useAppStore.ts in M3 Phase 1 (2026-07-26):
// the API now performs the same diff before writing its audit row, and the
// monorepo rule is that web and api must share one implementation rather than
// keep two that can drift ("never fork a copy" — CLAUDE.md).
import type { GateFieldChange, GateRecord } from '../types';

// The gate fields whose changes are logged. Deliberately a fixed list rather
// than Object.keys(next): only real user-editable Phase Gate Flow fields belong
// in the change log, and a new field must be added here consciously.
export const GATE_RECORD_FIELDS: GateFieldChange['field'][] = [
  'status',
  'decision',
  'owner',
  'dueDate',
  'evidenceLink',
  'notes',
];

// Which of `next`'s fields actually differ from `existing`. Only keys PRESENT in
// `next` are considered, so a partial patch never reports the fields it omits as
// having been cleared.
export function diffGateRecord(existing: GateRecord, next: Partial<GateRecord>): GateFieldChange[] {
  const changes: GateFieldChange[] = [];
  for (const field of GATE_RECORD_FIELDS) {
    if (field in next && next[field] !== existing[field]) {
      changes.push({ field, from: existing[field], to: next[field] });
    }
  }
  return changes;
}
