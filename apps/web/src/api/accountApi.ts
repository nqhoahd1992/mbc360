// My Account (2026-08-21): self-service signature storage. Same `fetch`
// wrapper shape as projectsApi.ts, but there is no project/version envelope
// here — this is per-user, not per-project, data.

export interface SignatureResponse {
  hasSignature: boolean;
  imageData?: string;
  updatedAt?: string;
}

// Same shape as projectsApi.ts's ApiError — kept as its own class since this
// is a separate, non-project API surface.
export class AccountApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AccountApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/account${path}`, {
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
    throw new AccountApiError(res.status, message);
  }
  return body as T;
}

export const getMySignature = (): Promise<SignatureResponse> => request('/signature');

export const saveMySignature = (imageData: string): Promise<SignatureResponse> =>
  request('/signature', { method: 'PUT', body: JSON.stringify({ imageData }) });

export const deleteMySignature = (): Promise<SignatureResponse> =>
  request('/signature', { method: 'DELETE' });
