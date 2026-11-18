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

// Why a signed-in account is not let in (2026-10-02 access rule: Microsoft 365
// proves who the person is; entering needs an active account with a role).
export interface AccessDenial {
  reason: 'no_role' | 'inactive';
  email?: string;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [denied, setDenied] = useState<AccessDenial | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      setUser(res.ok ? await res.json() : null);
      // A 403 here means the session is valid but the account may not enter
      // (its last role removed, or deactivated) — say which on the sign-in
      // screen rather than showing it as an ordinary signed-out state.
      if (res.status === 403) {
        const body = (await res.json().catch(() => undefined)) as { code?: string; email?: string } | undefined;
        setDenied({ reason: body?.code === 'INACTIVE' ? 'inactive' : 'no_role', email: body?.email });
      } else {
        setDenied(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Ends the local session, then sends the browser where the server says.
  // Connected to AppHub, that is {HUB_URL}/logout?app=: AppHub signs the
  // person out of every app, of itself and of Microsoft. Otherwise (dev) the
  // app's own base URL.
  // Ask the server first, then leave for AppHub WITHOUT clearing the user: clearing it renders the login screen, whose
  // auto-redirect to AppHub sign-in would cancel this sign-out (AppHub docs/13). replace(): Back can't return here.
  const logout = useCallback(async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    const body = res?.ok ? ((await res.json()) as { redirectUrl?: string }) : undefined;
    if (body?.redirectUrl) {
      window.location.replace(body.redirectUrl);
      return;
    }
    setUser(null);
  }, []);

  return {
    user,
    denied,
    loading,
    isAdmin: user?.roles.some((r) => r.key === ADMIN_ROLE) ?? false,
    refresh,
    logout,
  };
}
