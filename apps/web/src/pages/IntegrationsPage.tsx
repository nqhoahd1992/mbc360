import { useState } from 'react';
import { Alert, Button, Input, Popconfirm, Space, message } from 'antd';
import {
  ApiOutlined,
  CalendarOutlined,
  CloseCircleFilled,
  CopyOutlined,
  DisconnectOutlined,
  ExperimentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  HistoryOutlined,
  KeyOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { COSMETRI_DEFAULT_BASE_URL } from '../integrations/cosmetri';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { useSession } from '../auth/useSession';
import '../styles/concept.css';
import './IntegrationsPage.css';

/** "2 Oct 2026, 11:22" */
function absolute(iso?: string | null): string {
  return iso ? dayjs(iso).format('D MMM YYYY, HH:mm') : '—';
}

/** "in 42 min" / "in 28 days" / "10 min ago" — relative to now. */
function relative(iso?: string | null): string {
  if (!iso) return '—';
  const minutes = dayjs(iso).diff(dayjs(), 'minute');
  const size = Math.abs(minutes);
  const amount =
    size < 60 ? `${Math.max(size, 1)} min` : size < 48 * 60 ? `${Math.round(size / 60)} h` : `${Math.round(size / 1440)} days`;
  return minutes >= 0 ? `in ${amount}` : `${amount} ago`;
}

function isPast(iso?: string | null): boolean {
  return !!iso && dayjs(iso).isBefore(dayjs());
}

// Integrations (decision A3): MBc360 reads master data from specialist systems
// rather than replacing them. Cosmetri is the one live integration and is
// strictly read-only.
//
// Redesigned 2026-10-02 (wireframe option A, "status first"): an admin opens
// this page to answer "is the connection alive, and for how long" — so the
// status badge and the three token clocks come first, a failing refresh is
// raised to a banner with its own fix, and the destructive actions (reveal
// tokens, disconnect) sit apart in a Danger zone rather than mid-flow. The
// Power Apps URL and Microsoft Graph cards were removed on the user's request;
// their store slices are untouched (CosmetriImportModal still reads the Power
// Apps URL).
//
// System Administrator only: the link is admin-only in globalNav, and a
// non-admin who deep-links here gets a notice instead of the page.
export default function IntegrationsPage() {
  const { isAdmin } = useSession();
  const { status: cosmetri, loading, refresh: refreshCosmetriStatus } = useCosmetriStatus();

  const [showTokenMechanics, setShowTokenMechanics] = useState(false);
  const [baseUrl, setBaseUrl] = useState(COSMETRI_DEFAULT_BASE_URL);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingNow, setRefreshingNow] = useState(false);
  // Live token inspection (masked until revealed). Fetched on demand from the
  // audited endpoint — tokens are never part of the public status.
  const [secrets, setSecrets] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

  if (!isAdmin) {
    return (
      <Alert
        type="warning"
        showIcon
        title="Admin access required"
        description="Integrations are managed by System Administrators. Sign in with an account that holds the admin role."
      />
    );
  }

  const onConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/cosmetri/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, accessToken, refreshToken }),
      });
      const body = await res.json().catch(() => undefined);
      if (!res.ok) throw new Error(body?.message ?? `Connection failed (HTTP ${res.status})`);
      setAccessToken('');
      setRefreshToken('');
      await refreshCosmetriStatus();
      message.success('Connected to Cosmetri — the backend now keeps the access token refreshed automatically.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/cosmetri/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Disconnect failed.');
      setSecrets(null);
      await refreshCosmetriStatus();
      message.success('Disconnected from Cosmetri.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Disconnect failed.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Manual fallback for the scheduled refresh job (e.g. the API was down past
  // the access token's expiry) — forces an immediate token exchange instead
  // of waiting for the next cron tick.
  const onRefreshNow = async () => {
    setRefreshingNow(true);
    try {
      const res = await fetch('/api/integrations/cosmetri/refresh-now', { method: 'POST' });
      const body = await res.json().catch(() => undefined);
      if (!res.ok) throw new Error(body?.message ?? 'Refresh failed.');
      await refreshCosmetriStatus();
      message.success('Access token refreshed.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Refresh failed.');
    } finally {
      setRefreshingNow(false);
    }
  };

  const onToggleTokens = async () => {
    if (secrets) {
      setSecrets(null);
      return;
    }
    setLoadingSecrets(true);
    try {
      const res = await fetch('/api/integrations/cosmetri/secrets');
      const body = await res.json().catch(() => undefined);
      if (!res.ok) throw new Error(body?.message ?? `Could not read tokens (HTTP ${res.status})`);
      setSecrets({ accessToken: body.accessToken, refreshToken: body.refreshToken });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not read tokens.');
    } finally {
      setLoadingSecrets(false);
    }
  };

  const copyToken = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied to clipboard.`);
    } catch {
      message.error('Copy failed — your browser blocked clipboard access.');
    }
  };

  const failing = cosmetri.connected && !!cosmetri.lastRefreshError;
  const accessExpired = isPast(cosmetri.accessTokenExpiresAt);

  const statusTag = !cosmetri.connected ? (
    <span className="intg-tag intg-tag-plain">Not connected</span>
  ) : failing ? (
    <span className="intg-tag intg-tag-bad">Refresh failing</span>
  ) : (
    <span className="intg-tag intg-tag-ok">Connected</span>
  );

  const identity = (
    <div className="intg-identity">
      <span className="intg-icon-tile" aria-hidden="true">
        <ExperimentOutlined />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="intg-name-row">
          <span className="intg-name">Cosmetri</span>
          {statusTag}
        </div>
        <div className="intg-sub">Raw material, formula &amp; compliance master data · read-only</div>
      </div>
    </div>
  );

  const howTo = (
    <div className="intg-howto">
      <p>
        1. Paste an <b>access_token</b> and <b>refresh_token</b> issued from Cosmetri's admin console.
      </p>
      <p>
        2. The backend exchanges the refresh token immediately (<code>PUT /oauth/token</code>) — that validates the
        pair and returns a fresh one, so no expiry date is typed by hand.
      </p>
      <p>
        3. A scheduled job renews the access token well before its 1-hour expiry. The Cosmetri password is not needed
        again unless the refresh chain lapses.
      </p>
    </div>
  );

  let cosmetriCard;
  if (loading) {
    cosmetriCard = (
      <div className="intg-card intg-card-body" aria-busy="true">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="intg-skel" style={{ width: 32, height: 32 }} />
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="intg-skel" style={{ width: 160, height: 16 }} />
            <div className="intg-skel" style={{ width: 288, maxWidth: '60vw', height: 12 }} />
          </div>
        </div>
        <div className="intg-stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="intg-skel" style={{ height: 92, borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="intg-skel" style={{ height: 16, maxWidth: 520 }} />
          ))}
        </div>
      </div>
    );
  } else if (!cosmetri.connected) {
    const ready = !!baseUrl.trim() && !!accessToken.trim() && !!refreshToken.trim();
    cosmetriCard = (
      <div className="intg-card">
        <div className="intg-card-head">{identity}</div>
        <div className="intg-card-body">
          <div className="intg-connect">
            <form
              className="intg-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (ready) void onConnect();
              }}
            >
              <label>
                <span className="intg-field-label">Base URL</span>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </label>
              <label>
                <span className="intg-field-label">Access token</span>
                <Input
                  placeholder="Paste the current access_token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </label>
              <label>
                <span className="intg-field-label">Refresh token</span>
                <Input
                  placeholder="Paste the current refresh_token"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                />
              </label>
              <div>
                <Button type="primary" htmlType="submit" icon={<ApiOutlined />} loading={connecting} disabled={!ready}>
                  Connect
                </Button>
              </div>
              <div className="intg-hint">Connect enables once all three fields are filled.</div>
            </form>
            <div>
              <div className="intg-aside-title">How the tokens work</div>
              {howTo}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    const refreshButton = (
      <Button
        type={failing ? 'primary' : 'default'}
        icon={<ReloadOutlined />}
        loading={refreshingNow}
        onClick={onRefreshNow}
        style={{ flexShrink: 0 }}
      >
        Refresh now
      </Button>
    );
    cosmetriCard = (
      <div className="intg-card">
        <div className="intg-card-head">
          {identity}
          {!failing && refreshButton}
        </div>
        <div className="intg-card-body">
          {failing && (
            <div className="intg-banner" role="alert">
              <CloseCircleFilled className="intg-banner-icon" />
              <div className="intg-banner-text">
                <div className="intg-banner-title">
                  Automatic refresh is failing —{' '}
                  {accessExpired
                    ? `the access token expired ${relative(cosmetri.accessTokenExpiresAt)}`
                    : `the access token expires ${relative(cosmetri.accessTokenExpiresAt)}`}
                </div>
                <div className="intg-banner-detail">{cosmetri.lastRefreshError}</div>
              </div>
              {refreshButton}
            </div>
          )}

          <div className="intg-stats">
            <div className="intg-stat">
              <div className="intg-stat-label">
                <KeyOutlined />
                Access token expires
              </div>
              <div className={`intg-stat-value${failing || accessExpired ? ' intg-bad-text' : ''}`}>
                {accessExpired ? `Expired ${relative(cosmetri.accessTokenExpiresAt)}` : relative(cosmetri.accessTokenExpiresAt)}
              </div>
              <div className="intg-stat-sub">{absolute(cosmetri.accessTokenExpiresAt)}</div>
            </div>
            <div className="intg-stat">
              <div className="intg-stat-label">
                <CalendarOutlined />
                Refresh token expires
              </div>
              <div className={`intg-stat-value${isPast(cosmetri.refreshTokenExpiresAt) ? ' intg-bad-text' : ''}`}>
                {relative(cosmetri.refreshTokenExpiresAt)}
              </div>
              <div className="intg-stat-sub">{absolute(cosmetri.refreshTokenExpiresAt)}</div>
            </div>
            <div className="intg-stat">
              <div className="intg-stat-label">
                <HistoryOutlined />
                Last automatic refresh
              </div>
              <div className={`intg-stat-value${failing ? ' intg-bad-text' : ''}`}>
                {cosmetri.lastRefreshedAt ? relative(cosmetri.lastRefreshedAt) : 'Not yet'}
              </div>
              <div className="intg-stat-sub">{failing ? 'Latest attempt failed' : 'Runs every 10 min'}</div>
            </div>
          </div>

          <dl className="intg-dl">
            <dt>Base URL</dt>
            <dd className="intg-mono">{cosmetri.baseUrl}</dd>
            <dt>Connected since</dt>
            <dd>{absolute(cosmetri.connectedAt)}</dd>
            <dt>Used by</dt>
            <dd>Formula BOM import · automatic prohibited / caution ingredient screen</dd>
          </dl>

          <div className="intg-note">
            <SafetyCertificateOutlined />
            <span>
              Read-only. The backend holds the tokens and renews them every 10 min — MBc360 never writes to Cosmetri.{' '}
              <button type="button" className="intg-link" onClick={() => setShowTokenMechanics((open) => !open)}>
                {showTokenMechanics ? 'Hide how the tokens work' : 'How the tokens work'}
              </button>
            </span>
          </div>
          {showTokenMechanics && howTo}
        </div>
      </div>
    );
  }

  return (
    <div className="concept intg">
      <div className="intg-header">
        <h1 className="intg-title">Integrations</h1>
        <p className="intg-desc">MBc360 reads master data from specialist systems rather than replacing them.</p>
      </div>

      {cosmetriCard}

      {!loading && cosmetri.connected && (
        <div className="intg-card">
          <div className="intg-danger-title">Danger zone</div>
          <div className="intg-danger-row">
            <div className="intg-danger-text">
              <div className="intg-danger-name">Live tokens</div>
              <div className="intg-danger-desc">
                Viewing is audited. The refresh token rotates on every refresh, so a copied value goes stale.
              </div>
            </div>
            <Button
              icon={secrets ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              loading={loadingSecrets}
              onClick={onToggleTokens}
            >
              {secrets ? 'Hide tokens' : 'Show tokens'}
            </Button>
          </div>
          {secrets && (
            <div className="intg-reveal">
              {(
                [
                  ['access_token', secrets.accessToken],
                  ['refresh_token', secrets.refreshToken],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <div className="intg-reveal-label">{label}</div>
                  <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                    <Input.Password readOnly value={value} className="intg-mono" />
                    <Button icon={<CopyOutlined />} aria-label={`Copy ${label}`} onClick={() => copyToken(value, label)} />
                  </Space.Compact>
                </div>
              ))}
            </div>
          )}
          <div className="intg-danger-row">
            <div className="intg-danger-text">
              <div className="intg-danger-name">Disconnect Cosmetri</div>
              <div className="intg-danger-desc">
                Discards the stored tokens. Formula BOM import stops until someone reconnects.
              </div>
            </div>
            <Popconfirm title="Disconnect and discard the stored tokens?" okButtonProps={{ danger: true }} okText="Disconnect" onConfirm={onDisconnect}>
              <Button danger icon={<DisconnectOutlined />} loading={disconnecting}>
                Disconnect
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}
    </div>
  );
}
