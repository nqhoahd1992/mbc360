// Round 5 question 11(2) (SME answer, 2026-11-05): "Gate 5 formula lock is the normal boundary. Routine unlocked trials use the iteration log. Any
// change to an already approved formula, market authorisation, released pack/claim or other controlled baseline requires CHG, even if the project
// has been sent back to Gate 5. Backtracking does not erase that controlled history."
//
// So a formula that has been APPROVED once stays a controlled baseline for the rest of the project, whichever gate the project is on. "Approved" is read
// from the history the application keeps and never erases: a backtrack event whose reopened Gate 05 had stood passed, or Gate 05 passed now. Which
// other baselines (market authorisation, released pack or claim) the same rule covers is not built: only the formula is. [ASSUMPTION: R6-Q17]
import type { ProjectData } from '../types';
import { isChangeOpen } from '../config/changeTriggers';
import { isFormulationChange } from './changeViews';
import { isGateRecordedPassed } from './changeTriage';

export function formulaWasApproved(project: ProjectData): boolean {
  if (isGateRecordedPassed(project.gates.find((g) => g.gateId === 'SG05'))) return true;
  return project.backtrackEvents.some((e) => isGateRecordedPassed(e.previousGates.find((g) => g.gateId === 'SG05')));
}

// A change record of this project that concerns the formula and is still open (not Completed, Rejected, Cancelled or Superseded).
export function hasOpenFormulationChange(project: ProjectData): boolean {
  return project.changes.some(
    (c) => (!c.projectId || c.projectId === project.identity.id) && isFormulationChange(c) && isChangeOpen(c.status),
  );
}

// Why the Formula BOM may not be edited right now under this rule, or undefined when it may.
export function formulaChangeRequirement(project: ProjectData): string | undefined {
  if (!formulaWasApproved(project)) return undefined;
  if (hasOpenFormulationChange(project)) return undefined;
  return 'This formula has been approved before, so it is a controlled baseline: raise a formulation change on the Change Control page (and keep it open while you work) before editing it, even though the project is back at Gate 05';
}
