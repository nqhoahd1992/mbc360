// Round 5 question 10 (SME answer, 2026-11-05): a Change Control that names gates that have already passed gets a CONTROLLED
// impact assessment, and the decisions it invalidates are reopened — not merely warned about.
//
//   - On opening a CHG the affected gates / version / market are flagged and it needs TRIAGE. While it awaits triage, "a
//     potentially material or unassessed release impact holds affected current readiness pending assessment".
//   - "The trigger provides a minimum suggested scope; Quality with the relevant technical functions confirms the full scope."
//   - "On confirmed material impact or approval to implement the change, reopen the affected decision(s)" — ALL affected gates,
//     not only the earliest — "Keep the earlier signed snapshot in history."
//   - "A justified administrative correction can use a controlled addendum without reopening substantive approvals."
//   - Rejected / Cancelled changes need recorded confirmation that no controlled implementation occurred and no residual impact
//     remains before readiness is restored.
//
// What is decided where: this file holds the vocabulary and the pure rules (what is pending, what holds a gate, what a triage
// must carry); the API turns a Material outcome into the actual reopening, recorded as a backtrack-style event.
// The readings of what the answer leaves open are [ASSUMPTION: R6-Q16].
import type { ChangeRecord, GateRecord, ProjectData } from '../types';
import { GATES } from '../config/gates';
import { getChangeTrigger, isChangeOpen } from '../config/changeTriggers';

export const TRIAGE_MATERIAL = 'Material impact';
export const TRIAGE_NOT_MATERIAL = 'No material impact';
export const TRIAGE_ADMINISTRATIVE = 'Administrative correction';
export const TRIAGE_OUTCOMES = [TRIAGE_MATERIAL, TRIAGE_NOT_MATERIAL, TRIAGE_ADMINISTRATIVE] as const;

// Who triages: the project's Quality / change-control reviewer. Under SW-57 neither the Quality area holder nor an administrator
// stands in for the specialist. The answer says "Quality with the relevant technical functions"; that the technical functions
// are consulted rather than co-signing is our reading. [ASSUMPTION: R6-Q16]
export const CHANGE_TRIAGE_FUNCTION_KEYS = ['quality-change-control'] as const;

// A change that has reached one of these has been approved to go ahead or already is, so its impact must have been assessed
// first: "approval to implement" is one of the two moments the answer reopens decisions at.
export const CHANGE_STATUSES_NEEDING_TRIAGE: readonly string[] = [
  'Approved - Implementation Pending',
  'In Implementation',
  'Verification Pending',
  'Completed',
];

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function isTriageRecorded(change: ChangeRecord): boolean {
  return (TRIAGE_OUTCOMES as readonly string[]).includes(text(change.impactTriage));
}

// An open change nobody has triaged yet: its impact is unassessed.
export function isTriagePending(change: ChangeRecord): boolean {
  return isChangeOpen(change.status) && !isTriageRecorded(change);
}

// The trigger's own gates are only the MINIMUM scope. 'ALL' (or a change with no trigger) is every gate.
export function suggestedScopeGateIds(change: ChangeRecord): string[] {
  const trigger = getChangeTrigger(change.triggerId);
  if (!trigger || trigger.gates.includes('ALL')) return GATES.map((g) => g.id);
  return GATES.filter((g) => trigger.gates.includes(g.number)).map((g) => g.id);
}

// What a recorded triage must carry before it counts.
export function triageProblems(input: { outcome: string; confirmedGates: string[]; reason: string; confirmedMarkets?: string[]; projectMarkets?: readonly string[] }): string[] {
  const problems: string[] = [];
  if (!(TRIAGE_OUTCOMES as readonly string[]).includes(input.outcome)) {
    problems.push(`the outcome must be one of ${TRIAGE_OUTCOMES.join(' / ')}`);
  }
  if (text(input.reason) === '') problems.push('the reason for the outcome');
  const valid = new Set(GATES.map((g) => g.id));
  const unknown = input.confirmedGates.filter((g) => !valid.has(g));
  if (unknown.length > 0) problems.push(`known gates only (not ${unknown.join(', ')})`);
  if (input.outcome === TRIAGE_MATERIAL && input.confirmedGates.length === 0) {
    problems.push('the confirmed scope: which gates the change invalidates');
  }
  if (input.projectMarkets) {
    const notOurs = (input.confirmedMarkets ?? []).filter((m) => !input.projectMarkets!.includes(m));
    if (notOurs.length > 0) problems.push(`markets of this project only (not ${notOurs.join(', ')})`);
  }
  return problems;
}

// A gate recorded as passed keeps its record while a change awaits triage (it is reopened only on a CONFIRMED impact), so the hold is
// on what is still current: every gate from the earliest affected one onward that has not passed.
export const isGateRecordedPassed = (gate: GateRecord | undefined): boolean =>
  !!gate && gate.status === 'Complete' && (gate.decision === 'Proceed' || gate.decision === 'Proceed with Conditions');

export function changesHoldingGate(project: ProjectData, gateId: string): ChangeRecord[] {
  const idx = GATES.findIndex((g) => g.id === gateId);
  if (idx < 0 || isGateRecordedPassed(project.gates.find((g) => g.gateId === gateId))) return [];
  return project.changes.filter((c) => {
    if (c.projectId && c.projectId !== project.identity.id) return false;
    if (!isTriagePending(c)) return false;
    const scope = suggestedScopeGateIds(c);
    const first = Math.min(...scope.map((id) => GATES.findIndex((g) => g.id === id)).filter((i) => i >= 0));
    return Number.isFinite(first) && idx >= first;
  });
}
