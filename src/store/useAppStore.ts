import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type {
  AngleRow,
  BomLine,
  CapaRecord,
  ChangeRecord,
  ChecklistItem,
  CostingInputs,
  EvidenceItem,
  FeedbackEntry,
  GateCheck,
  GateRecord,
  PackagingBomLine,
  ProjectData,
  ProjectIdentity,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '../types';
import { createEmptyProject, createEmptyRegisterRow } from './factory';
import { seedChanges, seedProjects } from '../data/seed';
import { gateIndex, isGateUnlocked, isLastGateOfPhase } from '../utils/gateProgress';
import { GATES } from '../config/gates';

type RegisterGrouping = 'function' | 'department';

interface AppState {
  projects: ProjectData[];
  changes: ChangeRecord[];

  // UI preference: how the Evidence Registers menu is grouped.
  registerGrouping: RegisterGrouping;
  setRegisterGrouping: (grouping: RegisterGrouping) => void;

  createProject: (identity: ProjectIdentity) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updater: (p: ProjectData) => ProjectData) => void;

  setGate: (id: string, gateId: string, patch: Partial<GateRecord>) => void;
  backtrackGate: (id: string, fromGateId: string, toGateId: string, reason?: string) => void;
  setChecklistItem: (id: string, section: string, index: number, patch: Partial<ChecklistItem>) => void;
  setRequirementItem: (id: string, section: string, index: number, patch: Partial<RequirementItem>) => void;
  setGateCheck: (id: string, index: number, patch: Partial<GateCheck>) => void;
  setAngle: (id: string, phase: number, index: number, patch: Partial<AngleRow>) => void;
  setSignOff: (id: string, phase: number, index: number, patch: Partial<SignOff>) => void;
  setClosureField: (id: string, phase: number, field: 'evidenceSummary' | 'nextAction' | 'nextDueDate' | 'nextOwner', value: string) => void;

  setBomLine: (id: string, index: number, patch: Partial<BomLine>) => void;
  addBomLine: (id: string) => void;
  removeBomLine: (id: string, index: number) => void;
  setCosting: (id: string, patch: Partial<CostingInputs>) => void;

  setPackagingBomLine: (id: string, index: number, patch: Partial<PackagingBomLine>) => void;
  addPackagingBomLine: (id: string) => void;
  removePackagingBomLine: (id: string, index: number) => void;

  setRegisterRow: (
    id: string,
    registerKey: string,
    index: number,
    key: string,
    value: string | number | boolean | undefined,
  ) => void;
  addRegisterRow: (id: string, registerKey: string) => void;
  removeRegisterRow: (id: string, registerKey: string, index: number) => void;

  setEvidenceItem: (id: string, index: number, patch: Partial<EvidenceItem>) => void;
  addCapa: (id: string, record: CapaRecord) => void;
  setCapa: (id: string, index: number, patch: Partial<CapaRecord>) => void;
  addFeedback: (id: string, entry: FeedbackEntry) => void;

  addChange: (record: ChangeRecord) => void;
  setChange: (changeId: string, patch: Partial<ChangeRecord>) => void;

  resetDemoData: () => void;
}

