// Consistency rules between the Gate 02 Target Users checklist and the
// Vulnerable-User Assessment register (2026-08-11, user-requested). Pure
// functions so the UI and the API enforce exactly the same thing — the same
// guard-parity principle as claimEvidence.ts.
//
// B5 keeps the two records separate on purpose: selecting a target user is not
// the same act as recognising a vulnerable-use context. Separate, though, must
// not mean free to contradict each other, which is what these functions check.
import type { ProjectData, RegisterRow } from '../types';
import { NO_VULNERABLE_GROUP, TARGET_USER_TO_VULNERABLE_GROUP } from '../config/vulnerableGroups';

export const VULNERABLE_REGISTER = 'vulnerableUserAssessment';
const GROUP = 'vulnerableGroup';

const groupOf = (row: RegisterRow): string => String(row[GROUP] ?? '').trim();

function selectedTargetUsers(project: ProjectData): string[] {
  return (project.checklists['targetUsers'] ?? []).filter((i) => i.selected).map((i) => i.label);
}

// Groups the Gate 02 selections imply — what `vulnerableGroupsCovered` requires a
// row for, and what the register page offers as a one-click preset.
export function expectedVulnerableGroups(project: ProjectData): string[] {
  const groups = selectedTargetUsers(project)
    .map((label) => TARGET_USER_TO_VULNERABLE_GROUP[label])
    .filter((g): g is string => !!g);
  return [...new Set(groups)];
}

// Which selected target users a given group came from — used to explain a block
// ("Breastfeeding is not selected as a target user") and to find out whether a
// tick can still be removed.
export function targetUsersForGroup(group: string): string[] {
  return Object.entries(TARGET_USER_TO_VULNERABLE_GROUP)
    .filter(([, g]) => g === group)
    .map(([user]) => user);
}

// A target user cannot be un-ticked while an assessment row depends on it — the
// same shape as the Supplier & RM Evidence row that cannot be deleted while a
// Formula BOM line references it. Returns the labels that are pinned, with the
// group doing the pinning.
export function targetUsersPinnedByAssessment(project: ProjectData): { label: string; group: string }[] {
  const recorded = new Set((project.registers[VULNERABLE_REGISTER] ?? []).map(groupOf));
  const pinned: { label: string; group: string }[] = [];
  for (const label of selectedTargetUsers(project)) {
    const group = TARGET_USER_TO_VULNERABLE_GROUP[label];
    if (!group || !recorded.has(group)) continue;
    // Two target users can share a group (Child 2+ / Child 3+ -> Young child).
    // Only the LAST one standing is pinned: while the other is still ticked the
    // row keeps its justification, so removing this tick breaks nothing.
    const siblingsStillTicked = targetUsersForGroup(group).filter(
      (u) => u !== label && selectedTargetUsers(project).includes(u),
    );
    if (siblingsStillTicked.length === 0) pinned.push({ label, group });
  }
  return pinned;
}

// One row per group. Two rows for Pregnancy are not two assessments, they are one
// assessment entered twice — and they would disagree the moment either changes.
export function duplicateVulnerableGroups(rows: RegisterRow[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const group = groupOf(row);
    if (!group) continue;
    if (seen.has(group)) duplicates.add(group);
    seen.add(group);
  }
  return [...duplicates];
}

export interface VulnerableRowProblem {
  group: string;
  reason: string;
  hard: boolean;
}

// The reverse direction of `vulnerableGroupsCovered`: a group recorded here that
// the Gate 02 selections do not support.
//
// Deliberately split into hard and soft, because our mapping is not equally
// certain (see TARGET_USER_TO_VULNERABLE_GROUP's three levels):
//
//   HARD — the group and the target-user option are the SAME WORD (Pregnancy,
//     Breastfeeding, Postpartum, Infant 0+). Recording "Breastfeeding" while
//     Breastfeeding is not a target user is a flat contradiction, whoever reads
//     it. Blocks the save.
//   SOFT — everything else. "Young child", "Sensitive or compromised skin",
//     "Oncology…" and "Renal…" can each legitimately arise from a target user we
//     did NOT map (a family product reaching children; eczema-prone skin) or from
//     a Safety/Regulatory judgement, which B5's own "Other population identified
//     by Safety or Regulatory" exists for. Hard-blocking those would turn our own
//     unconfirmed reading into a rule the user cannot work around, which is the
//     mistake the pregnancy caution screen already made once. Warn instead.
//
// "No vulnerable-user group identified" is an absence: it cannot sit beside a row
// naming a group, in either direction. That one is hard, and needs no mapping.
export function vulnerableRowProblems(project: ProjectData, rows: RegisterRow[]): VulnerableRowProblem[] {
  const selected = new Set(selectedTargetUsers(project));
  const groups = rows.map(groupOf).filter((g) => g !== '');
  const problems: VulnerableRowProblem[] = [];

  if (groups.includes(NO_VULNERABLE_GROUP) && groups.some((g) => g !== NO_VULNERABLE_GROUP)) {
    problems.push({
      group: NO_VULNERABLE_GROUP,
      reason: 'records that no vulnerable group was identified, while another row names one',
      hard: true,
    });
  }

  for (const group of [...new Set(groups)]) {
    if (group === NO_VULNERABLE_GROUP) continue;
    const sources = targetUsersForGroup(group);
    if (sources.length === 0) continue; // not mapped at all — nothing to contradict
    if (sources.some((u) => selected.has(u))) continue;
    const identical = sources.includes(group);
    problems.push({
      group,
      reason: identical
        ? `is not selected as a Gate 02 target user`
        : `has no matching Gate 02 target user (${sources.join(' or ')}) — confirm this comes from a Safety or Regulatory judgement`,
      hard: identical,
    });
  }
  return problems;
}

// What blocks a save: duplicates plus the hard contradictions above.
export function vulnerableSaveBlockers(project: ProjectData, rows: RegisterRow[]): string[] {
  const blockers = duplicateVulnerableGroups(rows).map(
    (g) => `"${g}" appears on more than one row — one row per group`,
  );
  for (const p of vulnerableRowProblems(project, rows)) {
    if (p.hard) blockers.push(`"${p.group}" ${p.reason}`);
  }
  return blockers;
}
