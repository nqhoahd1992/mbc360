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
import { createEmptyRegisterRow } from './factory';
import type { PermissionGrid } from '../utils/permissions';
import { seedChanges } from '../data/seed';
import * as projectsApi from '../api/projectsApi';
import { gateIndex, isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { GATES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { getRegisterConfig } from '@mbc360/shared/config/registers';

interface AppState {
  projects: ProjectData[];
  changes: ChangeRecord[];

  // A4 (RBAC demo simulation): the role the user is currently "viewing as" —
  // stands in for the authenticated user's role until F6 (real role matrix/SSO).
  viewRole: string;
  setViewRole: (role: string) => void;

  // The role x capability permission grid, loaded from the backend
  // (`GET /api/rbac/permissions-grid`). Drives the "View as" gate/phase/
  // market-track permission checks (via apps/web/src/utils/permissions.ts) and
  // is edited on the Users & Roles Role Editor. NOT persisted — always loaded
  // fresh from the server on startup (see loadPermissionGrid in App.tsx).
  permissionGrid: PermissionGrid | null;
  loadPermissionGrid: () => Promise<void>;

  // M3 Phase 1 (2026-07-26): `projects` is no longer demo data in localStorage —
  // it is server state fetched from GET /api/projects/:id. Zustand stays the
  // in-memory cache the UI renders from (BACKEND_PLAN §1: no React Query), so
  // every action below replaces its cached project with the API's response.
  // `projectVersions` holds the optimistic-lock version per project id; a write
  // sends the version it last saw and gets 409 if someone else got there first.
  projectVersions: Record<string, number>;
  projectsLoading: boolean;
  projectsError?: string;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;

  createProject: (identity: ProjectIdentity) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (id: string, updater: (p: ProjectData) => ProjectData) => void;

  // `changedBy` (the real signed-in user) is recorded on every field this
  // patch actually changes, in `gateChangeLog` — the general "who changed
  // what" audit trail for Phase Gate Flow edits.
  // `changedBy` is now ignored by the server (the audited actor comes from the
  // session — a client cannot claim to be someone else); the parameter is kept
  // so the ~6 existing call sites compile unchanged.
  setGate: (id: string, gateId: string, patch: Partial<GateRecord>, changedBy?: string) => Promise<void>;
  // Pairs with useDraft: commits a whole batch of edited GateRecord rows (one
  // Phase Gate Flow table's worth) in a single write, applying the same B1/F9
  // decision guards as setGate — but scoped to the `decision` field only, so
  // an invalid decision change never discards the row's other valid edits.
  setGatesBulk: (id: string, updates: GateRecord[], changedBy?: string) => Promise<void>;
  backtrackGate: (
    id: string,
    fromGateId: string,
    toGateId: string,
    reason?: string,
    initiatedBy?: string,
  ) => Promise<void>;

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
  // F5: majorCriteria / classificationConfirmedBy capture the classification trail.
  createFormulaVersion: (
    id: string,
    input: {
      version: string;
      changeType: 'Major' | 'Minor';
      reason?: string;
      initiatedBy?: string;
      majorCriteria?: string[];
      classificationConfirmedBy?: string;
    },
  ) => void;

  setChecklistSection: (id: string, section: string, items: ChecklistItem[]) => void;
  setRequirementSection: (id: string, section: string, items: RequirementItem[]) => void;
  setGateChecksBulk: (id: string, updates: { index: number; patch: Partial<GateCheck> }[]) => void;
  setAnglesBulk: (id: string, phase: number, angles: AngleRow[]) => void;
  setSignOffsBulk: (id: string, phase: number, signOffs: SignOff[]) => void;
  // F13: the responsible owner accepts a phase's pre-work once it has opened.
  acceptPhasePreWork: (id: string, phase: number, acceptedBy: string) => void;
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
    (set, get) => {
      // Replace one cached project (and its optimistic-lock version) with a
      // server response, so a mutation response and a fresh GET land in exactly
      // the same state. A local helper rather than a store action: nothing
      // outside this file should be able to inject a project.
      const applyEnvelope = (envelope: projectsApi.ProjectEnvelope) =>
        set((s) => {
          const id = envelope.project.identity.id;
          const exists = s.projects.some((p) => p.identity.id === id);
          return {
            projects: exists
              ? s.projects.map((p) => (p.identity.id === id ? envelope.project : p))
              : [...s.projects, envelope.project],
            projectVersions: { ...s.projectVersions, [id]: envelope.version },
          };
        });

      const updateProject = (id: string, updater: (p: ProjectData) => ProjectData) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.identity.id === id ? updater(p) : p)),
        }));

      return {
        // Empty until loadProjects() runs (App.tsx, once the session resolves).
        projects: [],
        projectVersions: {},
        projectsLoading: false,
        changes: seedChanges(),

        viewRole: 'admin',
        setViewRole: (role) => set({ viewRole: role }),

        permissionGrid: null,
        loadPermissionGrid: async () => {
          const res = await fetch('/api/rbac/permissions-grid');
          if (!res.ok) return; // leave null; permission checks fail closed (all restricted) except admin
          set({ permissionGrid: (await res.json()) as PermissionGrid });
        },

        // The list endpoint returns summary rows only, so each project is then
        // fetched in full — the UI reads whole ProjectData objects everywhere,
        // and Phase 1 has no per-page lazy loading to build on yet.
        loadProjects: async () => {
          set({ projectsLoading: true, projectsError: undefined });
          try {
            const list = await projectsApi.listProjects();
            const loaded = await Promise.all(list.map((row) => projectsApi.getProject(row.id)));
            set({
              projects: loaded.map((e) => e.project),
              projectVersions: Object.fromEntries(loaded.map((e) => [e.project.identity.id, e.version])),
              projectsLoading: false,
            });
          } catch (err) {
            set({
              projectsLoading: false,
              projectsError: err instanceof Error ? err.message : 'Could not load projects',
            });
          }
        },

        loadProject: async (id) => {
          const envelope = await projectsApi.getProject(id);
          applyEnvelope(envelope);
        },

        createProject: async (identity) => {
          const envelope = await projectsApi.createProject(identity, projectsApi.newIdempotencyKey());
          applyEnvelope(envelope);
        },

        deleteProject: async (id) => {
          await projectsApi.deleteProject(id);
          set((s) => {
            const { [id]: _dropped, ...versions } = s.projectVersions;
            return { projects: s.projects.filter((p) => p.identity.id !== id), projectVersions: versions };
          });
        },
        updateProject,

        // M3 Phase 1: the B1/F9/F1/C7 guards these three actions used to run
        // in the browser now live on the server, which is the sole authority
        // (BACKEND_PLAN §3 principle 7) — the API re-runs the very same shared
        // pure functions, so nothing was reimplemented. A rejected write now
        // THROWS instead of silently no-op'ing, which is why callers await and
        // surface the message.
        setGate: async (id, gateId, patch) => {
          const envelope = await projectsApi.updateGate(id, gateId, patch, get().projectVersions[id] ?? 0);
          applyEnvelope(envelope);
        },

        setGatesBulk: async (id, updates) => {
          const envelope = await projectsApi.updateGates(id, updates, get().projectVersions[id] ?? 0);
          applyEnvelope(envelope);
        },

        backtrackGate: async (id, fromGateId, toGateId, reason, initiatedBy) => {
          const envelope = await projectsApi.backtrackGate(
            id,
            { fromGateId, toGateId, reason: reason ?? '', initiatedBy },
            get().projectVersions[id] ?? 0,
            projectsApi.newIdempotencyKey(),
          );
          applyEnvelope(envelope);
        },


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

              // Invalidate ALL sign-offs (Prepared/Reviewed/Approved), not just
              // Approved by, for every phase with at least one gate in the
              // reopened range — same fix as `backtrackGate` (2026-07-23):
              // a Major change can legitimately land after Phase 2 AND 3 are
              // both fully signed off (e.g. discovered in Phase 4 or post-
              // market), so clearing only the final approval would leave
              // stale Prepared/Reviewed names on a phase whose Gates 4-9 are
              // being reworked.
              const affectedPhases = new Set(
                affected.map((g) => GATES.find((m) => m.id === g.gateId)!.phase),
              );
              const previousSignOffs: Record<number, SignOff[]> = {};
              phaseClosures = { ...p.phaseClosures };
              for (const phase of affectedPhases) {
                const closure = phaseClosures[phase];
                if (!closure) continue;
                previousSignOffs[phase] = closure.signOffs.map((s) => ({ ...s }));
                phaseClosures[phase] = {
                  ...closure,
                  signOffs: closure.signOffs.map((s) => ({ role: s.role })),
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
                  majorCriteria: input.majorCriteria,
                  classificationConfirmedBy: input.classificationConfirmedBy,
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
        // Gate-level edit lock (2026-07-23): a passed gate's evidence is
        // read-only (correcting it requires Backtrack, B4) — the UI renders it
        // read-only, and these guards refuse the write at the store layer too
        // (defense in depth, same principle as the setGate/backtrack guards).
        setChecklistSection: (id, section, items) =>
          updateProject(id, (p) => {
            const cfg = Object.values(PHASE_CONFIGS)
              .flatMap((c) => c.checklistSections)
              .find((s) => s.key === section);
            if (cfg && isGateRefLocked(p, cfg.gate)) return p; // gate passed → read-only
            return { ...p, checklists: { ...p.checklists, [section]: items } };
          }),
        // Requirement sections can span several gates, so merge per-row: keep
        // the committed value for any row whose gate has passed, take the
        // incoming value for the rest.
        setRequirementSection: (id, section, items) =>
          updateProject(id, (p) => {
            const committed = p.requirements[section] ?? [];
            const merged = items.map((incoming) => {
              if (!isGateRefLocked(p, incoming.gate)) return incoming;
              return committed.find((c) => c.requirement === incoming.requirement && c.gate === incoming.gate) ?? incoming;
            });
            return { ...p, requirements: { ...p.requirements, [section]: merged } };
          }),
        setGateChecksBulk: (id, updates) =>
          updateProject(id, (p) => {
            const gateChecks = [...p.gateChecks];
            for (const { index, patch } of updates) {
              const row = gateChecks[index];
              if (!row || isGateRefLocked(p, row.gate)) continue; // locked gate → skip
              gateChecks[index] = { ...row, ...patch };
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
        // F13: record the owner's acceptance of a phase's pre-work.
        acceptPhasePreWork: (id, phase, acceptedBy) =>
          updateProject(id, (p) => ({
            ...p,
            phaseClosures: {
              ...p.phaseClosures,
              [phase]: {
                ...p.phaseClosures[phase],
                preWork: { acceptedBy, acceptedDate: dayjs().format('YYYY-MM-DD') },
              },
            },
          })),

        // Replaces the whole Formula BOM (used by the Cosmetri import and the
        // Formula BOM section's save button).
        setBom: (id, lines) =>
          updateProject(id, (p) =>
            isGateRefLocked(p, '05') // Formula BOM is Gate 05 — read-only once passed
              ? p
              : { ...p, bom: lines.map((l, i) => ({ ...l, line: i + 1 })) },
          ),
        setCosting: (id, patch) =>
          updateProject(id, (p) => (isGateRefLocked(p, '05') ? p : { ...p, costing: { ...p.costing, ...patch } })),

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
          updateProject(id, (p) =>
            isGateRefLocked(p, '06') // Packaging BOM is Gate 06
              ? p
              : { ...p, packagingBom: lines.map((l, i) => ({ ...l, line: i + 1 })) },
          ),

        setRegisterRowsBulk: (id, registerKey, rows) =>
          updateProject(id, (p) => {
            if (isGateRefLocked(p, getRegisterConfig(registerKey)?.gate)) return p; // register's gate(s) passed → read-only
            return { ...p, registers: { ...p.registers, [registerKey]: rows } };
          }),

        setEvidenceItemsBulk: (id, items) => updateProject(id, (p) => ({ ...p, evidence: items })),
        addCapa: (id, record) =>
          updateProject(id, (p) => ({ ...p, capa: [...p.capa, record] })),
        setCapaBulk: (id, records) => updateProject(id, (p) => ({ ...p, capa: records })),
        addFeedback: (id, entry) =>
          updateProject(id, (p) => ({ ...p, feedback: [...p.feedback, entry] })),

        addChange: (record) => set((s) => ({ changes: [...s.changes, record] })),
        setChangesBulk: (records) => set({ changes: records }),

      };
    },
    {
      name: 'mbc360-demo-store',
      version: 13,
      // `permissionGrid` is server state, always loaded fresh on startup — never
      // persist a stale copy to localStorage. (Functions and everything else are
      // handled as before; this only strips the grid.)
      // M3 Phase 1: `projects`/`projectVersions` are server state fetched on
      // startup, and `permissionGrid` likewise — persisting any of them would
      // put a stale copy of the database in the browser, which is exactly what
      // this milestone removes. `changes` (Change Control) is still local until
      // Phase 6 migrates it.
      partialize: (state) => {
        const {
          permissionGrid: _grid,
          projects: _projects,
          projectVersions: _versions,
          projectsLoading: _loading,
          projectsError: _error,
          ...rest
        } = state;
        return rest;
      },
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
      // v8 -> v9 (F9): ChangeRecord.status moved from WorkStatus to the change
      // lifecycle vocabulary (Draft/Submitted/.../Superseded) — old persisted
      // changes carry now-invalid statuses; re-seed.
      // v9 -> v10: added gateChangeLog (general Phase Gate Flow edit audit trail,
      // separate from backtrackEvents) and removed the old backtrack note-append
      // behavior — old persisted projects lack gateChangeLog entirely.
      // v10 -> v11: ProjectIdentity gained required `reviewers` (per-project review
      // owners / co-signers, replacing the old hardcoded config demo names) — old
      // persisted projects have no reviewers, which would render blank captions.
      // v11 -> v12 (NPD Front-End Roadmap, v2 workbook): added ~25 new
      // RegisterConfig keys (Needs & Scientific Basis, Competitor Landscape,
      // Target Product & Tech, Evidence & Claim Support, Ingredient Monograph,
      // Evidence & Search Rules, Carrier/Emollient Review, NPD Roadmap
      // reference). `seedRegisters()` only runs at project creation, so an
      // already-persisted project's `registers` object would be missing every
      // new key — for the `mode: 'fixed'` ones (roughly half) that means the
      // labelled rows never materialize at all (DynamicTable only offers "Add
      // row" for `mode: 'register'`), and since the new SG02/SG03/SG05/SG08
      // Mandatory readiness items read these registers live, an existing
      // project already past those gates would retroactively re-evaluate them
      // as unpassed. Re-seed, not a real migration, same as every prior bump.
      // Old persisted demo data doesn't fit the new schema, so re-seed instead of migrating it.
      // v12 -> v13: projects left localStorage entirely (M3 Phase 1). Only the
      // still-local slices are re-seeded; projects come from GET /api/projects.
      migrate: () => ({ changes: seedChanges() }),
    },
  ),
);
