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
import { createEmptyProject, createEmptyRegisterRow } from './factory';
import { seedChanges, seedProjects } from '../data/seed';
import { gateIndex, isGateUnlocked, isLastGateOfPhase } from '@mbc360/shared/utils/gateProgress';
import { GATES } from '@mbc360/shared/config/gates';

interface AppState {
  projects: ProjectData[];
  changes: ChangeRecord[];

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

  // Bulk-commit the actions in scope for `gateIds` (NextActionsCard shows a
  // per-phase FILTERED subset of the full list) — replaces that whole subset
  // (additions/edits/removals) while leaving other gates' actions untouched.
  // Pairs with useDraft so the whole card can be freely edited and saved once.
  setNextActionsBulk: (id: string, gateIds: string[], updated: NextAction[]) => void;

  setMarketTracksBulk: (id: string, tracks: MarketTrack[]) => void;

  // C2: dedicated study approval workflow (Study Author / Department Reviewer /
  // Independent Reviewer).
  setStudyApprovalsBulk: (id: string, approvals: StudyApproval[]) => void;

  // A2: create a new formula version; Major changes reopen Gates 4-9.
  createFormulaVersion: (
    id: string,
    input: { version: string; changeType: 'Major' | 'Minor'; reason?: string; initiatedBy?: string },
  ) => void;

  setChecklistSection: (id: string, section: string, items: ChecklistItem[]) => void;
  setRequirementSection: (id: string, section: string, items: RequirementItem[]) => void;
  setGateChecksBulk: (id: string, updates: { index: number; patch: Partial<GateCheck> }[]) => void;
  setAnglesBulk: (id: string, phase: number, angles: AngleRow[]) => void;
  setSignOffsBulk: (id: string, phase: number, signOffs: SignOff[]) => void;
  setEvidenceSummary: (id: string, phase: number, value: string) => void;

  setBom: (id: string, lines: BomLine[]) => void;
  setCosting: (id: string, patch: Partial<CostingInputs>) => void;
  setPackagingBomBulk: (id: string, lines: PackagingBomLine[]) => void;

  // Integrations (decision A3): Power Apps hosts the "create new raw
  // material" change request; Graph/SharePoint is planned. Cosmetri itself is
  // NOT here — it's a server-held connection (apps/api/src/cosmetri/), read
  // via GET /api/integrations/cosmetri/status (see useCosmetriStatus).
  integrations: IntegrationSettings;
  setPowerAppsUrl: (url: string) => void;
  setGraphConfig: (patch: Partial<GraphSettings>) => void;

  setRegisterRowsBulk: (id: string, registerKey: string, rows: RegisterRow[]) => void;

  setEvidenceItemsBulk: (id: string, items: EvidenceItem[]) => void;
  addCapa: (id: string, record: CapaRecord) => void;
  setCapaBulk: (id: string, records: CapaRecord[]) => void;
  addFeedback: (id: string, entry: FeedbackEntry) => void;

  addChange: (record: ChangeRecord) => void;
  setChangesBulk: (records: ChangeRecord[]) => void;

  resetDemoData: () => void;
}

