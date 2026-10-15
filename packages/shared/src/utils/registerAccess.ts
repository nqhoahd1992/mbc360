// Who may change the important cells of a register on a project (SW-34, project owner 2026-10-15; plan:
// docs/plans/Permission_Model_Plan.md).
//
// Inside a project, authority comes from the project's own ASSIGNMENT, not from a role grid:
//   assigned people of a register = its Review owner, Co-review and Co-sign people on this project (Project Manager co-signs
//   every register) + the project Lead + an administrator + the Reviewer named on a row, for that row only.
// Simple information (text, dates, numbers, links, notes) stays open to every user of the project, which is what the review
// team asked for ("users may contribute evidence without having approval rights"). IMPORTANT cells — a status, an assessment, an
// approval tick, a signature, the person who did something, and adding or deleting a row — are the assigned people's alone.
//
// One function decides it, read by the server (which refuses) and by the tables (which grey the cell out), so the two cannot
// disagree. A software rule (how the app protects data), so it is not put to the review team.
import type { ProjectData, RegisterRow } from '../types';
import { findNavGroupForRegister, type RegisterColumn, type RegisterConfig } from '../config/registers';

// Three system sheets with no Review owner: the feedback sheet is open to everyone (a feedback sheet only some people can write
// to defeats it); the other two are reference sheets, so only the Lead and administrators change them.
const OPEN_REGISTERS: readonly string[] = ['systemFeedback'];

// A person-column that records an act ("Verified by", "Reviewer"), as opposed to one that records who is responsible
// ("Owner"), which is plain information.
const ACT_PERSON_LABEL = /reviewer|verif|approv|confirm|authoris|authoriz|assessed/i;

export function isSensitiveColumn(column: RegisterColumn): boolean {
  if (column.sensitive !== undefined) return column.sensitive;
  if (['select', 'multiSelect', 'checkbox', 'signature'].includes(column.type)) return true;
  return column.type === 'user' && ACT_PERSON_LABEL.test(column.label);
}

const norm = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Display names of the people assigned to a register on this project.
export function registerAssignedPeople(project: ProjectData, config: RegisterConfig): Set<string> {
  const names = new Set<string>();
  const spec = config.reviewOwner ?? findNavGroupForRegister(config.key)?.reviewOwner;
  const reviewers = project.identity.reviewers ?? {};
  const roles = spec
    ? [spec.owner.role, ...(spec.coReview ?? []).map((c) => c.role), ...(spec.coSign ?? []).map((c) => c.role), 'project-manager']
    : [];
  for (const role of roles) {
    const name = norm(reviewers[role]);
    if (name) names.add(name);
  }
  const lead = norm(project.identity.projectLead);
  if (lead) names.add(lead);
  return names;
}

export interface RegisterActor {
  displayName: string;
  isAdmin: boolean;
}

export function registerIsOpenToAll(config: RegisterConfig): boolean {
  return OPEN_REGISTERS.includes(config.key);
}

// May this person change important cells of the register's rows in general (assigned, Lead or admin)?
export function canChangeRegisterRows(project: ProjectData, config: RegisterConfig, actor: RegisterActor): boolean {
  if (registerIsOpenToAll(config) || actor.isAdmin) return true;
  return registerAssignedPeople(project, config).has(norm(actor.displayName));
}

// May this person change the important cells of THIS row? The Reviewer named on the row counts for that row only.
export function canChangeRegisterRow(project: ProjectData, config: RegisterConfig, row: RegisterRow | undefined, actor: RegisterActor): boolean {
  if (canChangeRegisterRows(project, config, actor)) return true;
  return !!row && norm(row.reviewer) !== '' && norm(row.reviewer) === norm(actor.displayName);
}

// Why a person cannot change an important cell, in words for the screen and the API's 403.
export function registerAccessReason(config: RegisterConfig): string {
  return registerIsOpenToAll(config)
    ? ''
    : 'Only the people assigned to this register on the project (its Review owner, Co-review and Co-sign), the project Lead and administrators change its statuses, assessments, approvals and rows; everyone else can read it and add plain information';
}

// What a save would change that this person may not: important cells of rows they have no access to, and added or deleted rows.
// Rows are matched by their record id where they have one, else by group name for fixed registers, else by position.
export function registerAccessViolations(
  project: ProjectData,
  config: RegisterConfig,
  committed: RegisterRow[],
  next: RegisterRow[],
  actor: RegisterActor,
): string[] {
  if (canChangeRegisterRows(project, config, actor)) return [];
  const out: string[] = [];
  const idKey = (r: RegisterRow) => String(r.recordId ?? '').trim();
  const find = (row: RegisterRow, index: number) =>
    (idKey(row) && committed.find((c) => idKey(c) === idKey(row))) ||
    (config.mode === 'fixed' && row.ingredientGroup !== undefined
      ? committed.find((c) => c.ingredientGroup === row.ingredientGroup)
      : undefined) ||
    committed[index];
  if (next.length > committed.length) out.push(`${next.length - committed.length} row(s) added`);
  if (next.length < committed.length) out.push(`${committed.length - next.length} row(s) deleted`);
  next.forEach((row, index) => {
    const old = find(row, index);
    if (old && canChangeRegisterRow(project, config, old, actor)) return;
    for (const column of config.columns) {
      if (column.editable === false || !isSensitiveColumn(column)) continue;
      const before = old?.[column.key];
      const after = row[column.key];
      const same = String(before ?? '') === String(after ?? '') || (before == null && after === false);
      if (!same && old) out.push(`row ${index + 1} "${column.label}"`);
    }
  });
  return out;
}
