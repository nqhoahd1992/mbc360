// My Account (2026-08-21): self-service signature storage and authenticator
// (TOTP) enrolment. Same `fetch` wrapper shape as projectsApi.ts, but there is
// no project/version envelope here — this is per-user, not per-project, data.

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

export interface TotpStatus {
  enrolled: boolean;
  activatedAt?: string;
  // Set up but never confirmed with a first code — authorises nothing.
  pending: boolean;
  lockedUntil?: string;
}

export interface TotpEnrollment {
  // Rendered as the QR code the authenticator app scans.
  otpauthUri: string;
  // The same secret in text, for entering by hand when scanning isn't possible.
  secret: string;
}

export const getMyTotpStatus = (): Promise<TotpStatus> => request('/totp');

export const beginTotpEnrollment = (): Promise<TotpEnrollment> =>
  request('/totp/enroll', { method: 'POST' });

// Entering a first correct code is what turns the enrolment into a usable
// factor; removing one likewise needs a current code, so a hijacked session
// cannot strip the control that protects a signature.
export const activateTotp = (code: string): Promise<TotpStatus> =>
  request('/totp/activate', { method: 'POST', body: JSON.stringify({ code }) });

export const removeTotp = (code: string): Promise<TotpStatus> =>
  request('/totp/remove', { method: 'POST', body: JSON.stringify({ code }) });
