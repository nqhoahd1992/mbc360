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
// A gate needs a register closed when its readiness READS the register — the evidence a gate decision rests on (Round 5 question 13(a): "require a
// controlled review for evidence used in a gate decision ... reference lists, working notes and automatically derived views do not each need a
// separate close-out ceremony") — and something is settled by then. A register no gate reads has no ceremony; it is still locked when every gate
// it is tied to has passed (isGateRefLocked). The workbook's own sign-off block (`closureRoles`) keeps its gate too: it IS the existing approval.
// [ASSUMPTION: R6-Q19] Pure and shared: the API refuses a write and the table greys the cell with the SAME answer.
import { REGISTER_READS_BY_GATE } from '../config/registerColumnReads';
import { CRITICAL_GATES } from '../config/gateSignOff';
import { REGISTER_CONFIGS, findNavGroupForRegister, type RegisterConfig } from '../config/registers';
import { registerClosureSignerRole, type ReviewOwnerSpec } from '../config/reviewers';
import type { ProjectData, RegisterClosureState, RegisterRow } from '../types';
import { DEFAULT_REGISTER_CLOSURE_ROLES, hasStandingClosureSignature, isRegisterClosed } from '../types';
import { gateOrder, gateRefGateIds } from './gateRefs';
import { columnsByAccountability } from './registerColumnGates';
import { WATCHLIST_DERIVED_COLUMNS, WATCHLIST_KINDS } from './registerDerived';

// The registers that are closed by this one's signature (see RegisterConfig.closedWith).
export function closureMembers(anchorKey: string): RegisterConfig[] {
  return REGISTER_CONFIGS.filter((c) => c.closedWith === anchorKey);
}

// The roles that sign a register's closing: the workbook's own sign-off block where the page declares one (nominated by the
// project's Lead), else the register's review owner and co-signer.
export function registerClosureRoles(config: RegisterConfig, gateId?: string): readonly string[] {
  if (config.closureRoles && config.closureRoles.length > 0) return config.closureRoles;
  // Round 5 question 13(b)/(c): the evidence owner PLUS an independent qualified reviewer where independence is required — at the critical gates
  // (question 23(a): 3, 4, 7, 8, 9, 10, 11) — and the owner alone elsewhere: "remove the unnecessary second signature rather than show a
  // permanent warning". Without a gate the pair is returned, the stricter answer. [ASSUMPTION: R6-Q19]
  if (gateId && !closureNeedsIndependentReview(gateId)) return OWNER_ONLY_CLOSURE_ROLES;
  return DEFAULT_REGISTER_CLOSURE_ROLES;
}

const OWNER_ONLY_CLOSURE_ROLES: readonly string[] = ['Review owner'];

// Independent review is required where the gate is one of the critical ones.
export const closureNeedsIndependentReview = (gateId: string): boolean => CRITICAL_GATES.includes(gateId);

// "One person signing twice is one person": at a gate that needs independent review, the Review owner and the Co-sign must resolve to two
// different people. Returns the person both resolve to, or undefined when they differ or either is not assigned yet (that has its own message).
export function closureSignerConflict(config: RegisterConfig, gateId: string, reviewers: Record<string, string> | undefined): string | undefined {
  if (closureSignersAreNominated(config) || !closureNeedsIndependentReview(gateId)) return undefined;
  const spec = registerReviewSpec(config);
  if (!spec || !reviewers) return undefined;
  const owner = (reviewers[registerClosureSignerRole(spec, 'Review owner')] ?? '').trim();
  const coSign = (reviewers[registerClosureSignerRole(spec, 'Co-sign')] ?? '').trim();
  return owner !== '' && owner.toLowerCase() === coSign.toLowerCase() ? owner : undefined;
}

