// Which cells and rows of a register a passed gate has frozen (software rules SW-5 and SW-20,
// docs/rules/Software_Rules.md).
//
//   - Every column has an owner gate: the gate that enters it, declared on the column or else
//     the last gate of the register's own list (registerColumnGates.ts). Once that gate has
//     passed the column is read-only.
//   - A register cannot gain or lose a ROW once any of its columns is frozen. Whoever signed
//     the earlier gate approved the data as it stood; a row added afterwards would carry
//     columns of that gate it can no longer fill in, and would quietly change what was
//     approved. A new row after that point means going back (Backtrack).
//   - A register read only by other gates (`referenceGates`) is never kept open for them.
//   - When the LAST gate of the register's list has passed the whole register is read-only
//     (isGateRefLocked); that is a separate, earlier-existing rule and stays as it was.
//
// Pure and shared on purpose: the API refuses the write and the table greys the cell with the
// SAME answer, which is the guard-parity rule (BACKEND_PLAN §3 principle 7).
import type { RegisterConfig } from '../config/registers';
import { GATES } from '../config/gates';
import type { ProjectData, RegisterRow } from '../types';
import { isGatePassed } from './gateProgress';
import { gateOrder } from './gateRefs';
import { columnOwnerGateIds } from './registerColumnGates';

// The set of gates that have passed, computed ONCE. isGatePassed evaluates the whole readiness
// list of a gate, so asking it per cell (30 columns x 50 rows) would make a single save or
// render cost thousands of evaluations; every function below takes this set instead.
export function passedGateSet(project: ProjectData): ReadonlySet<string> {
  return new Set(GATES.filter((g) => isGatePassed(project, g.id)).map((g) => g.id));
}

// The gate that froze this column, or undefined while it is still open. A column owned by
// several gates freezes when the last of them has passed.
export function cellFrozenBy(
  passed: ReadonlySet<string>,
  config: RegisterConfig,
  columnKey: string,
): string | undefined {
  const column = config.columns.find((c) => c.key === columnKey);
  if (!column || column.type === 'signature') return undefined;
  const owners = columnOwnerGateIds(config.key, columnKey);
  if (owners.length === 0 || !owners.every((id) => passed.has(id))) return undefined;
  return owners.reduce((latest, id) => (gateOrder(id) > gateOrder(latest) ? id : latest));
}

// The first gate that froze any column of a free-form register — from then on rows cannot be
// added or removed. A fixed register has predefined rows and never gains or loses one.
export function rowsFrozenBy(passed: ReadonlySet<string>, config: RegisterConfig): string | undefined {
  if (config.mode !== 'register') return undefined;
  let first: string | undefined;
  for (const column of config.columns) {
    const frozen = cellFrozenBy(passed, config, column.key);
    if (frozen && (first === undefined || gateOrder(frozen) < gateOrder(first))) first = frozen;
  }
  return first;
}

export function rowsFrozenReason(gateId: string): string {
  return `${gateId} has passed and part of this register belongs to it — rows can no longer be added or removed. Backtrack to reopen it.`;
}

const blank = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

// Everything in a proposed save that touches a frozen cell or adds/removes a row of a frozen
// register. Rows are matched by position, which is safe because rows cannot be added, removed
// or reordered once anything is frozen. Empty = the save is allowed. Plain sentences, since they
// go straight to the person.
export function registerFreezeViolations(
  passed: ReadonlySet<string>,
  config: RegisterConfig,
  committed: RegisterRow[],
  incoming: RegisterRow[],
): string[] {
  const problems: string[] = [];
  const frozenRows = rowsFrozenBy(passed, config);
  if (frozenRows && incoming.length !== committed.length) {
    problems.push(
      incoming.length > committed.length
        ? `Rows cannot be added: ${rowsFrozenReason(frozenRows)}`
        : `Rows cannot be removed: ${rowsFrozenReason(frozenRows)}`,
    );
  }
  const shared = Math.min(committed.length, incoming.length);
  for (let index = 0; index < shared; index += 1) {
    for (const column of config.columns) {
      const frozenBy = cellFrozenBy(passed, config, column.key);
      if (frozenBy && blank(committed[index][column.key]) !== blank(incoming[index][column.key])) {
        problems.push(
          `Row ${index + 1} "${column.label}" is frozen by ${frozenBy}, which has passed — Backtrack to change it`,
        );
      }
    }
  }
  return problems;
}
