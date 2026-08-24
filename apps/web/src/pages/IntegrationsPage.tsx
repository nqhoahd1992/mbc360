import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Popconfirm, Space, Tag, Typography, message } from 'antd';
import {
  ApiOutlined,
  CheckCircleFilled,
  CloudOutlined,
  CopyOutlined,
  DisconnectOutlined,
  ExportOutlined,
  EyeOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { COSMETRI_DEFAULT_BASE_URL } from '../integrations/cosmetri';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { useSession } from '../auth/useSession';
import LabeledInput from '../components/LabeledInput';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';

function fmt(iso?: string | null): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '—';
}

// Integrations hub (decision A3): MBc360 is the single evidence & governance
// platform and INTEGRATES with specialist systems rather than replacing them.
// Cosmetri is strictly read-only master data; new raw materials are requested
// via the Power Apps change-request app; Graph/SharePoint is planned.
export default function IntegrationsPage() {
  const integrations = useAppStore((s) => s.integrations);
  const setPowerAppsUrl = useAppStore((s) => s.setPowerAppsUrl);
  const setGraphConfig = useAppStore((s) => s.setGraphConfig);
  const { isAdmin } = useSession();
  const { status: cosmetri, loading: cosmetriLoading, refresh: refreshCosmetriStatus } = useCosmetriStatus();

  const { powerApps, graph } = integrations;
  const graphDraft = useDraft(graph);

  // The eight-line token explanation is setup-time detail: true, but read once
  // and then in the way of the fields it describes.
  const [showTokenMechanics, setShowTokenMechanics] = useState(false);
  const [baseUrl, setBaseUrl] = useState(COSMETRI_DEFAULT_BASE_URL);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingNow, setRefreshingNow] = useState(false);
  const [powerAppsUrl, setPowerAppsUrlLocal] = useState(powerApps.newRawMaterialUrl);
  // Admin-only token inspection (masked until revealed). Fetched on demand from
  // the audited admin endpoint — tokens are never part of the public status.
  const [secrets, setSecrets] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

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

  // Admin-only: fetch the live token pair from the audited endpoint. The eye
  // toggle on Input.Password keeps them masked until the admin chooses to reveal.
  const onShowTokens = async () => {
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

  const isPlaceholderUrl = powerApps.newRawMaterialUrl.includes('REPLACE-');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ maxWidth: 900 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <ApiOutlined style={{ marginRight: 8 }} />
          Integrations
        </Typography.Title>
        <Typography.Text type="secondary">
          MBc360 is the single evidence &amp; governance platform — it integrates with specialist
          systems (Cosmetri, GMP Manufacturing, Power Apps, SharePoint) rather than replacing them.
        </Typography.Text>
      </div>

      {/* Two EQUAL columns from ~1000px up: Cosmetri on the left, the two
          smaller integrations stacked on the right. The page used to be a
          single 980px-wide column, so on any normal desktop window the right
          ~40% of the screen was empty while the Cosmetri explanation wrapped
          into an eight-line block. Stretching the cards to full width instead
          would have been worse: the prose would run to 150+ characters a line.
          `flex-wrap` collapses this to one column on a narrow window, keeping
          the reading order.

          Equal, not weighted, and that is measured rather than felt: the widest
          thing in the left column is the 680px-capped token-reveal block, and
          in the right column the 640px-capped App URL row — near enough
          identical, so there is nothing for extra width on one side to do. The
          left column is TALLER (more stacked blocks), which needs no extra
          width at all. A first pass used 620/420 on the reasoning that Cosmetri
          "carries more"; besides being unmeasured, `flex-grow: 1` on both sides
          splits the surplus EQUALLY, so that ratio quietly decayed toward 1:1
          as the window widened — the basis numbers only ever set the wrap
          threshold. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: '1 1 480px', minWidth: 0, display: 'grid', gap: 16 }}>

      {/* --- Cosmetri ---------------------------------------------------- */}
      <Card
        size="small"
        loading={cosmetriLoading}
        title={
          <span>
            <CloudOutlined style={{ marginRight: 8 }} />
            Cosmetri — raw material, formula &amp; compliance master data
            {cosmetri.connected ? (
              <Tag icon={<CheckCircleFilled />} color="success" style={{ marginLeft: 8 }}>
                Connected
              </Tag>
            ) : (
              <Tag style={{ marginLeft: 8 }}>Not connected</Tag>
            )}
          </span>
        }
        extra={
          cosmetri.connected &&
          isAdmin && (
            <Space size={8}>
              <Button size="small" icon={<ReloadOutlined />} loading={refreshingNow} onClick={onRefreshNow}>
                Refresh now
              </Button>
              <Popconfirm title="Disconnect and discard the stored tokens?" onConfirm={onDisconnect}>
                <Button size="small" danger icon={<DisconnectOutlined />} loading={disconnecting}>
                  Disconnect
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Read-only integration (confirmed decision A3)"
          description={
            <span>
              The connection is held entirely by the MBc360 backend, never the browser. Master data
              editing stays in Cosmetri — MBc360 never writes back.{' '}
              <Typography.Link onClick={() => setShowTokenMechanics((open) => !open)}>
                {showTokenMechanics ? 'Hide how the tokens work' : 'How the tokens work'}
              </Typography.Link>
              {showTokenMechanics && (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  Paste in an <b>access_token</b> and <b>refresh_token</b> obtained out-of-band (e.g.
                  from Cosmetri's own admin console). The backend validates them immediately by
                  exchanging the refresh token (<code>PUT /oauth/token</code>,
                  grant_type=refresh_token), which also returns a freshly-rotated pair — so you never
                  type an expiry date by hand. A scheduled job then keeps the access token refreshed
                  well before its 1-hour expiry, so the Cosmetri account password is not needed again
                  unless the refresh chain lapses entirely.
                </Typography.Paragraph>
              )}
            </span>
          }
        />

        {!cosmetri.connected ? (
          isAdmin ? (
            <Space orientation="vertical" style={{ width: '100%', maxWidth: 520 }}>
              <LabeledInput label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              <LabeledInput
                label="Access token"
                placeholder="Paste the current access_token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <LabeledInput
                label="Refresh token"
                placeholder="Paste the current refresh_token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
              <Button
                type="primary"
                loading={connecting}
                disabled={!baseUrl.trim() || !accessToken.trim() || !refreshToken.trim()}
                onClick={onConnect}
              >
                Connect
              </Button>
            </Space>
          ) : (
            <Alert
              type="warning"
              showIcon
              title="Admin access required"
              description="Sign in with an account that holds the admin role to connect Cosmetri."
            />
          )
        ) : (
          <>
            {cosmetri.lastRefreshError && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                title="Last automatic refresh failed"
                description={cosmetri.lastRefreshError}
              />
            )}
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Base URL">{cosmetri.baseUrl}</Descriptions.Item>
              <Descriptions.Item label="Access token expires">{fmt(cosmetri.accessTokenExpiresAt)}</Descriptions.Item>
              <Descriptions.Item label="Refresh token expires">{fmt(cosmetri.refreshTokenExpiresAt)}</Descriptions.Item>
              <Descriptions.Item label="Connected at">{fmt(cosmetri.connectedAt)}</Descriptions.Item>
              <Descriptions.Item label="Last auto-refreshed">{fmt(cosmetri.lastRefreshedAt)}</Descriptions.Item>
              <Descriptions.Item label="Available data">
                Raw materials (incl. supplier name, quality status), formulas &amp; composition,
                compliance (INCI / CAS / % w/w) — used by the Formula BOM import and the automatic
                prohibited/caution ingredient screen.
              </Descriptions.Item>
            </Descriptions>

            {/* Admin-only live token inspection (audited). Not part of /status. */}
            {isAdmin && (
              <div style={{ marginTop: 12 }}>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 8 }}
                  message="Live credentials — admin only, viewing is audited"
                  description="These are the actual Cosmetri OAuth tokens the backend uses. Anyone holding them can call Cosmetri as this account until they rotate or expire. Reveal only when needed for debugging, don't paste them elsewhere, and remember the refresh token is rotated on every refresh (a copied value goes stale)."
                />
                {!secrets ? (
                  <Button size="small" icon={<EyeOutlined />} loading={loadingSecrets} onClick={onShowTokens}>
                    Show access &amp; refresh tokens
                  </Button>
                ) : (
                  <Space orientation="vertical" style={{ width: '100%', maxWidth: 680 }}>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        access_token
                      </Typography.Text>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input.Password readOnly value={secrets.accessToken} />
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => copyToken(secrets.accessToken, 'access_token')}
                        />
                      </Space.Compact>
                    </div>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        refresh_token
                      </Typography.Text>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input.Password readOnly value={secrets.refreshToken} />
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => copyToken(secrets.refreshToken, 'refresh_token')}
                        />
                      </Space.Compact>
                    </div>
                    <Button size="small" onClick={() => setSecrets(null)}>
                      Hide tokens
                    </Button>
                  </Space>
                )}
              </div>
            )}
          </>
        )}
      </Card>
        </div>

        <div style={{ flex: '1 1 480px', minWidth: 0, display: 'grid', gap: 16 }}>

      {/* --- Power Apps ---------------------------------------------------- */}
      <Card
        size="small"
        title={
          <span>
            <LinkOutlined style={{ marginRight: 8 }} />
            Power Apps — "Create new raw material" change request
          </span>
        }
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          Confirmed process for a raw material that does not exist in Cosmetri yet: a research team
          member raises a <b>Create new raw material</b> change request in Power Apps → the request
          goes through its approval workflow → on approval the material is entered into Cosmetri →
          it becomes available to MBc360 via the API. MBc360 links to this app wherever an
          ingredient is not yet selectable.
        </Typography.Paragraph>
        {isPlaceholderUrl && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title="Placeholder URL — replace with the real Power Apps link when available."
          />
        )}
        <Space.Compact style={{ width: '100%', maxWidth: 640 }}>
          <Input disabled value="App URL" style={{ width: 90, flexShrink: 0 }} />
          <Input
            value={powerAppsUrl}
            onChange={(e) => setPowerAppsUrlLocal(e.target.value)}
          />
          <Button
            type="primary"
            disabled={powerAppsUrl === powerApps.newRawMaterialUrl}
            onClick={() => {
              setPowerAppsUrl(powerAppsUrl.trim());
              message.success('Power Apps URL saved.');
            }}
          >
            Save
          </Button>
        </Space.Compact>
        <div style={{ marginTop: 8 }}>
          <Button
            size="small"
            icon={<ExportOutlined />}
            href={powerApps.newRawMaterialUrl}
            target="_blank"
            disabled={isPlaceholderUrl}
          >
            Open request app
          </Button>
        </div>
      </Card>

      {/* --- Microsoft Graph (planned) ------------------------------------ */}
      <Card
        size="small"
        title={
          <span>
            <CloudOutlined style={{ marginRight: 8 }} />
            Microsoft Graph — SharePoint lists
            <Tag color="default" style={{ marginLeft: 8 }}>
              Planned
            </Tag>
          </span>
        }
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          Planned integration for reading SharePoint lists (e.g. the Raw Material list) via the
          Microsoft Graph API. It reuses the Entra ID app registration already configured
          server-side for sign-in (<code>AUTH_TENANT_ID</code> / <code>AUTH_CLIENT_ID</code> in{' '}
          <code>apps/api/.env</code>, extended with a Graph scope) rather than a separate app —
          so there is no tenant/client ID to enter here, only which site and list to read.
        </Typography.Paragraph>
        <Space orientation="vertical" style={{ width: '100%', maxWidth: 520 }}>
          <LabeledInput
            label="Site URL"
            placeholder="https://yourtenant.sharepoint.com/sites/..."
            value={graphDraft.draft.sharepointSiteUrl}
            onChange={(e) => graphDraft.update((prev) => ({ ...prev, sharepointSiteUrl: e.target.value }))}
          />
          <LabeledInput
            label="List name"
            placeholder="Raw Materials"
            value={graphDraft.draft.rawMaterialListName}
            onChange={(e) => graphDraft.update((prev) => ({ ...prev, rawMaterialListName: e.target.value }))}
          />
        </Space>
        <SaveBar
          dirty={graphDraft.dirty}
          onSave={() => {
            setGraphConfig(graphDraft.draft);
            graphDraft.markSaved();
          }}
          onDiscard={graphDraft.discard}
        />
      </Card>
        </div>
      </div>
    </div>
  );
}
