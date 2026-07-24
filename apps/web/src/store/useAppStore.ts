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
  GateChangeLogEntry,
  GateFieldChange,
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
import type { PermissionGrid } from '../utils/permissions';
import { seedChanges, seedProjects } from '../data/seed';
import { gateBlockers, gateIndex, hardGateBlockers, isGateRefLocked, isGateUnlocked } from '@mbc360/shared/utils/gateProgress';
import { GATES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';

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

  createProject: (identity: ProjectIdentity) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updater: (p: ProjectData) => ProjectData) => void;

  // `changedBy` (the real signed-in user) is recorded on every field this
  // patch actually changes, in `gateChangeLog` — the general "who changed
  // what" audit trail for Phase Gate Flow edits.
  setGate: (id: string, gateId: string, patch: Partial<GateRecord>, changedBy?: string) => void;
  // Pairs with useDraft: commits a whole batch of edited GateRecord rows (one
  // Phase Gate Flow table's worth) in a single write, applying the same B1/F9
  // decision guards as setGate — but scoped to the `decision` field only, so
  // an invalid decision change never discards the row's other valid edits.
  setGatesBulk: (id: string, updates: GateRecord[], changedBy?: string) => void;
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

// Every ordinary Phase Gate Flow edit (setGate/setGatesBulk) is diffed
// against the field's previous value and logged to `gateChangeLog` — the
// general audit trail for regular edits, distinct from the richer
// BacktrackEvent log used specifically for backtracks (see backtrackGate).
const GATE_RECORD_FIELDS: GateFieldChange['field'][] = [
  'status',
  'decision',
  'owner',
  'dueDate',
  'evidenceLink',
  'notes',
];

function diffGateRecord(existing: GateRecord, next: Partial<GateRecord>): GateFieldChange[] {
  const changes: GateFieldChange[] = [];
  for (const field of GATE_RECORD_FIELDS) {
    if (field in next && next[field] !== existing[field]) {
      changes.push({ field, from: existing[field], to: next[field] });
    }
  }
  return changes;
}

