import type { GateRecord, ProjectData } from '../types';
import { GATES } from '../config/gates';

// Progression rules (soft-conditions model):
//  - A gate is PASSED only when its Stage status is Complete AND a positive gate
//    decision (Proceed / Proceed with Conditions) is recorded.
//  - A phase is COMPLETE only when all its gates are passed AND the "Approved by"
//    sign-off has been signed.
//  - Gates unlock strictly in order: a gate opens only when every earlier gate is
//    passed and every earlier phase is approved.
//  - Backtrack: recording a Backtrack decision on a gate reopens an earlier gate
//    (and everything in between) for rework, un-approving any phase whose closing
//    gate falls inside the reopened range. There is no forward "skip" — only
//    Backtrack (go back) or Hold (pause) are valid exceptions to strict order.

const PASSING_DECISIONS = ['Proceed', 'Proceed with Conditions'];

export function gateIndex(gateId: string): number {
  return GATES.findIndex((g) => g.id === gateId);
}

export function isGatePassed(gates: GateRecord[], gateId: string): boolean {
  const r = gates.find((g) => g.gateId === gateId);
  return r?.status === 'Complete' && !!r.decision && PASSING_DECISIONS.includes(r.decision);
}

// Work is marked Complete but a passing decision (Proceed / Proceed with Conditions)
// has not been recorded yet — the gate is done but still waiting on a decision.
export function isAwaitingDecision(gates: GateRecord[], gateId: string): boolean {
  const r = gates.find((g) => g.gateId === gateId);
  return r?.status === 'Complete' && !isGatePassed(gates, gateId);
}

export function isPhaseApproved(project: ProjectData, phase: number): boolean {
  const closure = project.phaseClosures[phase];
  if (!closure) return false;
  const approved = closure.signOffs.find((s) => s.role === 'Approved by');
  return !!(approved?.name?.trim() || approved?.initials?.trim());
}

export function isLastGateOfPhase(index: number): boolean {
  const meta = GATES[index];
  return !!meta && GATES[index + 1]?.phase !== meta.phase;
}

// Index of the gate currently open for work: the first gate that is not yet passed,
// or a phase-closing gate that is passed but whose phase is not yet approved.
export function currentGateIndex(project: ProjectData): number {
  for (let i = 0; i < GATES.length; i++) {
    const meta = GATES[i];
    if (!isGatePassed(project.gates, meta.id)) return i;
    if (isLastGateOfPhase(i) && !isPhaseApproved(project, meta.phase)) return i;
  }
  return GATES.length;
}

export function isGateUnlocked(project: ProjectData, gateId: string): boolean {
  return gateIndex(gateId) <= currentGateIndex(project);
}

export type GateState = 'passed' | 'current' | 'locked' | 'hold' | 'gap';

export function gateState(project: ProjectData, gateId: string): GateState {
  const record = project.gates.find((g) => g.gateId === gateId);
  if (record?.status === 'Hold') return 'hold';
  if (record?.status === 'Gap') return 'gap';
  if (isGatePassed(project.gates, gateId)) return 'passed';
  const idx = gateIndex(gateId);
  const current = currentGateIndex(project);
  return idx > current ? 'locked' : 'current';
}

export type PhaseProgressState = 'completed' | 'current' | 'locked';

export interface PhaseProgress {
  state: PhaseProgressState;
  passedGates: number;
  totalGates: number;
  approved: boolean;
  awaitingApproval: boolean; // all gates passed but not yet signed off
}

export function phaseProgress(project: ProjectData, phase: number): PhaseProgress {
  const phaseGates = GATES.filter((g) => g.phase === phase);
  const passedGates = phaseGates.filter((g) => isGatePassed(project.gates, g.id)).length;
  const approved = isPhaseApproved(project, phase);
  const allPassed = passedGates === phaseGates.length;
  const current = currentGateIndex(project);
  const firstIdx = gateIndex(phaseGates[0].id);

  let state: PhaseProgressState;
  if (allPassed && approved) state = 'completed';
  else if (current >= firstIdx) state = 'current';
  else state = 'locked';

  return {
    state,
    passedGates,
    totalGates: phaseGates.length,
    approved,
    awaitingApproval: allPassed && !approved,
  };
}

export function hasReachedPhase(project: ProjectData, phase: number): boolean {
  return phaseProgress(project, phase).state !== 'locked';
}

export function positionSentence(project: ProjectData): string {
  const idx = currentGateIndex(project);
  if (idx >= GATES.length) return 'All 12 gates are complete.';
  const meta = GATES[idx];
  return `The project is currently at Gate ${meta.number} (Phase ${meta.phase}).`;
}
