// Which gate a register COLUMN belongs to, and which columns each gate reads
// (software rule SW-5, docs/rules/Software_Rules.md).
//
// Two things are known per column:
//
//   READERS — the gates whose CHECKS read it (a trigger that merely consults a column to decide
//   whether an item applies is not a reader, and never owns the column). This is MEASURED, not written: the
//   checked-in `REGISTER_READS_BY_GATE` is produced by tracing every real check over many
//   random projects (packages/shared/scripts/column-reads-lib.ts), so it covers the
//   bespoke checks and the triggers as well as the generic ones, and `verify:readiness`
//   fails when it goes stale. It cannot drift from what the app actually enforces.
//
//   OWNER — the one gate the column "belongs" to:
//     1. `RegisterColumn.gate` where the sheet says so (the claim ledger carries it on
//        most columns). A hand attribution is never overridden by a read: Gate 12 reads the
//        claim wording to decide whether performance evidence is needed, but the wording is
//        still Gate 3's evidence, not Gate 12's.
//     2. Otherwise the LAST gate that reads it (project owner's decision, 2026-10-09: a
//        column two gates read belongs to the later one). It freezes when that gate passes.
//        The earlier reader's signature still RECORDS the column, but a later change to it
//        does not make that signature stale — see columnsByAccountability.
//     3. A column nothing reads has no owner here and keeps the register's own gate list.
//
// A column nobody has attributed and nobody reads stays untagged on purpose — attributing
// ~380 columns by hand would be inventing a per-column schedule nobody has confirmed, which
// is the failure this repo keeps having to undo.
import { REGISTER_READS_BY_GATE, TRIGGER_READS_BY_GATE } from '../config/registerColumnReads';
import { REGISTER_CONFIGS } from '../config/registers';
import { gateRefGateIds } from './gateRefs';
import { gateOrder } from './registerRowBirth';

interface ColumnInfo {
  // Gate ids that read it, in gate order.
  readers: string[];
}

function build(): { columns: Map<string, ColumnInfo>; registersByGate: Map<string, string[]> } {
  const columns = new Map<string, ColumnInfo>();
  const registersByGate = new Map<string, string[]>();
  for (const gateId of Object.keys(REGISTER_READS_BY_GATE).sort()) {
    const registers = REGISTER_READS_BY_GATE[gateId];
    registersByGate.set(gateId, [...new Set([...Object.keys(registers), ...Object.keys(TRIGGER_READS_BY_GATE[gateId] ?? {})])]);
    for (const [register, cols] of Object.entries(registers)) {
      for (const column of cols) {
        const key = `${register}.${column}`;
        const info = columns.get(key) ?? { readers: [] };
        info.readers.push(gateId);
        columns.set(key, info);
      }
    }
  }
  for (const [gateId, registers] of Object.entries(TRIGGER_READS_BY_GATE)) {
    if (registersByGate.has(gateId)) continue;
    registersByGate.set(gateId, Object.keys(registers));
  }
  return { columns, registersByGate };
}

const BUILT = build();

// The gate ids that read a column ('SG04', 'SG07', …), in gate order.
export function columnReaders(registerKey: string, columnKey: string): string[] {
  return BUILT.columns.get(`${registerKey}.${columnKey}`)?.readers ?? [];
}

// Display form: '04/07' for a column two gates read.
export function derivedColumnGate(registerKey: string, columnKey: string): string | undefined {
  const readers = columnReaders(registerKey, columnKey);
  return readers.length > 0 ? readers.map((id) => id.replace('SG', '')).join('/') : undefined;
}

// The gate(s) that own a column, as gate ids. Empty = no owner (nothing reads it and no
// sheet attribution): the caller falls back to the register's own gate list.
export function columnOwnerGateIds(registerKey: string, columnKey: string): string[] {
  const column = REGISTER_CONFIGS.find((c) => c.key === registerKey)?.columns.find((c) => c.key === columnKey);
  if (column?.gate) {
    const explicit = gateRefGateIds(column.gate);
    if (explicit.length > 0) return explicit;
  }
  const readers = columnReaders(registerKey, columnKey);
  return readers.length > 0 ? [readers[readers.length - 1]] : [];
}

// Every register the gate's readiness reads, rows included ("has at least one row" reads a
// register without reading any of its columns).
export function registersReadByGate(gateId: string): string[] {
  return BUILT.registersByGate.get(gateId) ?? [];
}

// The position of the gate that effectively owns a column, for ordering against another gate.
// The owner rules above; a column with none (nothing reads it, no sheet attribution) belongs
// to the LAST gate of its register's own list, which is when it freezes (registerRowLocks.ts);
// a register with no gate at all never settles (Infinity).
export function columnOwnerOrder(registerKey: string, columnKey: string): number {
  const owners = columnOwnerGateIds(registerKey, columnKey);
  if (owners.length > 0) return Math.max(...owners.map(gateOrder));
  const own = gateRefGateIds(REGISTER_CONFIGS.find((c) => c.key === registerKey)?.gate);
  return own.length > 0 ? gateOrder(own[own.length - 1]) : Number.POSITIVE_INFINITY;
}

// What a gate's signature covers of a register, in two parts (project owner's principle,
// 2026-10-09: whoever signs approves EVERYTHING currently filled in, including fields that
// belong to future gates, and a later gate approves the data of the earlier ones too):
//
//   settled — columns owned by this gate or an EARLIER one. The signer is accountable for
//     these and a change to them makes the signature stale. For an earlier gate's column
//     this is how a later gate "approves the data of the old gate": it is part of its
//     snapshot, and it is frozen once that earlier gate passed, so it can only change by
//     Backtrack.
//   later — columns owned by a LATER gate. The signer approves what is filled in at the
//     moment of signing, and it is recorded, but the later gate is still to finish it, so a
//     change there must not un-pass this gate. It is reported as information only.
//
// Both parts cover every column of the register, not only the ones a check reads: the signer
// approved the whole content, not just the part that gates the decision.
export function columnsByAccountability(gateId: string, registerKey: string): { settled: string[]; later: string[] } {
  const config = REGISTER_CONFIGS.find((c) => c.key === registerKey);
  const here = gateOrder(gateId);
  const settled: string[] = [];
  const later: string[] = [];
  for (const column of config?.columns ?? []) {
    (columnOwnerOrder(registerKey, column.key) <= here ? settled : later).push(column.key);
  }
  return { settled, later };
}

// True when a register's own gate covers more than one — the only case where a
// per-column gate tells the reader anything they cannot already see on the card.
export function spansSeveralGates(registerGate?: string): boolean {
  return !!registerGate && /[/-]/.test(registerGate);
}
