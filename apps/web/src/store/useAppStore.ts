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
  GraphSettings,
  IntegrationSettings,
  MarketTrack,
  NextAction,
  PackagingBomLine,
  ProjectData,
  ProjectIdentity,
  RegisterRow,
  RequirementItem,
  SignOff,
  StudyApproval,
} from '@mbc360/shared/types';
import { COSMETRI_DEFAULT_BASE_URL, type CosmetriTokenSet } from '../integrations/cosmetri';
import { createEmptyProject, createEmptyRegisterRow } from './factory';
import { seedChanges, seedProjects } from '../data/seed';
import { gateIndex, isGateUnlocked, isLastGateOfPhase } from '@mbc360/shared/utils/gateProgress';
import { GATES } from '@mbc360/shared/config/gates';

type RegisterGrouping = 'function' | 'department';

interface AppState {
  projects: ProjectData[];
  changes: ChangeRecord[];

  // UI preference: how the Evidence Registers menu is grouped.
  registerGrouping: RegisterGrouping;
  setRegisterGrouping: (grouping: RegisterGrouping) => void;

  // A4 (RBAC demo simulation): the role the user is currently "viewing as" —
  // stands in for the authenticated user's role until F6 (real role matrix/SSO).
  viewRole: string;
  setViewRole: (role: string) => void;

