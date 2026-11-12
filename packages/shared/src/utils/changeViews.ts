// Round 5 question 11 (SME answer, 2026-11-05): "Make the formulation register a filtered view with its specialist fields and permissions."
//
// A change-control VIEW is a register whose rows are the master Change Control records of one kind, with an OVERLAY of that kind's own
// fields. The base data of every row — its title, SKU, who asked for it and when, why, whether it is closed — is read from the master
// record on every read and is NEVER stored a second time on the view's row, so the two books cannot disagree. What the view's row
// stores is only what the master record has no place for: for the Formulation Change Register, the action of each department, the
// re-registration question and the Final Approver's decision and signature.
//
// The view is generic: a register opts in with `RegisterConfig.changeView`, naming which master records belong to it (`appliesTo`) and
// which of its columns come from the master record (`base`). The Formulation Change Register is the first; an artwork view follows the
// same shape. That an artwork view works this way is our reading, the answer names only the formulation one. [ASSUMPTION: R6-Q17]
import type { ChangeRecord, ProjectData, RegisterRow } from '../types';
import { getChangeTrigger, isChangeOpen } from '../config/changeTriggers';

export interface ChangeViewConfig {
  // Which master change records this view shows.
  appliesTo: 'formulation';
  // A column of the view's row -> the field of the master record it reads. `closed` is not a stored field; see `CLOSED_COLUMN`.
  base: Record<string, keyof ChangeRecord>;
  // The column holding the master record's number on an overlay row.
  masterColumn: string;
  // The column holding the alias number the old register used for this change (an FC- id).
  aliasColumn: string;
}

// The column that reads "is the change closed?" from the master record's status.
export const CLOSED_COLUMN = 'closed';

export const FORMULATION_CHANGE_VIEW: ChangeViewConfig = {
  appliesTo: 'formulation',
  base: {
    changeTitle: 'trigger',
    productFamilySku: 'productSku',
    requestedByNpd: 'requestedBy',
    dateRequested: 'dateRequested',
    explanation: 'explanation',
    reasons: 'reasons',
    changedBy: 'changedBy',
    communicatedToMarket: 'communicatedToMarket',
    communicationAcknowledgedBy: 'communicationAcknowledgedBy',
  },
  masterColumn: 'masterChangeId',
  aliasColumn: 'changeId',
};

// The two affected areas that are about the formula itself, plus every trigger the catalogue files under Formula. Which master
// records belong in the Formulation Change Register is our reading of its own description ("every formulation change"), not a list the
// review team gave. [ASSUMPTION: R6-Q17]
const FORMULATION_AREAS = ['Formula / ingredient', 'Formula version / pH / process'];

export function isFormulationChange(change: ChangeRecord): boolean {
  if (FORMULATION_AREAS.includes(change.affectedArea)) return true;
  if (getChangeTrigger(change.triggerId)?.category === 'Formula') return true;
  return (change.aliasIds ?? []).some((id) => id.startsWith('FC-'));
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The master record an overlay row belongs to.
export function masterOf(view: ChangeViewConfig, row: RegisterRow, project: ProjectData): ChangeRecord | undefined {
  const master = text(row[view.masterColumn]);
  if (master !== '') return project.changes.find((c) => c.changeId === master);
  const alias = text(row[view.aliasColumn]);
  return alias === '' ? undefined : project.changes.find((c) => (c.aliasIds ?? []).includes(alias));
}

// The overlay rows with their base columns filled from the master record. A row with no master (an isolated legacy row) keeps whatever it
// stored: it counts for nothing as a link (changeLinks.ts) and is flagged on the register, never dropped.
export function applyChangeView(view: ChangeViewConfig, rows: RegisterRow[], project: ProjectData): RegisterRow[] {
  return rows.map((row) => {
    const master = masterOf(view, row, project);
    if (!master) return row;
    const out: RegisterRow = { ...row, [view.masterColumn]: master.changeId };
    for (const [column, field] of Object.entries(view.base)) {
      const value = master[field];
      out[column] = Array.isArray(value) ? value.join(', ') : (value ?? '');
    }
    out[CLOSED_COLUMN] = isChangeOpen(master.status) ? 'No' : 'Yes';
    return out;
  });
}

// What a save of the view's rows must NOT write back: the base columns are the master record's, so a stored copy would go stale.
export function baseColumnsOf(view: ChangeViewConfig): string[] {
  return [...Object.keys(view.base), CLOSED_COLUMN];
}
