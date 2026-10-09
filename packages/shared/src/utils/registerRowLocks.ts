// Which cells and rows of a register a passed gate has frozen — software rule SW-5
// (docs/rules/Software_Rules.md, decided 2026-10-09).
//
// Until this, a register's `gate` list was one switch: read-only only once EVERY gate
// in it had passed. So a register shared with a later gate (a claim ledger used at
// 03/10/11, say) stayed fully editable after Gate 03 was signed, including the very
// cells Gate 03's readiness reads. Now the unit is the cell:
//
//   - a column belongs to a gate (`RegisterColumn.gate` where the sheet says so,
//     otherwise the gate whose readiness check reads it — `derivedColumnGate`);
//   - once that gate has passed, the column is read-only for the rows that belong to
//     it (a row created AFTER the gate passed is not part of its evidence, so its
//     cells stay open — see registerRowBirth.ts for why);
//   - a row that a passed gate counted as evidence cannot be deleted.
//
// A column no gate claims keeps the old behaviour: it belongs to the register's whole
// gate list and freezes when all of them have passed. Nothing is invented for it.
//
// Pure and shared on purpose: the API refuses the write and the table greys the cell
// with the SAME answer, which is the guard-parity rule (BACKEND_PLAN §3 principle 7).
import type { RegisterConfig } from '../config/registers';
import { GATES } from '../config/gates';
import type { ProjectData, RegisterRow } from '../types';
import { isGatePassed } from './gateProgress';
import { gateRefGateIds } from './gateRefs';
import { registersReadAtGate } from './gateSnapshot';
import { columnOwnerGateIds, spansSeveralGates } from './registerColumnGates';
import {
  BORN_AFTER_ALL_GATES,
  ROW_BORN_KEY,
  ROW_ID_KEY,
  gateOrder,
  rowBelongsToGate,
  rowBornOrder,
} from './registerRowBirth';

// The first gate that has NOT passed — what a row created this instant is born into.
// After the last gate has passed there is none.
//
// Deliberately not `currentGateIndex`: that one also holds the index on a gate that has
// passed while its PHASE is not yet closed (sign-offs pending), so a row created in that
// window would be stamped with the gate that already passed and freeze at once, which is
// the opposite of the rule (a row created after gate N passed does not belong to N).
// Found by running the real API against a passed gate, 2026-10-09.
export function bornGateOf(project: ProjectData): string {
  return GATES.find((g) => !isGatePassed(project, g.id))?.id ?? BORN_AFTER_ALL_GATES;
}

// The set of gates that have passed, computed ONCE. isGatePassed evaluates the whole
// readiness list of a gate, so asking it per cell (30 columns x 50 rows) would make a
// single save or render cost thousands of evaluations; every function below takes this
// set instead.
export function passedGateSet(project: ProjectData): ReadonlySet<string> {
  return new Set(GATES.filter((g) => isGatePassed(project, g.id)).map((g) => g.id));
}

// The gates whose passing freezes this cell, for this row. Empty = never frozen.
function freezingGateIds(config: RegisterConfig, columnKey: string, row: RegisterRow): string[] {
  const column = config.columns.find((c) => c.key === columnKey);
  if (!column || column.type === 'signature') return [];
  // The column's owner gate (sheet attribution first, else the last gate that reads it —
  // registerColumnGates.ts); a column nothing reads keeps the register's own gate list.
  const ownerIds = columnOwnerGateIds(config.key, columnKey);
  // A column with an owner is frozen when THAT gate passes, even in a register whose own gate list is a
  // single, later gate (the watch-lists are gate 07 but Gate 4 owns their review columns): the
  // whole-register lock only fires when the register's last gate passes, which is too late for them.
  // A column with no owner in a single-gate register is covered by that whole-register lock alone.
  if (ownerIds.length === 0 && !spansSeveralGates(config.gate)) return [];
  const owners = ownerIds.length > 0 ? ownerIds : gateRefGateIds(config.gate);
  if (owners.length === 0) return [];
  const born = rowBornOrder(row);
  if (born >= GATES.length) return []; // created after every gate: belongs to none
  // A row born at gate B is not evidence for any gate before B, so its cell cannot
  // be frozen earlier than B whatever column it is.
  return born < 0 ? owners : [...new Set([...owners, GATES[born].id])];
}

// The gate that froze it, or undefined when the cell is still open.
export function cellFrozenBy(
  passed: ReadonlySet<string>,
  config: RegisterConfig,
  row: RegisterRow,
  columnKey: string,
): string | undefined {
  const gates = freezingGateIds(config, columnKey, row);
  if (gates.length === 0 || !gates.every((id) => passed.has(id))) return undefined;
  return gates.reduce((latest, id) => (gateOrder(id) > gateOrder(latest) ? id : latest));
}

