// When a project may open a Change Control of a given type (SW-30, project owner's
// decision 2026-10-13 — a software rule, not a business one, so it was not put to the
// review team).
//
// A Change Control is the formal way to correct something that was LOCKED at a gate.
// Until a gate has passed, the data it owns is still being worked on directly, so
// there is nothing to put under change control — and an open change soft-locks every
// gate its trigger names (F9), so one opened too early would silently hold gates the
// project has not reached.
//
// Each trigger already declares the gates it affects (`gates`). The rule reads that
// and nothing else: a trigger is available once the project has PASSED the EARLIEST
// gate it names — the first gate at which a locked decision exists for it to change.
// A trigger that names every gate (`ALL`) is always available. A gate that is merely
// the CURRENT one does not count: it is open for direct editing.
import type { ProjectData } from '../types';
import { GATES } from '../config/gates';
import { type ChangeTrigger } from '../config/changeTriggers';
import { isGatePassed } from './gateProgress';

export interface ChangeTriggerAvailability {
  allowed: boolean;
  // The gate that has to pass first (e.g. 'SG05'), and the sentence to show when it has not.
  requiresGateId?: string;
  reason?: string;
}

// The earliest gate a trigger names, or undefined for ALL (or for a trigger naming no real gate).
export function earliestTriggerGate(trigger: ChangeTrigger): { id: string; number: string } | undefined {
  if (trigger.gates.includes('ALL')) return undefined;
  const numbers = trigger.gates
    .map((g) => GATES.find((meta) => meta.number === g))
    .filter((g): g is (typeof GATES)[number] => !!g)
    .sort((a, b) => GATES.indexOf(a) - GATES.indexOf(b));
  const first = numbers[0];
  return first ? { id: first.id, number: first.number } : undefined;
}

export function changeTriggerAvailability(project: ProjectData, trigger: ChangeTrigger): ChangeTriggerAvailability {
  const first = earliestTriggerGate(trigger);
  if (!first || isGatePassed(project, first.id)) return { allowed: true };
  return {
    allowed: false,
    requiresGateId: first.id,
    reason: `Gate ${first.number} has not passed yet — until it does, what this change would correct is still being worked on directly, so there is nothing to put under change control`,
  };
}
