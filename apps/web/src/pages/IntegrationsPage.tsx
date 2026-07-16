import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Popconfirm, Space, Tag, Typography, message } from 'antd';
import {
  ApiOutlined,
  CheckCircleFilled,
  CloudOutlined,
  DisconnectOutlined,
  ExportOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { cosmetriAuthenticate } from '../integrations/cosmetri';

function maskToken(token?: string): string {
  if (!token) return '—';
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

// Integrations hub (decision A3): MBc360 is the single evidence & governance
// platform and INTEGRATES with specialist systems rather than replacing them.
// Cosmetri is strictly read-only master data; new raw materials are requested
// via the Power Apps change-request app; Graph/SharePoint is planned.
export default function IntegrationsPage() {
  const integrations = useAppStore((s) => s.integrations);
  const connectCosmetri = useAppStore((s) => s.connectCosmetri);
  const disconnectCosmetri = useAppStore((s) => s.disconnectCosmetri);
  const setPowerAppsUrl = useAppStore((s) => s.setPowerAppsUrl);
  const setGraphConfig = useAppStore((s) => s.setGraphConfig);

  const { cosmetri, powerApps, graph } = integrations;

  const [baseUrl, setBaseUrl] = useState(cosmetri.baseUrl);
  const [username, setUsername] = useState(cosmetri.username ?? '');
  const [password, setPassword] = useState(''); // transient — never persisted
  const [connecting, setConnecting] = useState(false);
  const [powerAppsUrl, setPowerAppsUrlLocal] = useState(powerApps.newRawMaterialUrl);

  const onConnect = async () => {
    setConnecting(true);
    try {
      const tokens = await cosmetriAuthenticate(baseUrl, username, password);
      connectCosmetri(baseUrl, username, tokens);
      setPassword('');
      message.success('Connected to Cosmetri — access and refresh tokens stored.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const isPlaceholderUrl = powerApps.newRawMaterialUrl.includes('REPLACE-');

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <ApiOutlined style={{ marginRight: 8 }} />
          Integrations
        </Typography.Title>
        <Typography.Text type="secondary">
          MBc360 is the single evidence &amp; governance platform — it integrates with specialist
          systems (Cosmetri, GMP Manufacturing, Power Apps, SharePoint) rather than replacing them.
        </Typography.Text>
      </div>

      {/* --- Cosmetri ---------------------------------------------------- */}
      <Card
        size="small"
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
          cosmetri.connected && (
            <Popconfirm title="Disconnect and discard the stored tokens?" onConfirm={disconnectCosmetri}>
              <Button size="small" danger icon={<DisconnectOutlined />}>
                Disconnect
              </Button>
            </Popconfirm>
          )
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Read-only integration (confirmed decision A3)"
          description={
            <span>
              Authentication follows the Cosmetri API password grant: <code>POST /oauth/token</code>{' '}
              with your Cosmetri username/password returns an <b>access_token</b> (short-lived) and a{' '}
              <b>refresh_token</b>; expired access tokens are renewed via{' '}
              <code>PUT /oauth/token</code> (grant_type=refresh_token). Master data editing stays in
              Cosmetri — MBc360 never writes back. <b>Demo note:</b> this build simulates the
              connection locally; production must exchange credentials through the MBc360 backend,
              never from the browser, and the password is never persisted.
            </span>
          }
        />

        {!cosmetri.connected ? (
          <Space direction="vertical" style={{ width: '100%', maxWidth: 520 }}>
            <Input addonBefore="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <Input
              addonBefore="Username"
              placeholder="Cosmetri user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input.Password
              addonBefore="Password"
              placeholder="Used once to request tokens — not stored"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="primary"
              loading={connecting}
              disabled={!username.trim() || !password.trim()}
              onClick={onConnect}
            >
              Connect &amp; generate tokens
            </Button>
          </Space>
        ) : (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Base URL">{cosmetri.baseUrl}</Descriptions.Item>
            <Descriptions.Item label="Username">{cosmetri.username}</Descriptions.Item>
            <Descriptions.Item label="Access token">
              <code>{maskToken(cosmetri.accessToken)}</code>{' '}
              <span style={{ color: '#999' }}>
                expires {cosmetri.accessTokenExpiresAt?.slice(0, 16).replace('T', ' ')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Refresh token">
              <code>{maskToken(cosmetri.refreshToken)}</code>{' '}
              <span style={{ color: '#999' }}>
                expires {cosmetri.refreshTokenExpiresAt?.slice(0, 16).replace('T', ' ')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Connected at">{cosmetri.lastSyncAt}</Descriptions.Item>
            <Descriptions.Item label="Available data">
              Raw materials (incl. supplier name, quality status), formulas &amp; composition,
              compliance (INCI / CAS / % w/w) — used by the Formula BOM import and the automatic
              prohibited/caution ingredient screen.
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

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
            message="Placeholder URL — replace with the real Power Apps link when available."
          />
        )}
        <Space.Compact style={{ width: '100%', maxWidth: 640 }}>
          <Input
            addonBefore="App URL"
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
          Microsoft Graph API. Connection settings can be recorded now; the sync itself is not part
          of this demo.
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: '100%', maxWidth: 520 }}>
          <Input
            addonBefore="Site URL"
            placeholder="https://yourtenant.sharepoint.com/sites/..."
            value={graph.sharepointSiteUrl}
            onChange={(e) => setGraphConfig({ sharepointSiteUrl: e.target.value })}
          />
          <Input
            addonBefore="List name"
            placeholder="Raw Materials"
            value={graph.rawMaterialListName}
            onChange={(e) => setGraphConfig({ rawMaterialListName: e.target.value })}
          />
          <Input
            addonBefore="Tenant ID"
            value={graph.tenantId}
            onChange={(e) => setGraphConfig({ tenantId: e.target.value })}
          />
          <Input
            addonBefore="Client ID"
            value={graph.clientId}
            onChange={(e) => setGraphConfig({ clientId: e.target.value })}
          />
        </Space>
      </Card>
    </div>
  );
}