// A row in the draft that the server has not saved yet: a free-form register's rows get
// their id on first save, so no id means it is new, and a new row belongs to no passed gate
// yet. (A fixed register's seeded rows carry no id but are never new.)
export function isNewRow(config: RegisterConfig, row: RegisterRow): boolean {
  return config.mode === 'register' && !row[ROW_ID_KEY];
}

const blank = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

// Why this row cannot be deleted, or undefined when it can. A passed gate that reads
// this register counted every row that belonged to it as evidence; deleting one would
// change what that gate was signed on. Also refused while any of its cells is frozen
// and holds a value, because deleting the row erases that cell.
export function rowRemovalBlock(
  passed: ReadonlySet<string>,
  config: RegisterConfig,
  row: RegisterRow,
): string | undefined {
  if (config.mode === 'fixed') return 'This register has predefined rows that cannot be removed';
  for (const gate of GATES) {
    if (!registersReadAtGate(gate.id).includes(config.key)) continue;
    if (rowBelongsToGate(row, gate.id) && passed.has(gate.id)) {
      return `This row is part of the evidence for ${gate.id}, which has passed — Backtrack to reopen it first`;
    }
  }
  for (const column of config.columns) {
    const frozenBy = cellFrozenBy(passed, config, row, column.key);
    if (frozenBy && blank(row[column.key]) !== '') {
      return `"${column.label}" is frozen by ${frozenBy}, which has passed — the row cannot be removed`;
    }
  }
  return undefined;
}

// Match an incoming row to the committed row it is an edit of. By the server-written
// row id; rows that carry none (a fixed register's seeded rows) fall back to position.
function committedMatch(
  committed: RegisterRow[],
  incoming: RegisterRow,
  index: number,
): RegisterRow | undefined {
  const id = incoming[ROW_ID_KEY];
  if (typeof id === 'string' && id !== '') return committed.find((r) => r[ROW_ID_KEY] === id);
  const byPosition = committed[index];
  return byPosition && !byPosition[ROW_ID_KEY] ? byPosition : undefined;
}

// Everything in a proposed save that touches a frozen cell or removes a protected row.
// Empty = the save is allowed. Plain sentences, since they go straight to the person.
export function registerFreezeViolations(
  passed: ReadonlySet<string>,
  config: RegisterConfig,
  committed: RegisterRow[],
  incoming: RegisterRow[],
): string[] {
  const problems: string[] = [];
  const kept = new Set<RegisterRow>();
  incoming.forEach((row, index) => {
    const before = committedMatch(committed, row, index);
    if (!before) return; // a new row: nothing committed to protect
    kept.add(before);
    for (const column of config.columns) {
      const frozenBy = cellFrozenBy(passed, config, before, column.key);
      if (frozenBy && blank(before[column.key]) !== blank(row[column.key])) {
        problems.push(
          `Row ${index + 1} "${column.label}" is frozen by ${frozenBy}, which has passed — Backtrack to change it`,
        );
      }
    }
  });
  committed.forEach((row, index) => {
    if (kept.has(row)) return;
    const reason = rowRemovalBlock(passed, config, row);
    if (reason) problems.push(`Row ${index + 1} cannot be removed: ${reason}`);
  });
  return problems;
}

// Give every row of a register save its server-owned identity and birth gate.
// Rows are matched to committed ones by id, so a client can never claim an older
// birth for a new row: an unknown or reused id is treated as a new row. `newId` is
// injected because this file stays free of any runtime-specific id generator.
export function stampRegisterRows(
  bornNow: string,
  config: RegisterConfig,
  committed: RegisterRow[],
  incoming: RegisterRow[],
  newId: () => string,
): RegisterRow[] {
  if (config.mode === 'fixed') return incoming; // seeded rows, never created by a person
  const used = new Set<string>();
  return incoming.map((row) => {
    const { [ROW_ID_KEY]: sentId, [ROW_BORN_KEY]: _sentBorn, ...rest } = row;
    const known =
      typeof sentId === 'string' && sentId !== '' && !used.has(sentId)
        ? committed.find((r) => r[ROW_ID_KEY] === sentId)
        : undefined;
    if (known) {
      used.add(String(sentId));
      const born = known[ROW_BORN_KEY];
      return { ...rest, [ROW_ID_KEY]: String(sentId), ...(born ? { [ROW_BORN_KEY]: born } : {}) };
    }
    const id = newId();
    used.add(id);
    return { ...rest, [ROW_ID_KEY]: id, [ROW_BORN_KEY]: bornNow };
  });
}
