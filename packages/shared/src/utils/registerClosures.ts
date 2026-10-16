// Closing a register FOR A GATE (SW-36, project owner 2026-10-15; plan: docs/plans/Permission_Model_Plan.md §10).
//
// A register is closed once PER GATE that needs it, not once for the whole register. The Review owner and Co-sign sign the closure of
// (register, gate), and that signature:
//   - attests to the register's SETTLED columns at that gate — the columns owned by this gate or an earlier one (registerColumnGates.ts),
//     the same split a gate's own signature uses; and
//   - locks exactly those columns and the register's rows, while the columns a later gate still has to enter stay open.
// Locking is therefore the consequence of the signatures, never automatic: a register nobody has closed is not frozen by a gate passing
// (the readiness list makes the gate wait for the closure, so in practice it is closed before the gate can pass).
//
// Why "settled" and not "the columns the gate reads": the watch-lists' Product status is read by Gate 4 but is still updated until
// Gate 7 (it is entered by Gate 7), so locking what a gate READS would wrongly freeze it at Gate 4.
//
// A gate needs a register closed when its readiness reads the register or when it is the last gate of the register's own list, and
// something is settled by then. Pure and shared: the API refuses a write and the table greys the cell with the SAME answer.
import { REGISTER_READS_BY_GATE } from '../config/registerColumnReads';
import { REGISTER_CONFIGS, findNavGroupForRegister, type RegisterConfig } from '../config/registers';
import type { ReviewOwnerSpec } from '../config/reviewers';
import type { ProjectData, RegisterClosureState, RegisterRow } from '../types';
import { hasStandingClosureSignature, isRegisterClosed } from '../types';
import { gateOrder, gateRefGateIds } from './gateRefs';
import { columnsByAccountability } from './registerColumnGates';

// The registers that are closed by this one's signature (see RegisterConfig.closedWith).
export function closureMembers(anchorKey: string): RegisterConfig[] {
  return REGISTER_CONFIGS.filter((c) => c.closedWith === anchorKey);
}

export const closureKey = (registerKey: string, gateId: string): string => `${registerKey}|${gateId}`;

export function closureStateAt(project: ProjectData, registerKey: string, gateId: string): RegisterClosureState | undefined {
  return project.registerClosures[closureKey(registerKey, gateId)];
}

// Who signs the closure: the register's own review owner, else its group's (the same resolution the page caption uses).
export function registerReviewSpec(config: RegisterConfig): ReviewOwnerSpec | undefined {
  return config.reviewOwner ?? findNavGroupForRegister(config.key)?.reviewOwner;
}

// The last gate of the register's own list, or undefined for a register with no gate at all (it can never be closed or locked).
function lastGateOf(config: RegisterConfig): string | undefined {
  const own = gateRefGateIds(config.gate);
  return own.length === 0 ? undefined : own.reduce((a, b) => (gateOrder(b) > gateOrder(a) ? b : a));
}

// The columns a closure at this gate attests to and locks: settled at that gate, signature columns left out (they have their own act).
export function closureColumns(config: RegisterConfig, gateId: string): string[] {
  const settled = new Set(columnsByAccountability(gateId, config.key).settled);
  return config.columns.filter((c) => settled.has(c.key) && c.type !== 'signature').map((c) => c.key);
}

const gatesCache = new Map<string, string[]>();

// The gates at which this register has to be closed, in gate order.
export function registerClosureGateIds(config: RegisterConfig): string[] {
  // A member of a group has no closing block of its own: its anchor's signature closes it.
  if (config.closedWith) return [];
  const cached = gatesCache.get(config.key);
  if (cached) return cached;
  const read = Object.keys(REGISTER_READS_BY_GATE).filter((gate) => config.key in (REGISTER_READS_BY_GATE[gate] ?? {}));
  const last = lastGateOf(config);
  const gates = [...new Set([...read, ...(last ? [last] : [])])]
    // Nothing settled at a gate means there is nothing for its closure to attest to or lock.
    .filter((gate) => closureColumns(config, gate).length > 0)
    .sort((a, b) => gateOrder(a) - gateOrder(b));
  gatesCache.set(config.key, gates);
  return gates;
}

// Closed at EVERY gate it has to be closed at (a register with no such gate counts as not closed).
export function isRegisterFullyClosed(project: ProjectData, configIn: RegisterConfig): boolean {
  const config = (configIn.closedWith && REGISTER_CONFIGS.find((c) => c.key === configIn.closedWith)) || configIn;
  const gates = registerClosureGateIds(config);
  return gates.length > 0 && gates.every((gate) => isRegisterClosed(closureStateAt(project, config.key, gate)));
}

// Every (register, gate) pair a gate needs closed. A register that cannot be closed at all (no reviewer spec) is left out, since
// requiring it would make the gate unpassable.
export function requiredRegisterClosures(gateId: string): { registerKey: string; gateId: string }[] {
  return REGISTER_CONFIGS.filter((c) => !!registerReviewSpec(c) && registerClosureGateIds(c).includes(gateId)).map((c) => ({
    registerKey: c.key,
    gateId,
  }));
}

export interface RegisterLocks {
  // Column key -> the gate whose standing closure locks it (the earliest).
  columns: Map<string, string>;
  // The earliest gate whose standing closure keeps rows from being added or removed (free-form registers only).
  rows?: string;
}

export function registerLocks(project: ProjectData, config: RegisterConfig): RegisterLocks {
  const columns = new Map<string, string>();
  let rows: string | undefined;
  // A member is locked by its anchor's signature; its own closure never exists.
  const anchor = config.closedWith ? REGISTER_CONFIGS.find((c) => c.key === config.closedWith) : undefined;
  const signedOn = anchor ?? config;
  for (const gate of registerClosureGateIds(signedOn)) {
    if (!hasStandingClosureSignature(closureStateAt(project, signedOn.key, gate))) continue;
    for (const key of closureColumns(config, gate)) if (!columns.has(key)) columns.set(key, gate);
    if (config.mode === 'register' && rows === undefined) rows = gate;
  }
  return { columns, rows };
}

export function registerLockReason(gateId: string): string {
  return `Closed for ${gateId}: a closing signature stands on this register, and this part of it belongs to that gate. Withdraw the signature (with a reason), or Backtrack, to change it.`;
}

const blank = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

// What a proposed save would change in a locked part of the register. Rows are matched by position, which is safe because rows
// cannot be added, removed or reordered once a closure stands. Empty = allowed. Plain sentences, straight to the person.
export function registerLockViolations(
  project: ProjectData,
  config: RegisterConfig,
  committed: RegisterRow[],
  incoming: RegisterRow[],
): string[] {
  const locks = registerLocks(project, config);
  if (locks.columns.size === 0 && !locks.rows) return [];
  const problems: string[] = [];
  if (locks.rows && incoming.length !== committed.length) {
    problems.push(`Rows cannot be ${incoming.length > committed.length ? 'added' : 'removed'}: ${registerLockReason(locks.rows)}`);
  }
  const shared = Math.min(committed.length, incoming.length);
  for (let index = 0; index < shared; index += 1) {
    for (const column of config.columns) {
      const gate = locks.columns.get(column.key);
      if (gate && blank(committed[index][column.key]) !== blank(incoming[index][column.key])) {
        problems.push(`Row ${index + 1} "${column.label}" is locked — ${registerLockReason(gate)}`);
      }
    }
  }
  return problems;
}
