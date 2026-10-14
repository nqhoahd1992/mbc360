// SW-31 — stopping a project. Stop is the final end of a project that cannot go on; it is a state of the
// PROJECT, not a value in the gate-decision dropdown (which the workbook owns).
//
// Only a project that is genuinely stuck on a rule the review team gave may be stopped. Today that is one
// rule: "Critical gaps must result in Hold, Backtrack or Reject/Stop" (F7, Round 4 question 3). Grounds are
// computed here and nowhere else, so a further rule is added by adding a ground below, and the server, the
// screen and the audit record all read the same list.
import type { ProjectData, ProjectStopGround } from '../types';
import { currentMarketTracks, isMarketLaunched, isMarketWithdrawn } from './postLaunch';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// A Critical grade stays in force when the status leaves Gap (audit B14), so the grade alone says a gap is Critical.
export function criticalGapGates(project: ProjectData) {
  return project.gates.filter((gate) => text(gate.gapCriticality) === 'Critical');
}

// What a Critical assessment must carry before it can be the reason a project ends. A grade with nothing behind it
// is not the "formal criticality assessment" Round 4 question 3 asks for, and a stopped project cannot be corrected,
// so the reason recorded at Stop must be complete. The action, its owner and the evidence link are not required: a
// project that is ending has no action left to take.
const STOP_REQUIRED_FIELDS: { field: 'gapImpactCategory' | 'gapAssessor' | 'gapAssessmentDate' | 'gapRationale'; label: string }[] = [
  { field: 'gapImpactCategory', label: 'Impact category' },
  { field: 'gapAssessor', label: 'Assessor' },
  { field: 'gapAssessmentDate', label: 'Assessment date' },
  { field: 'gapRationale', label: 'Rationale' },
];

export function missingStopAssessment(gate: ProjectData['gates'][number]): string[] {
  return STOP_REQUIRED_FIELDS.filter(({ field }) => text(gate[field]) === '').map(({ label }) => label);
}

export function projectStopGrounds(project: ProjectData): ProjectStopGround[] {
  const grounds: ProjectStopGround[] = [];
  for (const gate of criticalGapGates(project)) {
    if (missingStopAssessment(gate).length > 0) continue;
    grounds.push({
      kind: 'critical-gap',
      gateId: gate.gateId,
      criticality: 'Critical',
      ...(text(gate.gapImpactCategory) ? { impactCategory: text(gate.gapImpactCategory) } : {}),
      ...(text(gate.gapRationale) ? { rationale: text(gate.gapRationale) } : {}),
      ...(text(gate.gapAssessor) ? { assessor: text(gate.gapAssessor) } : {}),
      ...(text(gate.gapAssessmentDate) ? { assessmentDate: text(gate.gapAssessmentDate) } : {}),
      ...(text(gate.gapRequiredAction) ? { requiredAction: text(gate.gapRequiredAction) } : {}),
    });
  }
  return grounds;
}

// Markets that are launched and not withdrawn: post-market duties continue there, so the project cannot
// simply be stopped — the market is withdrawn first.
export function marketsBlockingStop(project: ProjectData): string[] {
  return currentMarketTracks(project)
    .filter((t) => isMarketLaunched(t) && !isMarketWithdrawn(t))
    .map((t) => t.market);
}

// Why Stop is not available right now; null = it is.
export function stopRefusal(project: ProjectData): string | null {
  if (project.identity.stopped) return 'This project is already stopped';
  if (project.identity.archived) return 'This project is archived — it is read-only';
  if (projectStopGrounds(project).length === 0) {
    const incomplete = criticalGapGates(project).find((g) => missingStopAssessment(g).length > 0);
    if (incomplete) {
      return `Complete the Critical gap assessment on ${incomplete.gateId} first — still missing: ${missingStopAssessment(incomplete).join(', ')}`;
    }
    return 'A project can be stopped only while a gate carries a Critical gap assessment';
  }
  const launched = marketsBlockingStop(project);
  if (launched.length > 0) {
    return `Withdraw the launched market(s) first: ${launched.join(', ')}`;
  }
  return null;
}
