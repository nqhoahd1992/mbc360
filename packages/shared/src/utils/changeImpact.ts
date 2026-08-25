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
import { RISK_LEVELS_HARD_BLOCKING } from '../types';
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
// left out.
//
// ✅ Round 4 question 34(c) (2026-08-24) raised the bar: "A closing date or short
// note alone is insufficient." A final disposition is eight things, and this now
// requires seven of them — the eighth, a remaining action or transition
// requirement, the answer itself qualifies with "if any", so demanding it would
// force people to invent one for a change that leaves nothing behind.
//
// The old test accepted `closureEvidence` OR `closedDate`, i.e. either one alone —
// which is precisely the "closing date alone" the answer rejects. Note the change
// of connective as much as the new fields: an OR across two fields was doing the
// work of an AND across seven.
const DISPOSITION_FIELDS = [
  'status',
  'closureOutcome',
  'closureImplementation',
  'closureEvidence',
  'closureImpactedVersions',
  'closureVerifier',
  'closedDate',
] as const satisfies readonly (keyof ChangeRecord)[];

export function isChangeDispositionRecorded(change: ChangeRecord): boolean {
  return DISPOSITION_FIELDS.every((field) => String(change[field] ?? '').trim() !== '');
}

// Which of the seven a change is still missing — so the Gate 11 blocker can name
// them instead of saying "final disposition not recorded" and leaving the user to
// guess which of seven fields it means.
export function missingDispositionFields(change: ChangeRecord): string[] {
  return DISPOSITION_FIELDS.filter((field) => String(change[field] ?? '').trim() === '');
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
//   - launch-impacting, or Critical or High risk. E3(b) says "Critical or
//     launch-impacting"; the scale used to be Low/Medium/High with no Critical, so
//     High was read as their "critical". ✅ Round 4 question 34(a) (2026-08-24)
//     rejected that fold — "Critical is a separate level above High" — and the
//     scale now has all four, shared with safety findings and gap criticality via
//     `RISK_LEVELS_HARD_BLOCKING`. Both top levels block, neither stands in for
//     the other;
//   - impacting any of formula / artwork / claims / safety / regulatory /
//     packaging / release. E3(b) allows these through only when "implementation
//     and verification are complete" — which, on this lifecycle, is precisely
//     when the change reaches a terminal status, so an OPEN one always blocks;
//   - not classified at all. E3(b) requires Gate 11 to EVALUATE the impact
//     classification, and there is nothing to evaluate on an unclassified change.
//     Letting those through would make the rule optional. CONFIRMED by Round 4
//     question 34(b), 2026-08-24: "An unclassified open Change Control must
//     block Gate 11."
export function gate11HardBlockingChanges(project: ProjectData, changes: ChangeRecord[]): ChangeRecord[] {
  return projectChanges(project, changes).filter((change) => {
    if (!isChangeStillOpen(change)) return false;
    const impact = areas(change);
    if (impact.length === 0) return true;
    if (impact.includes(CHANGE_IMPACT_LAUNCH) || RISK_LEVELS_HARD_BLOCKING.includes(change.riskLevel)) return true;
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
    if (impact.includes(CHANGE_IMPACT_LAUNCH) || RISK_LEVELS_HARD_BLOCKING.includes(change.riskLevel)) return false;
    if (impact.some((a) => CHANGE_IMPACT_BLOCKING_AREAS.includes(a))) return false;
    return impact.includes(CHANGE_IMPACT_ADMIN);
  });
}
