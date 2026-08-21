// Thin fetch wrappers for the M3 Phase 1 project endpoints (2026-07-26).
// Same shape as apps/web/src/integrations/cosmetri.ts: relative `/api/...` URLs
// through the Vite proxy (never an absolute origin — see CLAUDE.md).
import type {
  AngleRow,
  ChangeRecord,
  ChecklistItem,
  CostingInputs,
  GateCheck,
  GateRecord,
  ProjectData,
  ProjectIdentity,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '@mbc360/shared/types';

export interface ProjectListItem {
  id: string;
  productCode: string;
  productSku: string;
  productGroup: string;
  projectLead: string;
  ownerDepartment: string;
  dateOpened: string;
  targetLaunchDate: string;
  markets: string[];
  version: number;
  archivedAt?: string;
  archivedBy?: string;
}

// Every read and every write returns the whole project plus the version the
// next write must echo back, so the caller can replace its cached copy
// wholesale and always holds a fresh version number.
export interface ProjectEnvelope {
  project: ProjectData;
  version: number;
  // Change Control rows for this project (kept in a separate store slice).
  changes: ChangeRecord[];
}

// Thrown for any non-2xx so callers can surface the server's own message
// instead of failing silently (the old store guards just no-op'd, which hid
// rejections from the user).
export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  // A stale optimistic-lock write — the caller should reload, not retry blindly.
  get isConflict(): boolean {
    return this.status === 409;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

// One key per user INTENT, reused across retries of that same intent — that is
// what makes a double-clicked Save or a retried network call replay the first
// response instead of creating a second project / backtrack event.
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function listProjects(includeArchived = false): Promise<ProjectListItem[]> {
  return request<ProjectListItem[]>(`/projects${includeArchived ? '?includeArchived=1' : ''}`);
}

// Archive is reversible and needs the `project|archive` capability; deleting is
// admin-only and irreversible (it removes the audit trail too).
export function setProjectArchived(id: string, archived: boolean): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(
    `/projects/${encodeURIComponent(id)}/${archived ? 'archive' : 'restore'}`,
    { method: 'POST' },
  );
}

export function getProject(id: string): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}`);
}

export function createProject(
  identity: ProjectIdentity,
  idempotencyKey: string,
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>('/projects', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      id: identity.id,
      productCode: identity.productCode,
      projectLead: identity.projectLead,
      productGroup: identity.productGroup,
      brandCustomer: identity.brandCustomer,
      dateOpened: identity.dateOpened,
      targetLaunchDate: identity.targetLaunchDate,
      productSku: identity.productSku,
      ownerDepartment: identity.ownerDepartment,
      markets: identity.markets,
      reviewers: identity.reviewers,
    }),
  });
}

export function deleteProject(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function updateGate(
  id: string,
  gateId: string,
  patch: Partial<GateRecord>,
  expectedVersion: number,
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(
    `/projects/${encodeURIComponent(id)}/gates/${encodeURIComponent(gateId)}`,
    { method: 'PUT', body: JSON.stringify({ ...patch, expectedVersion }) },
  );
}

export function updateGates(
  id: string,
  gates: GateRecord[],
  expectedVersion: number,
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}/gates`, {
    method: 'PUT',
    body: JSON.stringify({ gates, expectedVersion }),
  });
}

export function backtrackGate(
  id: string,
  body: { fromGateId: string; toGateId: string; reason: string; initiatedBy?: string },
  expectedVersion: number,
  idempotencyKey: string,
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}/backtrack`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...body, expectedVersion }),
  });
}

// --- M3 Phase 2-6 section writes -------------------------------------------
// One helper per store bulk action. All of them send `expectedVersion` and get
// the whole project back, so the caller replaces its cached copy and always
// holds a fresh version — identical to the Phase 1 endpoints.
const put = (id: string, path: string, body: object, expectedVersion: number) =>
  request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ ...body, expectedVersion }),
  });

export const setChecklistSection = (id: string, section: string, items: ChecklistItem[], v: number) =>
  put(id, `checklists/${encodeURIComponent(section)}`, { items }, v);

export const setRequirementSection = (id: string, section: string, items: RequirementItem[], v: number) =>
  put(id, `requirements/${encodeURIComponent(section)}`, { items }, v);

export const setGateChecks = (
  id: string,
  updates: { gate: string; check: string; patch: Partial<GateCheck> }[],
  v: number,
) => put(id, 'gate-checks', { updates }, v);

export const setAngles = (id: string, phase: number, angles: AngleRow[], v: number) =>
  put(id, `phases/${phase}/angles`, { angles }, v);

// D1: three separate acts, not one field write. Assigning is the Lead's;
// signing and withdrawing belong to the assigned signer alone.
export const setSignOffAssignees = (
  id: string,
  phase: number,
  assignments: { role: SignOff['role']; userId?: string | null }[],
  v: number,
) => put(id, `phases/${phase}/sign-off-assignees`, { assignments }, v);

// Step-up (2026-08-21): optional "attach my saved signature" flow, gated by a
// one-time email code bound to this exact project/phase/role act. Absent
// `attachSignature`, signSignOff below behaves exactly as before this
// feature existed.
export const requestSignOffCode = (
  id: string,
  phase: number,
  role: SignOff['role'],
): Promise<{ sent: true }> =>
  request(`/projects/${encodeURIComponent(id)}/phases/${phase}/sign-offs/request-code`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

export const confirmSignOffCode = (
  id: string,
  phase: number,
  role: SignOff['role'],
  code: string,
): Promise<{ stepUpToken: string }> =>
  request(`/projects/${encodeURIComponent(id)}/phases/${phase}/sign-offs/confirm-code`, {
    method: 'POST',
    body: JSON.stringify({ role, code }),
  });

export const signSignOff = (
  id: string,
  phase: number,
  role: SignOff['role'],
  input: { decision?: string; comments?: string; attachSignature?: boolean; stepUpToken?: string },
  expectedVersion: number,
) =>
  request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}/phases/${phase}/sign-offs/sign`, {
    method: 'POST',
    body: JSON.stringify({ role, ...input, expectedVersion }),
  });