function gateChangeLogEntry(
  gateId: string,
  changedBy: string | undefined,
  changes: GateFieldChange[],
): GateChangeLogEntry {
  return { id: `GCL-${Date.now()}-${gateId}`, gateId, date: dayjs().format('YYYY-MM-DD HH:mm'), changedBy, changes };
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

        permissionGrid: null,
        loadPermissionGrid: async () => {
          const res = await fetch('/api/rbac/permissions-grid');
          if (!res.ok) return; // leave null; permission checks fail closed (all restricted) except admin
          set({ permissionGrid: (await res.json()) as PermissionGrid });
        },

        createProject: (identity) =>
          set((s) => ({ projects: [...s.projects, createEmptyProject(identity)] })),
        deleteProject: (id) =>
          set((s) => ({ projects: s.projects.filter((p) => p.identity.id !== id) })),
        updateProject,

        // Uses `set((s) => ...)` (not updateProject) so the F9 guard below can
        // read the sibling `changes` slice.
        setGate: (id, gateId, patch, changedBy) =>
          set((s) => ({
            projects: s.projects.map((p) => {
              if (p.identity.id !== id) return p;
              // Sequential rule: locked gates (after the current one) cannot change
              if (!isGateUnlocked(p, gateId)) return p;
              const existing = p.gates.find((g) => g.gateId === gateId);
              if (!existing) return p;
              if (patch.decision === 'Proceed' || patch.decision === 'Proceed with Conditions') {
                const status = patch.status ?? existing.status;
                if (patch.decision === 'Proceed') {
                  // B1: a Gap prevents a normal Proceed decision.
                  if (status === 'Gap') return p;
                  // F9: an open change control record affecting this gate blocks a
                  // plain Proceed (Proceed with Conditions is allowed instead).
                  const gateNumber = GATES.find((g) => g.id === gateId)?.number;
                  const hasOpenChange = s.changes.some((c) => {
                    if (c.projectId !== id || !isChangeOpen(c.status)) return false;
                    const trig = getChangeTrigger(c.triggerId);
                    return (
                      !!trig &&
                      (trig.gates.includes('ALL') || (!!gateNumber && trig.gates.includes(gateNumber)))
                    );
                  });
                  if (hasOpenChange) return p;
                }
                // F1/C7: mandatory evidence / safety / critical-action blockers must
                // be cleared before either decision can be recorded — Proceed with
                // Conditions clears the softer open-non-critical-next-action
                // blocker (gateBlockers with this decision as the override) but not
                // the harder ones (hardGateBlockers).
                const blockers =
                  patch.decision === 'Proceed' ? gateBlockers(p, gateId, patch.decision) : hardGateBlockers(p, gateId);
                if (blockers.length > 0) return p;
              }
              const changes = diffGateRecord(existing, patch);
              if (changes.length === 0) return p;
              return {
                ...p,
                gates: p.gates.map((g) => (g.gateId === gateId ? { ...g, ...patch } : g)),
                gateChangeLog: [...p.gateChangeLog, gateChangeLogEntry(gateId, changedBy, changes)],
              };
            }),
          })),
        setGatesBulk: (id, updates, changedBy) =>
          set((s) => ({
            projects: s.projects.map((p) => {
              if (p.identity.id !== id) return p;
              let gates = p.gates;
              const newLogEntries: GateChangeLogEntry[] = [];
              for (const update of updates) {
                const { gateId } = update;
                const existing = gates.find((g) => g.gateId === gateId);
                if (!existing || !isGateUnlocked(p, gateId)) continue;
                // Same B1/F9/F1/C7 guard as setGate, scoped to the `decision` field
                // only: if the new decision would be invalid, keep the existing
                // decision but still apply every other field edit.
                let decision = update.decision;
                if (decision === 'Proceed' || decision === 'Proceed with Conditions') {
                  const status = update.status ?? existing.status;
                  let invalid = false;
                  if (decision === 'Proceed') {
                    if (status === 'Gap') {
                      invalid = true;
                    } else {
                      const gateNumber = GATES.find((g) => g.id === gateId)?.number;
                      const hasOpenChange = s.changes.some((c) => {
                        if (c.projectId !== id || !isChangeOpen(c.status)) return false;
                        const trig = getChangeTrigger(c.triggerId);
                        return (
                          !!trig &&
                          (trig.gates.includes('ALL') || (!!gateNumber && trig.gates.includes(gateNumber)))
                        );
                      });
                      if (hasOpenChange) invalid = true;
                    }
                  }
                  if (!invalid) {
                    const blockers = decision === 'Proceed' ? gateBlockers(p, gateId, decision) : hardGateBlockers(p, gateId);
                    if (blockers.length > 0) invalid = true;
                  }
                  if (invalid) decision = existing.decision;
                }
                const finalUpdate = { ...update, decision };
                const changes = diffGateRecord(existing, finalUpdate);
                if (changes.length > 0) newLogEntries.push(gateChangeLogEntry(gateId, changedBy, changes));
                gates = gates.map((g) => (g.gateId === gateId ? { ...g, ...finalUpdate } : g));
              }
              if (newLogEntries.length === 0) return { ...p, gates };
              return { ...p, gates, gateChangeLog: [...p.gateChangeLog, ...newLogEntries] };
            }),
          })),
        // Reopens gates from `toGateId` up to AND INCLUDING `fromGateId` for rework
        // (the gate you're backtracking FROM needs redoing too — that's the whole
        // reason a Backtrack was recorded there in the first place, not a reason to
        // leave it untouched), and invalidates ALL sign-offs (Prepared/Reviewed/
        // Approved) of any phase that has at least one gate in that range — not
        // only when the range reaches that phase's own closing gate (per-user
        // decision, 2026-07-23: any affected gate voids the whole phase's sign-off
        // trail, since "Prepared"/"Reviewed" no longer reliably describe a phase
        // with a gate now being reworked either). B4 ("no silent corrections"):
        // nothing is lost — the pre-backtrack gate records and sign-offs are
        // snapshotted into an immutable BacktrackEvent before the live records are
        // reset. Who/why/when is recorded ONLY on that immutable event (shown on
        // Project Overview) — deliberately not also written into the `notes`
        // field, which is a normal editable field and would give a false,
        // overwritable sense of being "the" audit record. Previously `fromGateId`
        // was excluded from the reset and instead kept `decision: 'Backtrack'` as
        // a permanent marker — that left it showing "Backtrack" still selected in
        // the Gate Flow table instead of reopened like every other gate in the
        // range, and (since it's the range's upper bound) silently skipped
        // invalidating a phase whose LAST gate is `fromGateId` itself.
        backtrackGate: (id, fromGateId, toGateId, reason, initiatedBy) =>
          updateProject(id, (p) => {
            const fromIdx = gateIndex(fromGateId);
            const toIdx = gateIndex(toGateId);
            if (toIdx < 0 || fromIdx < 0 || toIdx >= fromIdx) return p;

            const dateStr = dayjs().format('YYYY-MM-DD');

            const inRange = (idx: number) => idx >= toIdx && idx <= fromIdx;

            const affectedIds = p.gates.filter((g) => inRange(gateIndex(g.gateId))).map((g) => g.gateId);

            const gates = p.gates.map((g) =>
              inRange(gateIndex(g.gateId)) ? { ...g, status: 'Not Started' as const, decision: undefined } : g,
            );

            // Invalidate ALL sign-offs (Prepared by / Reviewed by / Approved by) of
            // any phase with at least one gate inside the reopened range — not just
            // when that range happens to reach the phase's own closing gate. Even a
            // single reworked gate means "Prepared"/"Reviewed" no longer reliably
            // describe that phase either, so a partial re-approval (Approved by
            // only) would understate how much has changed. The previous signatures
            // are preserved in the BacktrackEvent snapshot below, never deleted.
            const affectedPhases = new Set<number>();
            for (let idx = toIdx; idx <= fromIdx; idx++) {
              affectedPhases.add(GATES[idx].phase);
            }
            const previousSignOffs: Record<number, SignOff[]> = {};
            const phaseClosures = { ...p.phaseClosures };
            for (const phase of affectedPhases) {
              const closure = phaseClosures[phase];
              if (!closure) continue;
              previousSignOffs[phase] = closure.signOffs.map((s) => ({ ...s }));
              phaseClosures[phase] = {
                ...closure,
                signOffs: closure.signOffs.map((s) => ({ role: s.role })),
              };
            }

            const event = {
              id: `BT-${Date.now()}`,
              date: dateStr,
              initiatedBy: initiatedBy?.trim() || undefined,
              reason,
              fromGateId,
              toGateId,
              reopenedGateIds: affectedIds,
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

        resetDemoData: () => set({ projects: seedProjects(), changes: seedChanges() }),
      };
    },
    {
      name: 'mbc360-demo-store',
      version: 11,
      // `permissionGrid` is server state, always loaded fresh on startup — never
      // persist a stale copy to localStorage. (Functions and everything else are
      // handled as before; this only strips the grid.)
      partialize: (state) => {
        const { permissionGrid: _omit, ...rest } = state;
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
      // Old persisted demo data doesn't fit the new schema, so re-seed instead of migrating it.
      migrate: () => ({ projects: seedProjects(), changes: seedChanges() }),
    },
  ),
);