// C2: the Independent Reviewer must not belong to the Study Author's department.
function studyApprovalConflict(approvals: StudyApproval[]): boolean {
  const author = approvals.find((a) => a.role === 'Study Author');
  const independent = approvals.find((a) => a.role === 'Independent Reviewer');
  return (
    !!author?.department?.trim() &&
    !!independent?.department?.trim() &&
    author.department.trim().toLowerCase() === independent.department.trim().toLowerCase()
  );
}

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
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

        setNextActionsBulk: (id, gateIds, updated) =>
          updateProject(id, (p) => ({
            ...p,
            nextActions: [...p.nextActions.filter((a) => !gateIds.includes(a.gateId)), ...updated],
          })),

        // C5: launch approval for a market is hard-blocked until that market's
        // PIF status is Approved.
        setMarketTracksBulk: (id, tracks) =>
          updateProject(id, (p) => ({
            ...p,
            marketTracks: tracks.map((next) => {
              const prev = p.marketTracks.find((t) => t.market === next.market);
              // Re-enforce C5 even if the draft tried to slip a launch
              // approval through without an Approved PIF.
              if (next.launchApproval === 'Approved' && next.pifStatus !== 'Approved') {
                return { ...next, launchApproval: prev?.launchApproval ?? 'Not Started' };
              }
              return next;
            }),
          })),

        // C2: the Independent Reviewer must not belong to the same department
        // as the Study Author — such a patch is rejected here (and prevented in
        // the UI).
        setStudyApprovalsBulk: (id, approvals) =>
          updateProject(id, (p) => (studyApprovalConflict(approvals) ? p : { ...p, studyApprovals: approvals })),

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
                  previousBomSnapshot: p.bom.map((line) => ({ ...line })),
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
        setChecklistSection: (id, section, items) =>
          updateProject(id, (p) => ({ ...p, checklists: { ...p.checklists, [section]: items } })),
        setRequirementSection: (id, section, items) =>
          updateProject(id, (p) => ({ ...p, requirements: { ...p.requirements, [section]: items } })),
        setGateChecksBulk: (id, updates) =>
          updateProject(id, (p) => {
            const gateChecks = [...p.gateChecks];
            for (const { index, patch } of updates) {
              gateChecks[index] = { ...gateChecks[index], ...patch };
            }
            return { ...p, gateChecks };
          }),
        setAnglesBulk: (id, phase, angles) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: { ...p.phaseClosures, [phase]: { ...p.phaseClosures[phase], angles } },
          })),
        setSignOffsBulk: (id, phase, signOffs) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: { ...p.phaseClosures, [phase]: { ...p.phaseClosures[phase], signOffs } },
          })),
        setEvidenceSummary: (id, phase, value) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: {
              ...p.phaseClosures,
              [phase]: { ...p.phaseClosures[phase], evidenceSummary: value },
            },
          })),

        // Replaces the whole Formula BOM (used by the Cosmetri import and the
        // Formula BOM section's save button).
        setBom: (id, lines) =>
          updateProject(id, (p) => ({
            ...p,
            bom: lines.map((l, i) => ({ ...l, line: i + 1 })),
          })),
        setCosting: (id, patch) =>
          updateProject(id, (p) => ({ ...p, costing: { ...p.costing, ...patch } })),

        integrations: DEFAULT_INTEGRATIONS,
        setPowerAppsUrl: (url) =>
          set((s) => ({
            integrations: { ...s.integrations, powerApps: { newRawMaterialUrl: url } },
          })),
        setGraphConfig: (patch) =>
          set((s) => ({
            integrations: { ...s.integrations, graph: { ...s.integrations.graph, ...patch } },
          })),

        setPackagingBomBulk: (id, lines) =>
          updateProject(id, (p) => ({ ...p, packagingBom: lines.map((l, i) => ({ ...l, line: i + 1 })) })),

        setRegisterRowsBulk: (id, registerKey, rows) =>
          updateProject(id, (p) => ({
            ...p,
            registers: { ...p.registers, [registerKey]: rows },
          })),

        setEvidenceItemsBulk: (id, items) => updateProject(id, (p) => ({ ...p, evidence: items })),
        addCapa: (id, record) =>
          updateProject(id, (p) => ({ ...p, capa: [...p.capa, record] })),
        setCapaBulk: (id, records) => updateProject(id, (p) => ({ ...p, capa: records })),
        addFeedback: (id, entry) =>
          updateProject(id, (p) => ({ ...p, feedback: [...p.feedback, entry] })),

        addChange: (record) => set((s) => ({ changes: [...s.changes, record] })),
        setChangesBulk: (records) => set({ changes: records }),

        resetDemoData: () => set({ projects: seedProjects(), changes: seedChanges() }),
      };
    },
    {
      name: 'mbc360-demo-store',
      version: 8,
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
      // v7 -> v8 (F8): NextAction status values changed (Done -> Closed; added
      // Awaiting Information / Ready for Verification / Cancelled) and priority
      // gained Critical — old persisted actions carry now-invalid statuses.
      // Old persisted demo data doesn't fit the new schema, so re-seed instead of migrating it.
      migrate: () => ({ projects: seedProjects(), changes: seedChanges() }),
    },
  ),
);
