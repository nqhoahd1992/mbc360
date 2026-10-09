// Parsing of a config `gate` string ('04', '04/07', '08-09', 'ALL', undefined) into gate ids.
// A leaf on purpose: gateProgress, gateSnapshot and registerColumnGates all need it and none
// of them may import another's dependents.
import { GATES } from '../config/gates';

// Both '/' and '-' separate gates: phases.ts writes the Testing Families checklist section's
// gate as '08-09' while every register uses '04/07' — both mean the same "these gates" list
// (fixed 2026-07-25: the dash form used to parse to nothing, so that one section could never
// lock). 'ALL' and an empty/missing ref name no gate.
export function gateRefGateIds(gateRef: string | undefined): string[] {
  if (!gateRef) return [];
  const ref = gateRef.trim();
  if (ref === '' || ref.toUpperCase() === 'ALL') return [];
  return ref
    .split(/[/-]/)
    .map((n) => GATES.find((g) => g.number === n.trim())?.id)
    .filter((id): id is string => !!id);
}

// Position of a gate in the strict order, -1 for something that is not a gate.
export function gateOrder(gateId: string): number {
  return GATES.findIndex((g) => g.id === gateId);
}
