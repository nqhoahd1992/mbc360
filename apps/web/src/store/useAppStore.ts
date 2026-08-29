import { message } from 'antd';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  RegisterClosureRole,
  RegisterRow,
  RequirementItem,
  GateSignOffRole,
  SignOff,
  StudyApproval,
} from '@mbc360/shared/types';
import type { MarketProfile, RawMaterialRisk } from '@mbc360/shared/config/referenceData';
import type { PermissionGrid } from '../utils/permissions';
import * as projectsApi from '../api/projectsApi';

interface AppState {
  projects: ProjectData[];
  changes: ChangeRecord[];

  // A4 (RBAC demo simulation): the role the user is currently "viewing as" —
  // stands in for the authenticated user's role until F6 (real role matrix/SSO).
  viewRole: string;
  setViewRole: (role: string) => void;

  // The project the sidebar is pinned to (2026-08-26) — moved here from local
  // state in App.tsx's SideMenu so a global page like Change Control can read
  // it too (used to default "Open Change Request"'s Project field). Set from
  // the URL whenever a `/projects/:id/...` route is visited, and left as-is on
  // a global page — see the effect in SideMenu. Not persisted: a reload
  // re-derives it from the URL (or falls back to the first project), matching
  // the behaviour before this moved into the store.
  activeProjectId: string | undefined;
  setActiveProjectId: (id: string | undefined) => void;

  // The role x capability permission grid, loaded from the backend
  // (`GET /api/rbac/permissions-grid`). Drives the "View as" gate/phase/
  // market-track permission checks (via apps/web/src/utils/permissions.ts) and
  // is edited on the Users & Roles Role Editor. NOT persisted — always loaded
  // fresh from the server on startup (see loadPermissionGrid in App.tsx).
  permissionGrid: PermissionGrid | null;
  loadPermissionGrid: () => Promise<void>;
  // Round 4 question 4 — Regulatory's per-market profile. Null until loaded.
  marketProfiles: MarketProfile[] | null;
  loadMarketProfiles: () => Promise<void>;
  // Round 4 question 17 — the shared Raw Material Risk Overlay. Null until loaded.
  rmRisk: RawMaterialRisk[] | null;
  loadRmRisk: () => Promise<void>;

  // M3 Phase 1 (2026-07-26): `projects` is no longer demo data in localStorage —
  // it is server state fetched from GET /api/projects/:id. Zustand stays the
  // in-memory cache the UI renders from (BACKEND_PLAN §1: no React Query), so
  // every action below replaces its cached project with the API's response.
  // `projectVersions` holds the optimistic-lock version per project id; a write
  // sends the version it last saw and gets 409 if someone else got there first.
  projectVersions: Record<string, number>;
  projectsLoading: boolean;
  projectsError?: string;
  loadProjects: (includeArchived?: boolean) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  // Archive / restore a project (needs `project|archive`; the server enforces).
  setProjectArchived: (id: string, archived: boolean) => Promise<void>;
  // Whether the Projects list currently includes archived projects.
  showArchivedProjects: boolean;
  setShowArchivedProjects: (show: boolean) => Promise<void>;

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
  // D1: a signature is an act, so it is three actions, not a table write.
  // Assigning belongs to the project's Lead; signing and withdrawing belong to
  // the assigned signer. Everything recorded ON the signature (who, role, time,
  // record version) comes from the server, never from here.
  setSignOffAssignees: (
    id: string,
    phase: number,
    assignments: { role: SignOff['role']; userId?: string | null }[],
  ) => void;
  signSignOff: (
    id: string,
    phase: number,
    role: SignOff['role'],
    // stepUpToken: required — a sign-off always attaches the signer's saved
    // signature, verified by a fresh authenticator code (project owner,
    // 2026-08-22)
    // (2026-08-21) for attaching a saved signature — see SignOffBlock.tsx.
    input: { decision?: string; comments?: string; stepUpToken: string },
  ) => void;
  withdrawSignOff: (id: string, phase: number, role: SignOff['role'], reason: string) => void;
  // Per-gate sign-off (Round 4 questions 18/29). `market` is undefined on Gates 1-9.
  setGateSignOffAssignees: (
    id: string,
    gateId: string,
    market: string | undefined,
    assignments: { role: GateSignOffRole; userId?: string | null }[],
  ) => void;
  signGateSignOff: (
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    input: { decision?: string; comment?: string; stepUpToken: string },
  ) => Promise<void>;
  withdrawGateSignOff: (
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    reason: string,
  ) => Promise<void>;
  // F13: the responsible owner accepts a phase's pre-work once it has opened.
  acceptPhasePreWork: (id: string, phase: number, acceptedBy: string) => void;
  setEvidenceSummary: (id: string, phase: number, value: string) => void;
  // The phase banner's "(provide link here)" shortcuts, keyed by workbook label.
  setPhaseKeyLinks: (id: string, phase: number, links: Record<string, string>) => void;

