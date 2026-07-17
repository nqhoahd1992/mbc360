import { useCallback, useEffect, useState } from 'react';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';

// The real authenticated identity from the backend (M2), distinct from the
// "View as" simulation in utils/roles — that selector still drives which
// gate/phase permissions the demo UI simulates; this hook reflects who is
// actually signed in and whether they hold the real admin role (used to
// gate the Admin > Users screen where roles are assigned).
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  department: string | null;
  roles: { key: string; name: string }[];
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      setUser(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Ends the local session, then (for a real Entra sign-in) sends the
  // browser to Microsoft's RP-Initiated Logout so the SSO session ends too —
  // otherwise signing back in would silently re-authenticate with no
  // credential prompt. Entra redirects back to the app's base URL after.
  const logout = useCallback(async () => {
    setUser(null);
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const body = res.ok ? ((await res.json()) as { redirectUrl?: string }) : undefined;
    if (body?.redirectUrl) window.location.href = body.redirectUrl;
  }, []);

  return {
    user,
    loading,
    isAdmin: user?.roles.some((r) => r.key === ADMIN_ROLE) ?? false,
    refresh,
    logout,
  };
}
