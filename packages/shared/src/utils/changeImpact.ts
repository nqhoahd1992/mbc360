// Rule E3(b) (SME Round 3), Gate 11: "The existing soft-lock mechanism is suitable
// for low- or medium-risk open changes. At Gate 11, apply the following:
//
//   Critical or launch-impacting open Change Control: hard-block launch.
//   Formula, artwork, claims, safety, regulatory, packaging or release-impacting
//     change: hard-block unless implementation and verification are complete.
//   Low-risk administrative change: may permit Proceed with Conditions following
//     authorised acknowledgement.
//   Completed, rejected, cancelled or superseded change: does not block if final
//     disposition is recorded.
//
// Therefore, Gate 11 requires more than a duplicate warning. It must evaluate the
// impact classification and closure status of each open Change Control."
//
// Until 2026-08-12 `sg11-changes-closed` was `manual` — literally the duplicate
// warning that sentence rejects. The F9/C4 soft lock existed and treated every
// open change the same, whatever it touched.
import type { ChangeRecord, ProjectData } from '../types';
import {
  CHANGE_IMPACT_ADMIN,
  CHANGE_IMPACT_BLOCKING_AREAS,
  CHANGE_IMPACT_LAUNCH,
  isChangeOpen,
} from '../config/changeTriggers';

const areas = (change: ChangeRecord): string[] => change.impactAreas ?? [];

// E3(b)'s fourth line, including its proviso: a terminal status only stops
// blocking "if final disposition is recorded". `isChangeOpen` reads the status
// alone, so a change marked Completed with nothing recorded about how it was
// closed counted as closed — this adds the half of that sentence the older code
// left out [ASSUMPTION: R4-Q31].
export function isChangeDispositionRecorded(change: ChangeRecord): boolean {
  return String(change.closureEvidence ?? '').trim() !== '' || String(change.closedDate ?? '').trim() !== '';
}

export function isChangeStillOpen(change: ChangeRecord): boolean {
  return isChangeOpen(change.status) || !isChangeDispositionRecorded(change);
}

function projectChanges(project: ProjectData, changes: ChangeRecord[]): ChangeRecord[] {
  const id = project.identity.id;
  return changes.filter((c) => !c.projectId || c.projectId === id);
}

// Blocks Gate 11 outright, Proceed with Conditions included:
//
//   - launch-impacting, or High risk. E3(b) says "Critical or launch-impacting";
//     the risk scale in this app is Low/Medium/High with no Critical, so High is
//     read as their "critical" [ASSUMPTION: R4-Q31];
//   - impacting any of formula / artwork / claims / safety / regulatory /
//     packaging / release. E3(b) allows these through only when "implementation
//     and verification are complete" — which, on this lifecycle, is precisely
//     when the change reaches a terminal status, so an OPEN one always blocks;
//   - not classified at all. E3(b) requires Gate 11 to EVALUATE the impact
//     classification, and there is nothing to evaluate on an unclassified change.
//     Letting those through would make the rule optional [ASSUMPTION: R4-Q31].
export function gate11HardBlockingChanges(project: ProjectData, changes: ChangeRecord[]): ChangeRecord[] {
  return projectChanges(project, changes).filter((change) => {
    if (!isChangeStillOpen(change)) return false;
    const impact = areas(change);
    if (impact.length === 0) return true;
    if (impact.includes(CHANGE_IMPACT_LAUNCH) || change.riskLevel === 'High') return true;
    return impact.some((a) => CHANGE_IMPACT_BLOCKING_AREAS.includes(a));
  });
}

// E3(b)'s third line: a low-risk administrative change "may permit Proceed with
// Conditions following authorised acknowledgement". The acknowledgement is the
// existing F9 mechanism on the Phase Gate Flow table, which is why this is a
// soft blocker rather than a new modal.
export function gate11ConditionalChanges(project: ProjectData, changes: ChangeRecord[]): ChangeRecord[] {
  return projectChanges(project, changes).filter((change) => {
    if (!isChangeStillOpen(change)) return false;
    const impact = areas(change);
    if (impact.length === 0) return false; // already a hard blocker
    if (impact.includes(CHANGE_IMPACT_LAUNCH) || change.riskLevel === 'High') return false;
    if (impact.some((a) => CHANGE_IMPACT_BLOCKING_AREAS.includes(a))) return false;
    return impact.includes(CHANGE_IMPACT_ADMIN);
  });
}
