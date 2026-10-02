import { useParams } from 'react-router-dom';
import type { RegisterRow } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';

// The project's Claim -> Evidence Traceability rows, shared by ClaimSelect and
// DynamicTable. Kept out of ClaimSelect.tsx so that file exports only a
// component (Vite Fast Refresh cannot hot-reload a module that mixes both).
// Stable empty fallback. Returning `?? []` from a store selector allocates a new
// array on every call, so useSyncExternalStore compares snapshots by reference,
// sees a change every render and loops until React throws "Maximum update depth
// exceeded" — which is exactly what this did on first run. Same fix, and same
// reason, as EMPTY_GRANTS in utils/permissions.ts.
const NO_CLAIMS: RegisterRow[] = [];

export function useClaimRows(): RegisterRow[] {
  const { projectId } = useParams();
  return useAppStore(
    (s) => s.projects.find((p) => p.identity.id === projectId)?.registers['claimEvidenceTraceability'] ?? NO_CLAIMS,
  );
}

// The claim a row points at, or undefined — used by DynamicTable to show the
// inherited category/risk instead of asking for them again.
export function findClaim(claims: RegisterRow[], claimId: unknown): RegisterRow | undefined {
  const id = String(claimId ?? '').trim();
  if (!id) return undefined;
  return claims.find((c) => String(c.claimId ?? '').trim() === id);
}

