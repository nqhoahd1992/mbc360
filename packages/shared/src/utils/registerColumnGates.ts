// Which gate a register COLUMN belongs to (software rules SW-5 and SW-20,
// docs/rules/Software_Rules.md).
//
// A column belongs to the gate that ENTERS it, and that is DECLARED, never guessed from which
// gates read it: several gates may read a column (Gates 10 and 11 re-check the materials of the
// formula) without entering anything, and a read says nothing about who writes.
//
//   1. `RegisterColumn.gate` where it is declared — the gate (or gates) that enter the column.
//   2. Otherwise the LAST gate of the register's own `gate` list: a column nobody has singled
//      out is finished when the register is, so it freezes with the register. Nothing is
//      invented for it.
//
// A register's `referenceGates` are gates that only READ it. They own no column and they do
// not keep the register open. Which registers each gate reads is still MEASURED
// (column-reads-lib.ts) because that is a fact about the code, not a decision: the signature
// records every register a gate's readiness reads.
import { REGISTER_READS_BY_GATE, TRIGGER_READS_BY_GATE } from '../config/registerColumnReads';
import { REGISTER_CONFIGS } from '../config/registers';
import { gateOrder, gateRefGateIds } from './gateRefs';

// Every register the gate's readiness reads, rows included ("has at least one row" reads a
// register without reading any of its columns). Checks and triggers both.
export function registersReadByGate(gateId: string): string[] {
  return [
    ...new Set([
      ...Object.keys(REGISTER_READS_BY_GATE[gateId] ?? {}),
      ...Object.keys(TRIGGER_READS_BY_GATE[gateId] ?? {}),
    ]),
  ];
}

// The gates that own a column, as gate ids. Empty = no owner (a register with no gate at all).
export function columnOwnerGateIds(registerKey: string, columnKey: string): string[] {
  const config = REGISTER_CONFIGS.find((c) => c.key === registerKey);
  if (!config) return [];
  const column = config.columns.find((c) => c.key === columnKey);
  if (column?.gate) {
    const declared = gateRefGateIds(column.gate);
    if (declared.length > 0) return declared;
  }
  const own = gateRefGateIds(config.gate);
  return own.length > 0 ? [own[own.length - 1]] : [];
}

// The position of the gate that finishes a column, for ordering against another gate. A column
// with no owner never settles.
export function columnOwnerOrder(registerKey: string, columnKey: string): number {
  const owners = columnOwnerGateIds(registerKey, columnKey);
  return owners.length > 0 ? Math.max(...owners.map(gateOrder)) : Number.POSITIVE_INFINITY;
}

// What a gate's signature covers of a register, in two parts (project owner's principle,
// 2026-10-09: whoever signs approves EVERYTHING currently filled in, including fields that
// belong to future gates, and a later gate approves the data of the earlier ones):
//
//   settled — columns owned by this gate or an EARLIER one. The signer is accountable for
//     these and a change to them makes the signature stale. For an earlier gate's column this
//     is how a later gate "approves the data of the old gate": it is part of its snapshot, and
//     it is frozen once that earlier gate passed, so it can only change by Backtrack.
//   later — columns owned by a LATER gate. The signer approves what is filled in at the moment
//     of signing, and it is recorded, but the later gate is still to finish it, so a change
//     there must not un-pass this gate. Reported as information only.
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

// True when a register's own gate list names more than one gate — the only case where showing a
// gate on each column tells the reader anything they cannot already see on the card.
export function spansSeveralGates(registerGate?: string): boolean {
  return !!registerGate && /[/-]/.test(registerGate);
}
