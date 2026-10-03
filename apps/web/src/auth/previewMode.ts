import { useMemo } from 'react';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';
import { useAppStore } from '../store/useAppStore';
import { useSession } from './useSession';

// "View as" preview (2026-10-03, project owner's choice of option 2): an
// administrator can preview the screens as another role. While previewing,
// every permission check ON SCREEN reads the previewed role, and nothing can be
// written. The server is never told: it keeps authorising every request with
// the real session, which is why a preview must be read-only — otherwise the
// screen would offer exactly what the previewed role may do while the server
// quietly carried it out with administrator rights.
//
// Before this, only two controls (gate decision, market approval) read the
// simulated role and everything else read the real one, so the screen was a
// mixture of two roles and still writable.

export interface PermissionView {
  /** The role keys every on-screen permission check should use. */
  roleKeys: string[];
  /** Admin as far as the SCREEN is concerned (false while previewing a non-admin role). */
  isAdmin: boolean;
  /** True while previewing a role other than the account's own. */
  previewing: boolean;
  previewRole: string | null;
  /** The account's real roles and admin flag, for the chip and the banner. */
  realRoleKeys: string[];
  realIsAdmin: boolean;
}

export function usePermissionView(): PermissionView {
  const { user, isAdmin: realIsAdmin } = useSession();
  const viewRole = useAppStore((s) => s.viewRole);
  return useMemo(() => {
    const realRoleKeys = (user?.roles ?? []).map((r) => r.key);
    // Only an administrator may preview — a preview of the admin screens by
    // anyone else would mostly show requests the server refuses.
    const previewing = realIsAdmin && !!viewRole && !realRoleKeys.includes(viewRole);
    return {
      roleKeys: previewing ? [viewRole!] : realRoleKeys,
      isAdmin: previewing ? viewRole === ADMIN_ROLE : realIsAdmin,
      previewing,
      previewRole: previewing ? viewRole : null,
      realRoleKeys,
      realIsAdmin,
    };
  }, [user, realIsAdmin, viewRole]);
}

// ---------------------------------------------------------------------------
// The write lock. Many screens call fetch() directly, so the lock sits on fetch
// itself: while previewing, any request to /api that is not a read is answered
// here with 423 and never leaves the browser. Every caller already surfaces a
// server message, so the user sees why. Signing out stays open.
// ---------------------------------------------------------------------------

export const PREVIEW_READ_ONLY_MESSAGE =
  'Preview mode is read-only. Switch "View as" back to your own role to make changes.';

let previewActive = false;

export function setPreviewWriteLock(active: boolean): void {
  previewActive = active;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

if (typeof window !== 'undefined' && !(window.fetch as { __previewGuard?: boolean }).__previewGuard) {
  const original = window.fetch.bind(window);
  const guarded = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (previewActive) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      if (path.startsWith('/api/') && !READ_METHODS.has(method) && !path.startsWith('/api/auth/logout')) {
        return Promise.resolve(
          new Response(JSON.stringify({ statusCode: 423, message: PREVIEW_READ_ONLY_MESSAGE }), {
            status: 423,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
    }
    return original(input, init);
  };
  (guarded as { __previewGuard?: boolean }).__previewGuard = true;
  window.fetch = guarded as typeof window.fetch;
}
