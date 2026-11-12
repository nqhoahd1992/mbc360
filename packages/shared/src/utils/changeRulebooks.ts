// Round 5 question 11(1) (SME answer, 2026-11-05): "Formula Change Control — controlled trigger/approval rulebook. Occurrence-specific old/new versions and
// status belong to CHG-linked assessments." and the same for Artwork Change Control. Those two sheets list the TYPES of change (a trigger, its examples,
// who signs); what happened in one occurrence — the old and new version, the status, the Change Control number — is on the change record. So each
// rulebook row shows the changes of its type, read from the Change Control log.
//
// A row is matched to a trigger of the catalogue by its name with punctuation ignored (the two lists drifted apart by punctuation alone). A row whose
// name matches no trigger shows no changes rather than a guess.
import type { ChangeRecord, ProjectData, RegisterRow } from '../types';
import { CHANGE_TRIGGERS, type ChangeTriggerCategory } from '../config/changeTriggers';

export const RULEBOOK_CATEGORY: Record<string, ChangeTriggerCategory> = {
  formulaChangeControl: 'Formula',
  artworkChangeControl: 'Artwork / Label',
};

const norm = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function rulebookTriggerId(category: ChangeTriggerCategory, rowTrigger: string): string | undefined {
  const wanted = norm(rowTrigger);
  if (wanted === '') return undefined;
  return CHANGE_TRIGGERS.find((t) => t.category === category && norm(t.label) === wanted)?.id;
}

export function describeChange(c: ChangeRecord): string {
  const version = [c.oldVersion, c.newVersion].filter(Boolean).join(' → ');
  return [c.changeId, version, c.status].filter(Boolean).join(' · ');
}

export function changesOfRulebookRow(project: ProjectData, registerKey: string, row: RegisterRow): ChangeRecord[] {
  const category = RULEBOOK_CATEGORY[registerKey];
  if (!category) return [];
  const triggerId = rulebookTriggerId(category, String(row.trigger ?? ''));
  if (!triggerId) return [];
  return project.changes.filter((c) => (!c.projectId || c.projectId === project.identity.id) && c.triggerId === triggerId);
}

export function applyRulebookChanges(registerKey: string, rows: RegisterRow[], project: ProjectData): RegisterRow[] {
  if (!RULEBOOK_CATEGORY[registerKey]) return rows;
  return rows.map((row) => {
    const changes = changesOfRulebookRow(project, registerKey, row);
    return { ...row, openChanges: changes.length > 0 ? changes.map(describeChange).join('\n') : '—' };
  });
}
