// Round 5 question 27 (SME answer, 2026-11-05): who accepts a phase's pre-work, and how entries are marked.
//
//   "The accountable subject-area owner accepts the relevant entries when that phase/gate opens. The phase review owner coordinates acceptance. A Project
//    Lead may accept only for areas where that person also has the required authority; project leadership alone cannot accept Safety/Regulatory
//    conclusions. Mark individual entries with author/date and pre-work status, then accepted/updated/rejected, reviewer and date. A batch acceptance is
//    acceptable only with an explicit list of the entries and authorised reviewer coverage."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q35]`): an "entry" is one saved table of the phase — a checklist section, a
// requirement section, a gate's Key Gate Checks, or a register — recorded when it is saved while the phase is not open yet; its accountable owner is the
// person assigned to the area that owns it on this project; the phase review owner and the Lead may accept an entry that is not a Safety or Regulatory
// conclusion (the area is Regulatory, Quality & GMP or Safety), and an accountable owner always may; a phase has no pre-work left to review when no entry
// is still waiting.
import { GATES } from '../config/gates';
import { PHASE_CONFIGS } from '../config/phases';
import { findNavGroupForRegister, getRegisterConfig } from '../config/registers';
import { ownerName } from '../config/reviewers';
import type { PreWorkEntry, PreWorkStatus, ProjectData } from '../types';

export const PRE_WORK_DECISIONS = ['Accepted', 'Updated', 'Rejected'] as const;
export type PreWorkDecision = (typeof PRE_WORK_DECISIONS)[number];
// Where a decision that needs a reason says so; "Updated" = accepted after the reviewer corrected the entry, "Rejected" = to be redone.
export const PRE_WORK_DECISIONS_NEEDING_NOTE: readonly string[] = ['Updated', 'Rejected'];

// The areas whose conclusions project leadership alone cannot accept: Regulatory, Quality & GMP (which owns the formulation safety sheets) and Safety.
export const SAFETY_REGULATORY_OWNER_ROLES: readonly string[] = ['regulatory', 'quality-gmp', 'safety-scientific', 'safety-study-reviewer'];

const norm = (v: string | undefined) => (v ?? '').trim().toLowerCase();

// The phases a gate reference ('04', '04/07', '08-09') belongs to; ALL or nothing belongs to none.
export function phasesOfGateRef(gateRef: string | undefined): number[] {
  if (!gateRef || gateRef === 'ALL') return [];
  const phases = new Set<number>();
  for (const part of gateRef.split(/[\/-]/)) {
    const gate = GATES.find((g) => g.id === `SG${part.trim().padStart(2, '0')}`);
    if (gate) phases.add(gate.phase);
  }
  return [...phases];
}

export function phaseOfChecklistSection(key: string): number | undefined {
  const hit = Object.entries(PHASE_CONFIGS).find(([, c]) => c.checklistSections.some((s) => s.key === key));
  return hit ? Number(hit[0]) : undefined;
}

export function phaseOfRequirementSection(key: string): number | undefined {
  const hit = Object.entries(PHASE_CONFIGS).find(([, c]) => c.requirementSections.some((s) => s.key === key));
  return hit ? Number(hit[0]) : undefined;
}

export function preWorkEntries(project: Pick<ProjectData, 'preWorkEntries'>, phase: number): PreWorkEntry[] {
  return (project.preWorkEntries ?? []).filter((e) => e.phase === phase);
}

// Entries still waiting for a decision, or rejected and not yet redone: while any exists the phase's pre-work is not settled.
export function pendingPreWork(project: Pick<ProjectData, 'preWorkEntries'>, phase: number): PreWorkEntry[] {
  return preWorkEntries(project, phase).filter((e) => e.status === 'Pre-work' || e.status === 'Rejected');
}

export function preWorkStatusOf(project: Pick<ProjectData, 'preWorkEntries'>, kind: PreWorkEntry['kind'], key: string): PreWorkEntry | undefined {
  return (project.preWorkEntries ?? []).find((e) => e.kind === kind && e.key === key);
}

// The role that owns the entry's subject area on this project.
export function preWorkOwnerRole(entry: Pick<PreWorkEntry, 'kind' | 'key' | 'phase'>): string | undefined {
  if (entry.kind === 'register') {
    const config = getRegisterConfig(entry.key);
    const spec = config?.reviewOwner ?? (config ? findNavGroupForRegister(config.key)?.reviewOwner : undefined);
    if (spec) return spec.owner.role;
  }
  return PHASE_CONFIGS[entry.phase]?.reviewOwner?.owner.role;
}

export function isSafetyRegulatoryEntry(entry: Pick<PreWorkEntry, 'kind' | 'key' | 'phase'>): boolean {
  const role = preWorkOwnerRole(entry);
  return !!role && SAFETY_REGULATORY_OWNER_ROLES.includes(role);
}

export interface PreWorkActor {
  displayName: string;
  isAdmin: boolean;
}

// Why this person may not decide this entry, or undefined when they may.
export function preWorkDecisionProblem(project: ProjectData, entry: PreWorkEntry, actor: PreWorkActor): string | undefined {
  const reviewers = project.identity.reviewers ?? {};
  const role = preWorkOwnerRole(entry);
  const accountable = role ? (reviewers[role] ?? '').trim() : '';
  const me = norm(actor.displayName);
  if (accountable !== '' && norm(accountable) === me) return undefined;
  if (isSafetyRegulatoryEntry(entry)) {
    return `"${entry.label}" is a Safety or Regulatory area: only ${accountable || 'its accountable owner (nobody is assigned yet)'} may decide it — project leadership alone cannot`;
  }
  const phaseOwner = (ownerName(PHASE_CONFIGS[entry.phase]?.reviewOwner, reviewers) ?? '').trim();
  const lead = (project.identity.projectLead ?? '').trim();
  if ((phaseOwner !== '' && norm(phaseOwner) === me) || (lead !== '' && norm(lead) === me) || actor.isAdmin) return undefined;
  return `"${entry.label}" is decided by ${accountable || 'its accountable owner'}, the phase's review owner (${phaseOwner || 'not assigned'}) or the project's Lead`;
}

export function preWorkStatusTone(status: PreWorkStatus): string {
  return status === 'Accepted' || status === 'Updated' ? 'c-tag-ok' : status === 'Rejected' ? 'c-tag-bad' : 'c-tag-warn';
}
