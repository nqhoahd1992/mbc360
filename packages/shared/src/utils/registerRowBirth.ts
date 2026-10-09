// Which gate a register ROW belongs to — software rule SW-4 (docs/rules/
// Software_Rules.md, decided 2026-10-09): a row created after gate N has passed is
// not part of gate N's readiness or snapshot; it belongs only to the gates that had
// not yet passed when it was created.
//
// A row records the gate that was OPEN FOR WORK when it was first saved
// (`__bornAtGate`, written by the server and nobody else). Gates unlock strictly in
// order, so "gates not yet passed at that moment" is exactly "that gate and every
// gate after it". A row with no stamp is a legacy row: it predates the rule and
// belongs to every gate, which is what the app did before — so the rule can never
// make an existing project's gate readiness LESS strict than it was.
//
// This file is deliberately a leaf (it imports only config + types): gateProgress and
// gateSnapshot both need it, and neither may import the other's dependents.
import { GATES } from '../config/gates';
import type { ProjectData, RegisterRow } from '../types';

// Stable per-row identity. A register is rewritten whole on every save and rows were
// matched by position, which cannot say "this is the same row as before" once one is
// deleted or inserted. The server assigns it; a value the client sends is only ever
// honoured when it names a row the server already has.
export const ROW_ID_KEY = '__rowId';
export const ROW_BORN_KEY = '__bornAtGate';
// Stamp for a row created once every gate has passed: it belongs to no gate.
export const BORN_AFTER_ALL_GATES = 'AFTER';

// Position of a gate in the strict order. 'AFTER' sorts after every real gate.
export function gateOrder(gateId: string): number {
  if (gateId === BORN_AFTER_ALL_GATES) return GATES.length;
  return GATES.findIndex((g) => g.id === gateId);
}

// -1 for an unstamped (legacy) row, so it is `<=` every gate.
export function rowBornOrder(row: RegisterRow): number {
  const born = row[ROW_BORN_KEY];
  if (typeof born !== 'string' || born === '') return -1;
  const order = gateOrder(born);
  return order === -1 ? -1 : order;
}

export function rowBelongsToGate(row: RegisterRow, gateId: string): boolean {
  return rowBornOrder(row) <= gateOrder(gateId);
}

// The project as gate `gateId` sees it: every register reduced to the rows that
// belong to that gate. Readiness and the signature snapshot evaluate against THIS,
// so a late row cannot reopen a gate that was signed without it. Returns the same
// object when nothing is filtered out (the overwhelmingly common case), so callers
// that compare by reference or call this in a loop pay almost nothing.
export function projectAsOfGate(project: ProjectData, gateId: string): ProjectData {
  let registers: Record<string, RegisterRow[]> | undefined;
  for (const [key, rows] of Object.entries(project.registers)) {
    if (rows.every((row) => rowBelongsToGate(row, gateId))) continue;
    registers ??= { ...project.registers };
    registers[key] = rows.filter((row) => rowBelongsToGate(row, gateId));
  }
  return registers ? { ...project, registers } : project;
}