// True when the signers of this register are nominated by the project's Lead rather than derived from the review owner.
export function closureSignersAreNominated(config: RegisterConfig): boolean {
  return !!config.closureRoles && config.closureRoles.length > 0;
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
  // A register with its own approval route is not closed a second time (question 13(b)).
  if (config.approvalRoute) {
    gatesCache.set(config.key, []);
    return [];
  }
  const read = Object.keys(REGISTER_READS_BY_GATE).filter((gate) => config.key in (REGISTER_READS_BY_GATE[gate] ?? {}));
  const last = closureSignersAreNominated(config) ? lastGateOf(config) : undefined;
  // A gate that reads a register before anything of it is settled (the Final Safety Sign-off is read at Gate 7 but its columns settle at Gate 10)
  // is covered by the first later gate of the register's own list that settles something — never dropped, which would quietly narrow the rule.
  const own = gateRefGateIds(config.gate).sort((a, b) => gateOrder(a) - gateOrder(b));
  const settledFrom = (gate: string): string | undefined =>
    closureColumns(config, gate).length > 0
      ? gate
      : own.find((o) => gateOrder(o) > gateOrder(gate) && closureColumns(config, o).length > 0);
  const covered = read.map(settledFrom).filter((g): g is string => !!g);
  const gates = [...new Set([...covered, ...(last ? [last] : [])])]
    // Nothing settled at a gate means there is nothing for its closure to attest to or lock.
    .filter((gate) => closureColumns(config, gate).length > 0)
    .sort((a, b) => gateOrder(a) - gateOrder(b))
    // A later gate that settles exactly the columns the previous closure already locked has nothing new to attest to: the same two
    // people would sign the same columns again (Supplier & RM Evidence read at Gates 7, 10 and 11 showed three identical blocks,
    // 2026-10-19). Only a gate that adds a settled column keeps its own closure. The earlier signature stands and keeps those
    // columns locked, and one for a passed gate cannot be withdrawn, so dropping the repeat loses no protection.
    .filter((gate, index, all) => {
      if (index === 0) return true;
      const previous = new Set(closureColumns(config, all[index - 1]));
      return closureColumns(config, gate).some((key) => !previous.has(key));
    });
  gatesCache.set(config.key, gates);
  return gates;
}

// Closed at EVERY gate it has to be closed at (a register with no such gate counts as not closed).
export function isRegisterFullyClosed(project: ProjectData, configIn: RegisterConfig): boolean {
  const config = (configIn.closedWith && REGISTER_CONFIGS.find((c) => c.key === configIn.closedWith)) || configIn;
  const gates = registerClosureGateIds(config);
  return gates.length > 0 && gates.every((gate) => isRegisterClosed(closureStateAt(project, config.key, gate), registerClosureRoles(config, gate)));
}

// Every (register, gate) pair a gate needs closed. A register that cannot be closed at all (no reviewer spec) is left out, since
// requiring it would make the gate unpassable.
export function requiredRegisterClosures(gateId: string): { registerKey: string; gateId: string }[] {
  return REGISTER_CONFIGS.filter((c) => !!registerReviewSpec(c) && registerClosureGateIds(c).includes(gateId)).map((c) => ({
    registerKey: c.key,
    gateId,
  }));
}

// What a register needs, for the Gate Rules & Sheet Map (question 13(a): "mark register approval requirements in the Gate Rules & Sheet Map").
export interface RegisterApprovalRequirement {
  kind: 'own-block' | 'own-route' | 'closure' | 'member' | 'none';
  label: string;
  gates: { gateId: string; roles: readonly string[] }[];
  note?: string;
}
export function registerApprovalRequirement(config: RegisterConfig): RegisterApprovalRequirement {
  if (config.closedWith) {
    const anchor = REGISTER_CONFIGS.find((c) => c.key === config.closedWith);
    return { kind: 'member', label: 'Closed with its page', gates: [], note: `Signed with ${anchor?.closureTitle ?? anchor?.title ?? config.closedWith}` };
  }
  if (config.approvalRoute) return { kind: 'own-route', label: 'Own approval route', gates: [], note: config.approvalRoute };
  const gates = registerClosureGateIds(config).map((gateId) => ({ gateId, roles: registerClosureRoles(config, gateId) }));
  if (gates.length === 0) return { kind: 'none', label: 'No close-out', gates: [], note: 'No gate reads it: a working or reference record' };
  if (closureSignersAreNominated(config)) return { kind: 'own-block', label: "The page's own sign-off block", gates };
  const independent = gates.some((g) => g.roles.length > 1);
  return { kind: 'closure', label: independent ? 'Owner + independent reviewer' : 'Owner', gates };
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
      // The watch-lists' derived columns are the server's to write after every save, not a person's edit.
      if (WATCHLIST_KINDS[config.key] && WATCHLIST_DERIVED_COLUMNS.has(column.key)) continue;
      const gate = locks.columns.get(column.key);
      if (gate && blank(committed[index][column.key]) !== blank(incoming[index][column.key])) {
        problems.push(`Row ${index + 1} "${column.label}" is locked — ${registerLockReason(gate)}`);
      }
    }
  }
  return problems;
}
