// Round 5 question 11(4) (SME answer, 2026-11-05): what makes a link to a change record VALID.
//
//   "A valid link resolves to the right project/product and relevant scope, with a reviewable status and owner. An FC row counts
//    only if it resolves to the master CHG; an isolated FC row does not. Status depends on purpose: an assessment can link an
//    open CHG, implementation needs an approved CHG, and closure needs verified final disposition. A historical completed CHG
//    can be a valid reference. A rejected/cancelled record cannot authorise implementation. Preserve imported text and flag
//    unresolved legacy references rather than discarding them."
//
// The master record is the CHG; an FC- number is an ALIAS of it (`ChangeRecord.aliasIds`), so a link typed or picked as FC-001 resolves
// to the CHG it belongs to. What each purpose accepts, and the fact that "the right project/product and relevant scope" is read
// as the record belonging to this project (we do not compare the typed product code or judge scope), are [ASSUMPTION: R6-Q17].
import type { ChangeRecord, ProjectData, RegisterRow } from '../types';
import { REGISTER_CONFIGS, type RegisterConfig } from '../config/registers';
import { isChangeDispositionRecorded } from './changeImpact';
import { CHANGE_STATUSES_NEEDING_TRIAGE, isTriageRecorded } from './changeTriage';

export type ChangeLinkPurpose = 'reference' | 'assessment' | 'implementation' | 'closure';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The master record a reference points at: its own CHG number, or an FC- alias of it.
export function resolveChangeRef(changes: readonly ChangeRecord[], ref: string): ChangeRecord | undefined {
  const wanted = text(ref);
  if (wanted === '') return undefined;
  return changes.find((c) => c.changeId === wanted || (c.aliasIds ?? []).includes(wanted));
}

// Why `change` cannot serve `purpose`, or undefined when it can.
export function changeLinkProblem(change: ChangeRecord | undefined, purpose: ChangeLinkPurpose): string | undefined {
  if (!change) return 'it is not a Change Control record on this project';
  if (purpose === 'reference') return undefined;
  if (text(change.owner) === '') return 'the change has no owner, so its status cannot be reviewed';
  if (purpose === 'assessment') {
    if (change.status === 'Rejected' || change.status === 'Cancelled' || change.status === 'Superseded') {
      return `the change is ${change.status}, so there is nothing left to assess against it`;
    }
    return undefined;
  }
  if (purpose === 'implementation') {
    if (!CHANGE_STATUSES_NEEDING_TRIAGE.includes(change.status)) return `the change is ${change.status}, not yet approved to implement`;
    if (!isTriageRecorded(change)) return 'the change has not had its impact assessed';
    return undefined;
  }
  // closure
  if (change.status !== 'Completed') return `the change is ${change.status}, not Completed`;
  if (!isChangeDispositionRecorded(change)) return 'the change has no recorded final disposition';
  return undefined;
}

// Every reference — change ids AND their aliases — that is valid for `purpose` on this project; what the existing link checks take as
// their list of acceptable ids.
export function validChangeRefs(project: ProjectData, purpose: ChangeLinkPurpose): string[] {
  const out: string[] = [];
  for (const c of project.changes) {
    if (c.projectId && c.projectId !== project.identity.id) continue;
    if (changeLinkProblem(c, purpose) !== undefined) continue;
    out.push(c.changeId, ...(c.aliasIds ?? []));
  }
  return out;
}

// A reference nobody can resolve — a typed legacy value, an FC row with no master. Flagged, never discarded (the answer's last line).
export function unresolvedChangeRefs(project: ProjectData, refs: readonly string[]): string[] {
  return refs.map(text).filter((r) => r !== '' && !resolveChangeRef(project.changes, r));
}

// The columns of a register that hold a reference to a change record.
export function changeRefColumns(config: RegisterConfig): string[] {
  return config.columns.filter((c) => c.type === 'changeRef').map((c) => c.key);
}

// What a register row holds in its change-reference columns that matches no change record of this project: typed before the column was a picker, an
// FC- row with no master, a record since deleted. "Preserve imported text and flag unresolved legacy references rather than discarding them" — so
// these are listed for a person to resolve, never removed. [ASSUMPTION: R6-Q17]
export interface LegacyChangeReference {
  registerKey: string;
  registerTitle: string;
  row: number;
  column: string;
  value: string;
}
export function legacyChangeReferences(project: ProjectData): LegacyChangeReference[] {
  const out: LegacyChangeReference[] = [];
  for (const config of REGISTER_CONFIGS) {
    const columns = changeRefColumns(config);
    if (columns.length === 0) continue;
    (project.registers[config.key] ?? []).forEach((row, index) => {
      for (const column of columns) {
        const value = text(row[column]);
        if (value !== '' && !resolveChangeRef(project.changes, value)) {
          out.push({ registerKey: config.key, registerTitle: config.title, row: index, column, value });
        }
      }
    });
  }
  return out;
}

// The values of change-reference columns a save is NEW or CHANGED in — the ones that must resolve. A value the register already holds is left alone
// even when it no longer resolves: refusing it would make an old row impossible to save, and it is flagged instead.
export function newChangeReferences(config: RegisterConfig, committed: readonly RegisterRow[], incoming: readonly RegisterRow[]): { row: number; column: string; value: string }[] {
  const out: { row: number; column: string; value: string }[] = [];
  for (const column of changeRefColumns(config)) {
    const had = new Set(committed.map((r) => text(r[column])));
    incoming.forEach((row, index) => {
      const value = text(row[column]);
      if (value !== '' && !had.has(value)) out.push({ row: index, column, value });
    });
  }
  return out;
}

// What a change reference in a register row is FOR (Round 5 question 11(4)): "an assessment can link an open CHG, implementation needs an approved CHG,
// and closure needs verified final disposition". Most columns only point at the change for context ('reference') or for an assessment. On Ingredient
// Substitution Evidence the row says which: a decision to proceed with the substitution is an implementation and needs a change that is approved and
// whose impact has been assessed; a row marked Complete is a closure and needs a Completed change with its final disposition. [ASSUMPTION: R6-Q17]
export function changeRefPurposeFor(registerKey: string, column: string, row: RegisterRow): ChangeLinkPurpose {
  if (registerKey === 'ingredientSubstitution' && column === 'linkedChangeId') {
    if (text(row.status) === 'Complete') return 'closure';
    if (text(row.decision) === 'Approved' || text(row.decision) === 'Conditional') return 'implementation';
    return 'assessment';
  }
  if (registerKey === 'productDevelopmentIterations' || registerKey === 'releasedLabelRegister') return 'assessment';
  return 'reference';
}

// Why a reference in a row cannot serve its purpose, or undefined when it can (also undefined for a blank value).
export function changeRefProblem(project: ProjectData, registerKey: string, column: string, row: RegisterRow): string | undefined {
  const value = text(row[column]);
  if (value === '') return undefined;
  const purpose = changeRefPurposeFor(registerKey, column, row);
  return changeLinkProblem(resolveChangeRef(project.changes, value), purpose);
}