  setBom: (id: string, lines: BomLine[]) => void;
  setCosting: (id: string, patch: Partial<CostingInputs>) => void;
  setFormulaProperties: (id: string, patch: ProjectData['formulaProperties']) => void;
  setAssessments: (id: string, patch: ProjectData['assessments']) => void;
  // Gate 1 opportunity capture (B1/B2/B3) — only those 8 fields are writable.
  setIdentity: (id: string, patch: Partial<ProjectData['identity']>) => void;
  setMarkets: (id: string, markets: string[]) => void;
  setPackagingBomBulk: (id: string, lines: PackagingBomLine[]) => void;

  // Integrations (decision A3): Power Apps hosts the "create new raw
  // material" change request; Graph/SharePoint is planned. Cosmetri itself is
  // NOT here — it's a server-held connection (apps/api/src/cosmetri/), read
  // via GET /api/integrations/cosmetri/status (see useCosmetriStatus).
  integrations: IntegrationSettings;
  setPowerAppsUrl: (url: string) => void;
  setGraphConfig: (patch: Partial<GraphSettings>) => void;

  setRegisterRowsBulk: (id: string, registerKey: string, rows: RegisterRow[]) => void;
  // A `signature` column is never part of the bulk save above — the server
  // refuses to take one from a table write, because a value that proves who
  // approved something cannot be a value the client sends (2026-08-26).
  signRegisterRow: (
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    stepUpToken: string,
  ) => void;
  withdrawRegisterSignature: (
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    reason: string,
  ) => void;

  // Register closing (2026-08-27) — a register-wide act (2 signatures: Review
  // owner + Co-sign), separate from the per-row signature column above.
  signRegisterClose: (
    id: string,
    registerKey: string,
    role: RegisterClosureRole,
    stepUpToken: string,
  ) => void;
  withdrawRegisterClose: (
    id: string,
    registerKey: string,
    role: RegisterClosureRole,
    reason: string,
  ) => void;

  setEvidenceItemsBulk: (id: string, items: EvidenceItem[]) => void;
  addCapa: (id: string, record: CapaRecord) => void;
  setCapaBulk: (id: string, records: CapaRecord[]) => void;
  addFeedback: (id: string, entry: FeedbackEntry) => void;

