// Thin fetch wrappers for the M3 Phase 1 project endpoints (2026-07-26).
// Same shape as apps/web/src/integrations/cosmetri.ts: relative `/api/...` URLs
// through the Vite proxy (never an absolute origin — see CLAUDE.md).
import type { GateRecord, ProjectData, ProjectIdentity } from '@mbc360/shared/types';

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
}

// Every read and every write returns the whole project plus the version the
// next write must echo back, so the caller can replace its cached copy
// wholesale and always holds a fresh version number.
export interface ProjectEnvelope {
  project: ProjectData;
  version: number;
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

export function listProjects(): Promise<ProjectListItem[]> {
  return request<ProjectListItem[]>('/projects');
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