  createProject: (identity: ProjectIdentity) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updater: (p: ProjectData) => ProjectData) => void;

  setGate: (id: string, gateId: string, patch: Partial<GateRecord>) => void;
  backtrackGate: (
    id: string,
    fromGateId: string,
    toGateId: string,
    reason?: string,
    initiatedBy?: string,
  ) => void;

  addNextAction: (id: string, gateId: string) => void;
  setNextAction: (id: string, actionId: string, patch: Partial<NextAction>) => void;
  removeNextAction: (id: string, actionId: string) => void;

  setMarketTrack: (id: string, market: string, patch: Partial<MarketTrack>) => void;

  // C2: dedicated study approval workflow (Study Author / Department Reviewer /
  // Independent Reviewer).
  setStudyApproval: (id: string, index: number, patch: Partial<StudyApproval>) => void;

  // A2: create a new formula version; Major changes reopen Gates 4-9.
  createFormulaVersion: (
    id: string,
    input: { version: string; changeType: 'Major' | 'Minor'; reason?: string; initiatedBy?: string },
  ) => void;

  setChecklistItem: (id: string, section: string, index: number, patch: Partial<ChecklistItem>) => void;
  setRequirementItem: (id: string, section: string, index: number, patch: Partial<RequirementItem>) => void;
  setGateCheck: (id: string, index: number, patch: Partial<GateCheck>) => void;
  setAngle: (id: string, phase: number, index: number, patch: Partial<AngleRow>) => void;
  setSignOff: (id: string, phase: number, index: number, patch: Partial<SignOff>) => void;
  setClosureField: (id: string, phase: number, field: 'evidenceSummary' | 'nextAction' | 'nextDueDate' | 'nextOwner', value: string) => void;

  setBomLine: (id: string, index: number, patch: Partial<BomLine>) => void;
  addBomLine: (id: string) => void;
  removeBomLine: (id: string, index: number) => void;
  setBom: (id: string, lines: BomLine[]) => void;
  setCosting: (id: string, patch: Partial<CostingInputs>) => void;

  // Integrations (decision A3): Cosmetri read-only via API; Power Apps hosts
  // the "create new raw material" change request; Graph/SharePoint is planned.
  integrations: IntegrationSettings;
  connectCosmetri: (baseUrl: string, username: string, tokens: CosmetriTokenSet) => void;
  disconnectCosmetri: () => void;
  setPowerAppsUrl: (url: string) => void;
  setGraphConfig: (patch: Partial<GraphSettings>) => void;

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

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  cosmetri: {
    baseUrl: COSMETRI_DEFAULT_BASE_URL,
    connected: false,
  },
  powerApps: {
    // PLACEHOLDER — replace with the real "Create new raw material" Power Apps
    // link once available.
    newRawMaterialUrl: 'https://apps.powerapps.com/play/e/REPLACE-ENV-ID/a/REPLACE-APP-ID',
  },
  graph: {},
};

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

        viewRole: 'admin',
        setViewRole: (role) => set({ viewRole: role }),

        createProject: (identity) =>
          set((s) => ({ projects: [...s.projects, createEmptyProject(identity)] })),
        deleteProject: (id) =>
          set((s) => ({ projects: s.projects.filter((p) => p.identity.id !== id) })),
        updateProject,

        setGate: (id, gateId, patch) =>
          updateProject(id, (p) => {
            // Sequential rule: locked gates (after the current one) cannot change
            if (!isGateUnlocked(p, gateId)) return p;
            // B1: a Gap prevents a normal Proceed decision.
            if (patch.decision === 'Proceed') {
              const record = p.gates.find((g) => g.gateId === gateId);
              const status = patch.status ?? record?.status;
              if (status === 'Gap') return p;
            }
            return {
              ...p,
              gates: p.gates.map((g) => (g.gateId === gateId ? { ...g, ...patch } : g)),
            };
          }),
        // Reopens gates from `toGateId` up to (but not including) `fromGateId` for
        // rework, and invalidates the approval of any phase whose closing gate falls
        // in that range. `fromGateId` keeps its own Backtrack decision as the
        // permanent record of why. B4 ("no silent corrections"): nothing is lost —
        // the pre-backtrack gate records and sign-offs are snapshotted into an
        // immutable BacktrackEvent before the live records are reset.
        backtrackGate: (id, fromGateId, toGateId, reason, initiatedBy) =>
          updateProject(id, (p) => {
            const fromIdx = gateIndex(fromGateId);
            const toIdx = gateIndex(toGateId);
            if (toIdx < 0 || fromIdx < 0 || toIdx >= fromIdx) return p;

            const dateStr = dayjs().format('YYYY-MM-DD');
            const fromMeta = GATES[fromIdx];
            const toMeta = GATES[toIdx];
            const appendNote = (existing: string | undefined, note: string) =>
              existing ? `${existing}\n${note}` : note;

            const affectedIds = p.gates
              .filter((g) => {
                const idx = gateIndex(g.gateId);
                return (idx >= toIdx && idx < fromIdx) || g.gateId === fromGateId;
              })
              .map((g) => g.gateId);

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

            // Invalidate the approval of any phase whose closing gate sits inside the
            // reopened range — re-approval is required; the previous signature is
            // preserved in the BacktrackEvent snapshot below, never deleted.
            const previousSignOffs: Record<number, SignOff[]> = {};
            const phaseClosures = { ...p.phaseClosures };
            for (let idx = toIdx; idx < fromIdx; idx++) {
              if (!isLastGateOfPhase(idx)) continue;
              const phase = GATES[idx].phase;
              const closure = phaseClosures[phase];
              if (!closure) continue;
              previousSignOffs[phase] = closure.signOffs.map((s) => ({ ...s }));
              phaseClosures[phase] = {
                ...closure,
                signOffs: closure.signOffs.map((s) =>
                  s.role === 'Approved by' ? { role: s.role } : s,
                ),
              };
            }

            const event = {
              id: `BT-${Date.now()}`,
              date: dateStr,
              initiatedBy: initiatedBy?.trim() || undefined,
              reason,
              fromGateId,
              toGateId,
              reopenedGateIds: affectedIds.filter((gid) => gid !== fromGateId),
              previousGates: p.gates
                .filter((g) => affectedIds.includes(g.gateId))
                .map((g) => ({ ...g })),
              previousSignOffs,
            };

            return { ...p, gates, phaseClosures, backtrackEvents: [...p.backtrackEvents, event] };
          }),

        addNextAction: (id, gateId) =>
          updateProject(id, (p) => ({
            ...p,
            nextActions: [
              ...p.nextActions,
              {
                id: `NA-${Date.now()}`,
                gateId,
                description: '',
                status: 'Open' as const,
                priority: 'Medium' as const,
              },
            ],
          })),
        setNextAction: (id, actionId, patch) =>
          updateProject(id, (p) => ({
            ...p,
            nextActions: p.nextActions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
          })),
        removeNextAction: (id, actionId) =>
          updateProject(id, (p) => ({
            ...p,
            nextActions: p.nextActions.filter((a) => a.id !== actionId),
          })),

        // C5: launch approval for a market is hard-blocked until that market's
        // PIF status is Approved.
        setMarketTrack: (id, market, patch) =>
          updateProject(id, (p) => ({
            ...p,
            marketTracks: p.marketTracks.map((t) => {
              if (t.market !== market) return t;
              const next = { ...t, ...patch };
              if (patch.launchApproval === 'Approved' && next.pifStatus !== 'Approved') {
                next.launchApproval = t.launchApproval;
              }
              return next;
            }),
          })),

        // C2: the Independent Reviewer must not belong to the same department
        // as the Study Author — such a patch is rejected here (and prevented in
        // the UI).
        setStudyApproval: (id, index, patch) =>
          updateProject(id, (p) => {
            const next = patchArray(p.studyApprovals, index, patch);
            const author = next.find((a) => a.role === 'Study Author');
            const independent = next.find((a) => a.role === 'Independent Reviewer');
            const conflict =
              !!author?.department?.trim() &&
              !!independent?.department?.trim() &&
              author.department.trim().toLowerCase() === independent.department.trim().toLowerCase();
            if (conflict) return p;
            return { ...p, studyApprovals: next };
          }),

        // A2: a new formula version is recorded in the version history and the
        // Formulation Change Register. A MAJOR change also reopens Gates 4-9
        // for redesign/testing/safety revalidation, invalidating the Phase 2/3
        // approvals — with the pre-change state preserved in the backtrack
        // audit log (B4, "no silent corrections").
        createFormulaVersion: (id, input) =>
          updateProject(id, (p) => {
            const version = input.version.trim();
            if (!version || version === p.formulaVersion) return p;
            const dateStr = dayjs().format('YYYY-MM-DD');

            let gates = p.gates;
            let phaseClosures = p.phaseClosures;
            let backtrackEvents = p.backtrackEvents;

            if (input.changeType === 'Major') {
              const fromIdx = gateIndex('SG09');
              const toIdx = gateIndex('SG04');
              const affected = p.gates.filter((g) => {
                const idx = gateIndex(g.gateId);
                return idx >= toIdx && idx <= fromIdx;
              });

              const note = `[Formula ${version} ${dateStr}] Gates 4-9 reopened for formula version change${input.reason ? ` — ${input.reason}` : ''}.`;
              gates = p.gates.map((g) => {
                const idx = gateIndex(g.gateId);
                if (idx < toIdx || idx > fromIdx) return g;
                return {
                  ...g,
                  status: 'Not Started' as const,
                  decision: undefined,
                  notes: g.gateId === 'SG04' ? (g.notes ? `${g.notes}\n${note}` : note) : g.notes,
                };
              });

              const previousSignOffs: Record<number, SignOff[]> = {};
              phaseClosures = { ...p.phaseClosures };
              for (const phase of [2, 3]) {
                const closure = phaseClosures[phase];
                if (!closure) continue;
                previousSignOffs[phase] = closure.signOffs.map((s) => ({ ...s }));
                phaseClosures[phase] = {
                  ...closure,
                  signOffs: closure.signOffs.map((s) =>
                    s.role === 'Approved by' ? { role: s.role } : s,
                  ),
                };
              }

              backtrackEvents = [
                ...p.backtrackEvents,
                {
                  id: `BT-${Date.now()}`,
                  date: dateStr,
                  initiatedBy: input.initiatedBy?.trim() || undefined,
                  reason: `Formula version ${p.formulaVersion} -> ${version} (Major)${input.reason ? ` — ${input.reason}` : ''}`,
                  fromGateId: 'SG09',
                  toGateId: 'SG04',
                  reopenedGateIds: affected.map((g) => g.gateId),
                  previousGates: affected.map((g) => ({ ...g })),
                  previousSignOffs,
                },
              ];
            }

            const registerRows = p.registers['formulationChangeRegister'] ?? [];
            const newRow: RegisterRow = {
              ...createEmptyRegisterRow('formulationChangeRegister'),
              changeId: `FC-${String(registerRows.length + 1).padStart(3, '0')}`,
              productFamilySku: p.identity.productSku,
              requestedByNpd: input.initiatedBy ?? '',
              dateRequested: dateStr,
              changeTitle: `Formula version ${p.formulaVersion} -> ${version} (${input.changeType})`,
              explanation: input.reason ?? '',
              vnRegistrationRequired:
                input.changeType === 'Major' && p.identity.markets.includes('Vietnam'),
              overallStatus: 'In Progress',
            };

            return {
              ...p,
              formulaVersion: version,
              formulaVersionHistory: [
                ...p.formulaVersionHistory,
                {
                  version,
                  previousVersion: p.formulaVersion,
                  date: dateStr,
                  changeType: input.changeType,
                  reason: input.reason,
                  initiatedBy: input.initiatedBy,
                },
              ],
              gates,
              phaseClosures,
              backtrackEvents,
              registers: {
                ...p.registers,
                formulationChangeRegister: [...registerRows, newRow],
              },
            };
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
        // Replaces the whole Formula BOM (used by the Cosmetri import).
        setBom: (id, lines) =>
          updateProject(id, (p) => ({
            ...p,
            bom: lines.map((l, i) => ({ ...l, line: i + 1 })),
          })),
        setCosting: (id, patch) =>
          updateProject(id, (p) => ({ ...p, costing: { ...p.costing, ...patch } })),

        integrations: DEFAULT_INTEGRATIONS,
        connectCosmetri: (baseUrl, username, tokens) =>
          set((s) => ({
            integrations: {
              ...s.integrations,
              cosmetri: {
                baseUrl,
                username,
                connected: true,
                accessToken: tokens.accessToken,
                accessTokenExpiresAt: tokens.accessTokenExpiresAt,
                refreshToken: tokens.refreshToken,
                refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
                lastSyncAt: dayjs().format('YYYY-MM-DD HH:mm'),
              },
            },
          })),
        disconnectCosmetri: () =>
          set((s) => ({
            integrations: {
              ...s.integrations,
              cosmetri: { baseUrl: s.integrations.cosmetri.baseUrl, connected: false },
            },
          })),
        setPowerAppsUrl: (url) =>
          set((s) => ({
            integrations: { ...s.integrations, powerApps: { newRawMaterialUrl: url } },
          })),
        setGraphConfig: (patch) =>
          set((s) => ({
            integrations: { ...s.integrations, graph: { ...s.integrations.graph, ...patch } },
          })),

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
      version: 7,
      // v1 -> v2 changed Stage status / Gate decision values to match the real
      // MBc360 workbook (Complete/Proceed instead of Completed/Go).
      // v2 -> v3 added packagingBom and the generic evidence `registers` map.
      // v3 -> v4 (workbook V18): added Phase 3 extended user-safety compartments,
      // the Released Label Control registers and the system-reference sheets.
      // v4 -> v5 (confirmed business rules): added nextActions (B2),
      // backtrackEvents (B4) and per-market marketTracks (A1/C5).
      // v5 -> v6 (confirmed business rules, round 2): added studyApprovals (C2)
      // and formulaVersion + formulaVersionHistory (A2).
      // v6 -> v7: some browsers still had pre-v6 projects stored under the v6
      // number (formulaVersionHistory undefined -> BomCosting crashed reading
      // .length), so the "no-op" migrate never re-seeded them. Bump forces it.
      // Old persisted demo data doesn't fit the new schema, so re-seed instead of migrating it.
      migrate: () => ({ projects: seedProjects(), changes: seedChanges() }),
    },
  ),
);