  addChange: (record: ChangeRecord) => void;
  setChangesBulk: (records: ChangeRecord[]) => void;

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
            // Swap out just this project's Change Control rows.
            changes: [...s.changes.filter((c) => c.projectId !== id), ...(envelope.changes ?? [])],
          };
        });

      // M3 Phase 2-6: every section write goes through here. It keeps the store
      // action signatures unchanged (so the ~25 components calling them need no
      // edit, per BACKEND_PLAN §1) while still never lying about success: on
      // failure it surfaces the server's own message and reloads the project, so
      // a component that already called markSaved() snaps back to the real
      // values instead of showing a save that did not happen.
      const writeSection = async (
        id: string,
        call: (version: number) => Promise<projectsApi.ProjectEnvelope>,
      ): Promise<void> => {
        try {
          applyEnvelope(await call(get().projectVersions[id] ?? 0));
        } catch (err) {
          const conflict = err instanceof projectsApi.ApiError && err.isConflict;
          message.error(
            conflict
              ? 'This project was changed by someone else — your edit was not saved. The page has been refreshed.'
              : err instanceof Error
                ? err.message
                : 'Could not save — please try again.',
            8,
          );
          try {
            applyEnvelope(await projectsApi.getProject(id));
          } catch {
            // The reload itself failed (offline?) — the message above already told
            // the user; leaving the cached copy alone is better than blanking it.
          }
        }
      };

      const updateProject = (id: string, updater: (p: ProjectData) => ProjectData) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.identity.id === id ? updater(p) : p)),
        }));

      return {
        // Empty until loadProjects() runs (App.tsx, once the session resolves).
        projects: [],
        projectVersions: {},
        projectsLoading: false,
        // Loaded from the API with the projects (no seed, no localStorage).
        changes: [],

        viewRole: 'admin',
        setViewRole: (role) => set({ viewRole: role }),

        activeProjectId: undefined,
        setActiveProjectId: (id) => set({ activeProjectId: id }),

        permissionGrid: null,
        loadPermissionGrid: async () => {
          const res = await fetch('/api/rbac/permissions-grid');
          if (!res.ok) return; // leave null; permission checks fail closed (all restricted) except admin
          set({ permissionGrid: (await res.json()) as PermissionGrid });
        },

        // Company-level reference data (Round 4 question 4). Server state like the
        // permission grid — loaded fresh on startup, never persisted, because a
        // stale copy of Regulatory's rules in a browser is worse than none.
        //
        // An EMPTY array and `null` mean different things and the readiness engine
        // depends on the difference: null is "not loaded yet", empty is "Regulatory
        // has configured no market". Question 4's whole instruction is that this
        // list is configurable rather than hard-coded, so "nothing configured" has
        // to be a state the app can show rather than guess past.
        marketProfiles: null,
        loadMarketProfiles: async () => {
          const res = await fetch('/api/reference/market-profiles');
          if (!res.ok) return;
          set({ marketProfiles: (await res.json()) as MarketProfile[] });
        },

        // Same contract as marketProfiles above, and the null-vs-empty distinction
        // matters here for a sharper reason: the readiness engine reads this list
        // through `ProjectData.reference`, which the API fills server-side. This
        // copy exists for the admin PAGE only, so a failed load leaves the page
        // saying "not loaded" rather than showing every material as unclassified.
        rmRisk: null,
        loadRmRisk: async () => {
          const res = await fetch('/api/reference/rm-risk');
          if (!res.ok) return;
          set({ rmRisk: (await res.json()) as RawMaterialRisk[] });
        },

        // The list endpoint returns summary rows only, so each project is then
        // fetched in full — the UI reads whole ProjectData objects everywhere,
        // and Phase 1 has no per-page lazy loading to build on yet.
        loadProjects: async (includeArchived = false) => {
          set({ projectsLoading: true, projectsError: undefined });
          try {
            const list = await projectsApi.listProjects(includeArchived);
            const loaded = await Promise.all(list.map((row) => projectsApi.getProject(row.id)));
            set({
              projects: loaded.map((e) => e.project),
              projectVersions: Object.fromEntries(loaded.map((e) => [e.project.identity.id, e.version])),
              // Change Control rows arrive per project and are flattened back
              // into the single global slice the UI reads.
              changes: loaded.flatMap((e) => e.changes ?? []),
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

        // Archive is reversible; the server enforces the `project|archive`
        // capability. Reloads the list afterwards because an archived project
        // drops out of (or reappears in) the default listing.
        setProjectArchived: async (id, archived) => {
          await projectsApi.setProjectArchived(id, archived);
          await (get() as AppState).loadProjects(get().showArchivedProjects);
        },

        showArchivedProjects: false,
        setShowArchivedProjects: async (show) => {
          set({ showArchivedProjects: show });
          await (get() as AppState).loadProjects(show);
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
          writeSection(id, (v) => projectsApi.setNextActions(id, gateIds, updated, v)),

        // C5 (launch approval blocked until PIF is Approved) and the
        // `market-track|approve` permission are now enforced by the API — the
        // client no longer re-implements either.
        setMarketTracksBulk: (id, tracks) =>
          writeSection(id, (v) => projectsApi.setMarketTracks(id, tracks, v)),

        // C2 (Independent Reviewer must not share the Study Author's department)
        // is enforced by the API, which rejects the save with a message instead
        // of the old silent no-op. The UI still prevents it up front.
        setStudyApprovalsBulk: (id, approvals) =>
          writeSection(id, (v) => projectsApi.setStudyApprovals(id, approvals, v)),

        // A2: the whole cascade (new version, supersede the old one, carry the
        // BOM forward, reopen Gates 4-9 on a Major change, invalidate the
        // affected phases' sign-offs, snapshot a BacktrackEvent, append to the
        // Formulation Change Register) now runs server-side in ONE transaction —
        // see ProjectsService.createFormulaVersion. It was ~90 lines of client
        // logic; keeping a second copy here is exactly what "never fork a copy"
        // forbids, and a half-applied cascade is the kind of thing a transaction
        // exists to prevent.
        createFormulaVersion: (id, input) =>
          writeSection(id, (v) =>
            projectsApi.createFormulaVersion(id, input, v, projectsApi.newIdempotencyKey()),
          ),


        // Gate-level edit lock (B4), the per-row requirement merge and the
        // register/BOM/costing locks all moved to the API (ProjectsService) —
        // they are enforced there against the database, which is the only place
        // that can actually enforce them. These actions keep their signatures so
        // no component changed.
        setChecklistSection: (id, section, items) =>
          writeSection(id, (v) => projectsApi.setChecklistSection(id, section, items, v)),
        setRequirementSection: (id, section, items) =>
          writeSection(id, (v) => projectsApi.setRequirementSection(id, section, items, v)),
        // The store used to address gate checks by array index; the API uses the
        // row's real identity (gate, check), so the index is resolved here while
        // the caller's signature stays unchanged.
        setGateChecksBulk: (id, updates) => {
          const project = get().projects.find((p) => p.identity.id === id);
          if (!project) return Promise.resolve();
          const resolved = updates
            .map(({ index, patch }) => {
              const row = project.gateChecks[index];
              return row ? { gate: row.gate, check: row.check, patch } : null;
            })
            .filter((u): u is { gate: string; check: string; patch: Partial<GateCheck> } => u !== null);
          return writeSection(id, (v) => projectsApi.setGateChecks(id, resolved, v));
        },
        setAnglesBulk: (id, phase, angles) =>
          writeSection(id, (v) => projectsApi.setAngles(id, phase, angles, v)),
        setSignOffAssignees: (id, phase, assignments) =>
          writeSection(id, (v) => projectsApi.setSignOffAssignees(id, phase, assignments, v)),
        signSignOff: (id, phase, role, input) =>
          writeSection(id, (v) => projectsApi.signSignOff(id, phase, role, input, v)),
        withdrawSignOff: (id, phase, role, reason) =>
          writeSection(id, (v) => projectsApi.withdrawSignOff(id, phase, role, reason, v)),
        setGateSignOffAssignees: (id, gateId, market, assignments) =>
          writeSection(id, (v) => projectsApi.setGateSignOffAssignees(id, gateId, market, assignments, v)),
        signGateSignOff: (id, gateId, market, role, input) =>
          writeSection(id, (v) => projectsApi.signGateSignOff(id, gateId, market, role, input, v)),
        withdrawGateSignOff: (id, gateId, market, role, reason) =>
          writeSection(id, (v) => projectsApi.withdrawGateSignOff(id, gateId, market, role, reason, v)),
        setEvidenceSummary: (id, phase, value) =>
          writeSection(id, (v) => projectsApi.setEvidenceSummary(id, phase, value, v)),
        setPhaseKeyLinks: (id, phase, links) =>
          writeSection(id, (v) => projectsApi.setPhaseKeyLinks(id, phase, links, v)),
        // F13: the acceptor is taken from the session server-side, so the
        // `acceptedBy` argument is no longer trusted (kept for signature parity).
        acceptPhasePreWork: (id, phase) =>
          writeSection(id, (v) => projectsApi.acceptPreWork(id, phase, v)),

        setBom: (id, lines) => writeSection(id, (v) => projectsApi.setBom(id, lines, v)),
        setCosting: (id, patch) => writeSection(id, (v) => projectsApi.setCosting(id, patch, v)),
        setFormulaProperties: (id, patch) =>
          writeSection(id, (v) => projectsApi.setFormulaProperties(id, patch, v)),

        setAssessments: (id, patch) =>
          writeSection(id, (v) => projectsApi.setAssessments(id, patch, v)),
        setIdentity: (id, patch) => writeSection(id, (v) => projectsApi.setIdentity(id, patch, v)),
        setMarkets: (id, markets) => writeSection(id, (v) => projectsApi.setMarkets(id, markets, v)),
        setPackagingBomBulk: (id, lines) =>
          writeSection(id, (v) => projectsApi.setPackagingBom(id, lines, v)),
        setRegisterRowsBulk: (id, registerKey, rows) =>
          writeSection(id, (v) => projectsApi.setRegisterRows(id, registerKey, rows, v)),
        signRegisterRow: (id, registerKey, rowIndex, column, stepUpToken) =>
          writeSection(id, (v) =>
            projectsApi.signRegisterRow(id, registerKey, rowIndex, column, stepUpToken, v),
          ),
        withdrawRegisterSignature: (id, registerKey, rowIndex, column, reason) =>
          writeSection(id, (v) =>
            projectsApi.withdrawRegisterRowSignature(id, registerKey, rowIndex, column, reason, v),
          ),
        signRegisterClose: (id, registerKey, role, stepUpToken) =>
          writeSection(id, (v) => projectsApi.signRegisterClose(id, registerKey, role, stepUpToken, v)),
        withdrawRegisterClose: (id, registerKey, role, reason) =>
          writeSection(id, (v) => projectsApi.withdrawRegisterClose(id, registerKey, role, reason, v)),
        setEvidenceItemsBulk: (id, items) =>
          writeSection(id, (v) => projectsApi.setEvidenceItems(id, items, v)),

        setCapaBulk: (id, records) => writeSection(id, (v) => projectsApi.setCapa(id, records, v)),
        addCapa: (id, record) => {
          const project = get().projects.find((p) => p.identity.id === id);
          return writeSection(id, (v) => projectsApi.setCapa(id, [...(project?.capa ?? []), record], v));
        },
        addFeedback: (id, entry) => {
          const project = get().projects.find((p) => p.identity.id === id);
          return writeSection(id, (v) =>
            projectsApi.setFeedback(id, [...(project?.feedback ?? []), entry], v),
          );
        },

        // Change Control is stored per project in the database even though this
        // slice is one global list; both writers scope by the record's projectId.
        setChangesBulk: (records) => {
          const byProject = new Map<string, ChangeRecord[]>();
          for (const p of get().projects) byProject.set(p.identity.id, []);
          for (const r of records) {
            if (r.projectId && byProject.has(r.projectId)) byProject.get(r.projectId)!.push(r);
          }
          set({ changes: records });
          return Promise.all(
            [...byProject].map(([pid, rows]) =>
              writeSection(pid, (v) => projectsApi.setChanges(pid, rows, v)),
            ),
          ).then(() => undefined);
        },
        addChange: (record) => {
          const all = [...get().changes, record];
          return (get() as AppState).setChangesBulk(all);
        },


        integrations: DEFAULT_INTEGRATIONS,
        setPowerAppsUrl: (url) =>
          set((s) => ({
            integrations: { ...s.integrations, powerApps: { newRawMaterialUrl: url } },
          })),
        setGraphConfig: (patch) =>
          set((s) => ({
            integrations: { ...s.integrations, graph: { ...s.integrations.graph, ...patch } },
          })),

      };
    },
    {
      name: 'mbc360-demo-store',
      version: 16,
      // `permissionGrid` is server state, always loaded fresh on startup — never
      // persist a stale copy to localStorage. (Functions and everything else are
      // handled as before; this only strips the grid.)
      // M3 Phase 1: `projects`/`projectVersions` are server state fetched on
      // startup, and `permissionGrid` likewise — persisting any of them would
      // put a stale copy of the database in the browser, which is exactly what
      // this milestone removes. `changes` (Change Control) is still local until
      // Phase 6 migrates it.
      // M3 Phase 2-6 complete: NOTHING project-related is stored in the browser
      // any more. Only `viewRole` (the demo RBAC simulator) and `integrations`
      // (Power Apps URL / Graph settings) are still local — both are global
      // preferences, not project data, and are the last two items on the M3 list.
      partialize: (state) => {
        const {
          permissionGrid: _grid,
          marketProfiles: _profiles,
          rmRisk: _rmRisk,
          projects: _projects,
          projectVersions: _versions,
          showArchivedProjects: _showArchived,
          projectsLoading: _loading,
          projectsError: _error,
          changes: _changes,
          activeProjectId: _activeProjectId,
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
      // v13 -> v14: `changes` left localStorage too (M3 Phase 2-6), so there is
      // no project data left to migrate — everything comes from the API.
      migrate: () => ({}),
    },
  ),
);
