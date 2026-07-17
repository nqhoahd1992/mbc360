import { useCallback, useEffect, useState } from 'react';

// Cosmetri connection status, read from the backend (apps/api/src/cosmetri/).
// Never carries tokens — those stay server-side (A3). Any signed-in user can
// read this (e.g. to decide whether "Import from Cosmetri" should be
// offered); connecting/disconnecting is admin-only (enforced server-side).
export interface CosmetriStatus {
  connected: boolean;
  baseUrl?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  connectedAt?: string;
  lastRefreshedAt?: string | null;
  lastRefreshError?: string | null;
}

export function useCosmetriStatus() {
  const [status, setStatus] = useState<CosmetriStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/cosmetri/status');
      setStatus(res.ok ? await res.json() : { connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