function patchArray<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => {
      const updateProject = (id: string, updater: (p: ProjectData) => ProjectData) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.identity.id === id ? updater(p) : p)),
        }));

      return {
        projects: seedProjects(),
        changes: seedChanges(),

        registerGrouping: 'department',
        setRegisterGrouping: (grouping) => set({ registerGrouping: grouping }),

        createProject: (identity) =>
          set((s) => ({ projects: [...s.projects, createEmptyProject(identity)] })),
        deleteProject: (id) =>
          set((s) => ({ projects: s.projects.filter((p) => p.identity.id !== id) })),
        updateProject,

        setGate: (id, gateId, patch) =>
          updateProject(id, (p) => {
            // Sequential rule: locked gates (after the current one) cannot change
            if (!isGateUnlocked(p, gateId)) return p;
            return {
              ...p,
              gates: p.gates.map((g) => (g.gateId === gateId ? { ...g, ...patch } : g)),
            };
          }),
        // Reopens gates from `toGateId` up to (but not including) `fromGateId` for
        // rework, and un-approves any phase whose closing gate falls in that range.
        // `fromGateId` keeps its own Backtrack decision as the permanent record of why.
        backtrackGate: (id, fromGateId, toGateId, reason) =>
          updateProject(id, (p) => {
            const fromIdx = gateIndex(fromGateId);
            const toIdx = gateIndex(toGateId);
            if (toIdx < 0 || fromIdx < 0 || toIdx >= fromIdx) return p;

            const dateStr = dayjs().format('YYYY-MM-DD');
            const fromMeta = GATES[fromIdx];
            const toMeta = GATES[toIdx];
            const appendNote = (existing: string | undefined, note: string) =>
              existing ? `${existing}\n${note}` : note;

            const gates = p.gates.map((g) => {
              const idx = gateIndex(g.gateId);
              if (idx >= toIdx && idx < fromIdx) {
                return { ...g, status: 'Not Started' as const, decision: undefined };
              }
              if (g.gateId === fromGateId) {
                const note = `[Backtrack ${dateStr}] Reopened Gate ${toMeta.number}${reason ? ` — ${reason}` : ''}.`;
                return { ...g, decision: 'Backtrack' as const, notes: appendNote(g.notes, note) };
              }
              if (g.gateId === toGateId) {
                const note = `[Backtrack ${dateStr}] Reopened for rework (from Gate ${fromMeta.number}).`;
                return { ...g, notes: appendNote(g.notes, note) };
              }
              return g;
            });

            // Un-approve any phase whose closing gate sits inside the reopened range,
            // since its "all gates passed" basis for approval no longer holds.
            const phaseClosures = { ...p.phaseClosures };
            for (let idx = toIdx; idx < fromIdx; idx++) {
              if (!isLastGateOfPhase(idx)) continue;
              const phase = GATES[idx].phase;
              const closure = phaseClosures[phase];
              if (!closure) continue;
              phaseClosures[phase] = {
                ...closure,
                signOffs: closure.signOffs.map((s) =>
                  s.role === 'Approved by' ? { role: s.role } : s,
                ),
              };
            }

            return { ...p, gates, phaseClosures };
          }),
        setChecklistItem: (id, section, index, patch) =>
          updateProject(id, (p) => ({
            ...p,
            checklists: { ...p.checklists, [section]: patchArray(p.checklists[section], index, patch) },
          })),
        setRequirementItem: (id, section, index, patch) =>
          updateProject(id, (p) => ({
            ...p,
            requirements: { ...p.requirements, [section]: patchArray(p.requirements[section], index, patch) },
          })),
        setGateCheck: (id, index, patch) =>
          updateProject(id, (p) => ({ ...p, gateChecks: patchArray(p.gateChecks, index, patch) })),
        setAngle: (id, phase, index, patch) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: {
              ...p.phaseClosures,
              [phase]: { ...p.phaseClosures[phase], angles: patchArray(p.phaseClosures[phase].angles, index, patch) },
            },
          })),
        setSignOff: (id, phase, index, patch) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: {
              ...p.phaseClosures,
              [phase]: { ...p.phaseClosures[phase], signOffs: patchArray(p.phaseClosures[phase].signOffs, index, patch) },
            },
          })),
        setClosureField: (id, phase, field, value) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: {
              ...p.phaseClosures,
              [phase]: { ...p.phaseClosures[phase], [field]: value },
            },
          })),

        setBomLine: (id, index, patch) =>
          updateProject(id, (p) => ({ ...p, bom: patchArray(p.bom, index, patch) })),
        addBomLine: (id) =>
          updateProject(id, (p) => ({
            ...p,
            bom: [
              ...p.bom,
              { line: p.bom.length + 1, rmCode: '', inciName: '', functionRole: '', supplier: '', percentWw: 0, costPerKg: 0 },
            ],
          })),
        removeBomLine: (id, index) =>
          updateProject(id, (p) => ({
            ...p,
            bom: p.bom.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })),
          })),
        setCosting: (id, patch) =>
          updateProject(id, (p) => ({ ...p, costing: { ...p.costing, ...patch } })),

        setPackagingBomLine: (id, index, patch) =>
          updateProject(id, (p) => ({ ...p, packagingBom: patchArray(p.packagingBom, index, patch) })),
        addPackagingBomLine: (id) =>
          updateProject(id, (p) => ({
            ...p,
            packagingBom: [
              ...p.packagingBom,
              {
                line: p.packagingBom.length + 1,
                component: '',
                componentType: '',
                supplier: '',
                unitsPerFinishedUnit: 1,
                unitCost: 0,
                wastagePercent: 0,
              },
            ],
          })),
        removePackagingBomLine: (id, index) =>
          updateProject(id, (p) => ({
            ...p,
            packagingBom: p.packagingBom.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })),
          })),

        setRegisterRow: (id, registerKey, index, key, value) =>
          updateProject(id, (p) => ({
            ...p,
            registers: {
              ...p.registers,
              [registerKey]: (p.registers[registerKey] ?? []).map((row: RegisterRow, i: number) =>
                i === index ? { ...row, [key]: value } : row,
              ),
            },
          })),
        addRegisterRow: (id, registerKey) =>
          updateProject(id, (p) => ({
            ...p,
            registers: {
              ...p.registers,
              [registerKey]: [...(p.registers[registerKey] ?? []), createEmptyRegisterRow(registerKey)],
            },
          })),
        removeRegisterRow: (id, registerKey, index) =>
          updateProject(id, (p) => ({
            ...p,
            registers: {
              ...p.registers,
              [registerKey]: (p.registers[registerKey] ?? []).filter((_: RegisterRow, i: number) => i !== index),
            },
          })),

        setEvidenceItem: (id, index, patch) =>
          updateProject(id, (p) => ({ ...p, evidence: patchArray(p.evidence, index, patch) })),
        addCapa: (id, record) =>
          updateProject(id, (p) => ({ ...p, capa: [...p.capa, record] })),
        setCapa: (id, index, patch) =>
          updateProject(id, (p) => ({ ...p, capa: patchArray(p.capa, index, patch) })),
        addFeedback: (id, entry) =>
          updateProject(id, (p) => ({ ...p, feedback: [...p.feedback, entry] })),

        addChange: (record) => set((s) => ({ changes: [...s.changes, record] })),
        setChange: (changeId, patch) =>
          set((s) => ({
            changes: s.changes.map((c) => (c.changeId === changeId ? { ...c, ...patch } : c)),
          })),

        resetDemoData: () => set({ projects: seedProjects(), changes: seedChanges() }),
      };
    },
    {
      name: 'mbc360-demo-store',
      version: 4,
      // v1 -> v2 changed Stage status / Gate decision values to match the real
      // MBc360 workbook (Complete/Proceed instead of Completed/Go).
      // v2 -> v3 added packagingBom and the generic evidence `registers` map.
      // v3 -> v4 (workbook V18): added Phase 3 extended user-safety compartments,
      // the Released Label Control registers and the system-reference sheets.
      // Old persisted demo data doesn't fit the new schema, so re-seed instead of migrating it.
      migrate: () => ({ projects: seedProjects(), changes: seedChanges() }),
    },
  ),
);