export const withdrawSignOff = (
  id: string,
  phase: number,
  role: SignOff['role'],
  reason: string,
  expectedVersion: number,
) =>
  request<ProjectEnvelope>(
    `/projects/${encodeURIComponent(id)}/phases/${phase}/sign-offs/withdraw`,
    { method: 'POST', body: JSON.stringify({ role, reason, expectedVersion }) },
  );

export const setEvidenceSummary = (id: string, phase: number, value: string, v: number) =>
  put(id, `phases/${phase}/evidence-summary`, { value }, v);

export const setPhaseKeyLinks = (id: string, phase: number, links: Record<string, string>, v: number) =>
  put(id, `phases/${phase}/key-links`, { links }, v);

export const acceptPreWork = (id: string, phase: number, expectedVersion: number) =>
  request<ProjectEnvelope>(
    `/projects/${encodeURIComponent(id)}/phases/${phase}/accept-pre-work`,
    { method: 'POST', body: JSON.stringify({ expectedVersion }) },
  );

export const setRegisterRows = (id: string, registerKey: string, rows: RegisterRow[], v: number) =>
  put(id, `registers/${encodeURIComponent(registerKey)}`, { rows }, v);

export const setEvidenceItems = (id: string, items: ProjectData['evidence'], v: number) =>
  put(id, 'evidence', { items }, v);

export const setBom = (id: string, lines: ProjectData['bom'], v: number) => put(id, 'bom', { lines }, v);

export const setPackagingBom = (id: string, lines: ProjectData['packagingBom'], v: number) =>
  put(id, 'packaging-bom', { lines }, v);

export const setFormulaProperties = (id: string, patch: ProjectData['formulaProperties'], v: number) =>
  put(id, 'formula-properties', { patch }, v);

export const setCosting = (id: string, patch: Partial<CostingInputs>, v: number) =>
  put(id, 'costing', { patch }, v);

// Only the Gate 1 opportunity fields are writable — see setIdentity in the API.
export const setIdentity = (id: string, patch: Partial<ProjectData['identity']>, v: number) =>
  put(id, 'identity', { patch }, v);

export const setNextActions = (
  id: string,
  gateIds: string[],
  actions: ProjectData['nextActions'],
  v: number,
) => put(id, 'next-actions', { gateIds, actions }, v);

export const setMarketTracks = (id: string, tracks: ProjectData['marketTracks'], v: number) =>
  put(id, 'market-tracks', { tracks }, v);

export const setStudyApprovals = (id: string, approvals: ProjectData['studyApprovals'], v: number) =>
  put(id, 'study-approvals', { approvals }, v);

export const setCapa = (id: string, records: ProjectData['capa'], v: number) =>
  put(id, 'capa', { records }, v);

export const setFeedback = (id: string, entries: ProjectData['feedback'], v: number) =>
  put(id, 'feedback', { entries }, v);

export const setChanges = (id: string, records: ChangeRecord[], v: number) =>
  put(id, 'changes', { records }, v);

export function createFormulaVersion(
  id: string,
  input: {
    version: string;
    changeType: 'Major' | 'Minor';
    reason?: string;
    initiatedBy?: string;
    majorCriteria?: string[];
    classificationConfirmedBy?: string;
  },
  expectedVersion: number,
  idempotencyKey: string,
): Promise<ProjectEnvelope> {
  return request<ProjectEnvelope>(`/projects/${encodeURIComponent(id)}/formula-versions`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...input, expectedVersion }),
  });
}
