// Which gate a register COLUMN belongs to, for the 33 registers whose own gate
// spans several (2026-08-11, user-requested: "for ledgers that span gates, put
// the gate name on the column — better UX").
//
// Two sources, in this order:
//
//   1. `RegisterColumn.gate` — a hand attribution, used where the source sheet
//      itself says so. Only the claim ledger carries one today.
//   2. DERIVED from GATE_READINESS: if the readiness check for gate N reads
//      (register, column), then that column is due at gate N. This is evidence,
//      not guesswork, and it cannot drift — the tag is computed from the same
//      config that decides whether the gate is blocked, so it always describes
//      what the app actually enforces.
//
// A column with neither stays untagged. That is deliberate: attributing all ~380
// columns of those 33 registers by hand would be inventing a per-column schedule
// nobody has confirmed, which is the failure this repo keeps having to undo.
import { GATE_READINESS, type ReadinessCheck } from '../config/gateReadiness';

function leafChecks(check: ReadinessCheck): ReadinessCheck[] {
  return check.kind === 'allOf' || check.kind === 'anyOf' ? check.checks.flatMap(leafChecks) : [check];
}

function build(): Map<string, string> {
  const gatesByColumn = new Map<string, Set<string>>();
  for (const [gateId, requirements] of Object.entries(GATE_READINESS)) {
    const gate = gateId.replace('SG', '');
    for (const requirement of requirements) {
      for (const check of leafChecks(requirement.check)) {
        if (!('register' in check)) continue;
        const columns = 'columns' in check ? check.columns : 'column' in check ? [check.column] : [];
        for (const column of columns) {
          const key = `${check.register}.${column}`;
          const set = gatesByColumn.get(key) ?? new Set<string>();
          set.add(gate);
          gatesByColumn.set(key, set);
        }
      }
    }
  }
  return new Map(
    [...gatesByColumn].map(([key, gates]) => [key, [...gates].sort().join('/')]),
  );
}

const DERIVED = build();

export function derivedColumnGate(registerKey: string, columnKey: string): string | undefined {
  return DERIVED.get(`${registerKey}.${columnKey}`);
}

// True when a register's own gate covers more than one — the only case where a
// per-column gate tells the reader anything they cannot already see on the card.
export function spansSeveralGates(registerGate?: string): boolean {
  return !!registerGate && /[/-]/.test(registerGate);
}
