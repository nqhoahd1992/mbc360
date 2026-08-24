import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Popconfirm,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { reviewRoleLabel, rolesAssignedTo } from '@mbc360/shared/config/reviewers';
import {
  deleteMySignature,
  getMySignature,
  saveMySignature,
  type SignatureResponse,
} from '../api/accountApi';
import SignatureCaptureModal from '../components/SignatureCaptureModal';
import TotpEnrollCard from '../components/TotpEnrollCard';
import { useSession } from '../auth/useSession';
import { useAppStore } from '../store/useAppStore';
import { ADMIN_ROLE } from '../utils/roles';
import { TEXT } from '../theme/tokens';

// My Account (2026-08-21): the signing identity, in one place — who the app
// thinks you are, what your role lets you do, which review areas you hold on
// each project, the signature you attach to a sign-off, and the authenticator
// that proves it is you.
//
// Reworked 2026-08-22: it held only the two signing controls inside a
// `maxWidth: 640` column, so most of the screen was empty and the page could
// not answer the questions people actually open it for — "what am I allowed to
// do here?" and "what am I on the hook for?". Both answers were already in the
// browser (the permission grid the header's "View as" reads, and each project's
// reviewer assignments); nothing new is fetched for them.
export default function MyAccount() {
  const { user, isAdmin } = useSession();
  const permissionGrid = useAppStore((s) => s.permissionGrid);
  const projects = useAppStore((s) => s.projects);

  const [signature, setSignature] = useState<SignatureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMySignature()
      .then(setSignature)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load signature'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (imageData: string) => {
    setSignature(await saveMySignature(imageData));
  };

  const handleDelete = async () => {
    setSignature(await deleteMySignature());
  };

  const initials = (user?.displayName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  // What this account may actually do, read from the same live grid the
  // header's "View as" simulation and the server's guards use — so this card
  // cannot drift from what a save would be allowed to do.
  const capabilities = useMemo(() => {
    const roleKeys = (user?.roles ?? []).map((r) => r.key);
    const granted = new Set(roleKeys.flatMap((key) => permissionGrid?.grants[key] ?? []));
    const gateNumbers = GATES.filter((g) => granted.has(`gate:${g.id}|decide`)).map((g) => g.number);
    const phaseNumbers = PHASES.filter((p) => granted.has(`phase:${p.phase}|approve`)).map((p) => p.phase);
    return {
      gateNumbers,
      phaseNumbers,
      marketTrack: granted.has('market-track|approve'),
      archive: granted.has('project|archive'),
      any: granted.size > 0,
    };
  }, [permissionGrid, user?.roles]);

  // Which review areas this person holds, per project — the digital
  // replacement for the workbook's owner tab-prefix (see MySheets).
  const reviewAreas = useMemo(
    () =>
      projects
        .map((p) => ({
          id: p.identity.id,
          name: p.identity.id,
          sku: p.identity.productSku,
          areas: rolesAssignedTo(p.identity.reviewers, user?.displayName),
        }))
        .filter((row) => row.areas.length > 0),
    [projects, user?.displayName],
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        My Account
      </Typography.Title>

      {/* Grouped by what each card is FOR:
            · what you may do   — full width, first: it is the question people
                                  open this page to answer
            · who you are       — full width
            · what you own      — full width
            · your signature | the authenticator that releases it
          Only the last pair is halved, because those two are the halves of ONE
          act: the signature is what gets attached, the authenticator is what
          permits attaching it. The three above each hold a table that reads
          better across the full width.
          Row/Col also fixes an alignment bug the hand-built flex columns had:
          the right column started 16px lower than the left because
          TotpEnrollCard carried a `marginTop: 16` from when it was stacked
          under the signature card. */}
      <Row gutter={[16, 16]} align="top">
        <Col xs={24}>
            <Card size="small" title="What your role lets you do">
              {isAdmin ? (
                <Alert
                  type="info"
                  showIcon
                  title="System Administrator — unrestricted"
                  description="Every gate decision, every phase approval, market tracking and project deletion. Deleting a project is admin-only by construction, not a grantable capability."
                />
              ) : !permissionGrid ? (
                <Spin />
              ) : !capabilities.any ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No decision rights yet — you can still enter and edit evidence everywhere (rule A4). An administrator grants gate and phase authority per role."
                />
              ) : (
                <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
                  <Descriptions.Item label="Gate decisions" span={{ xs: 1, md: 2 }}>
                    {capabilities.gateNumbers.length === 0 ? (
                      <span style={{ color: TEXT.secondary }}>None</span>
                    ) : (
                      capabilities.gateNumbers.map((n) => (
                        <Tag key={n} color="blue">
                          Gate {n}
                        </Tag>
                      ))
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phase approvals">
                    {capabilities.phaseNumbers.length === 0 ? (
                      <span style={{ color: TEXT.secondary }}>None</span>
                    ) : (
                      capabilities.phaseNumbers.map((n) => (
                        <Tag key={n} color="green">
                          Phase {n}
                        </Tag>
                      ))
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Market tracking">
                    {capabilities.marketTrack ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Archive a project">
                    {capabilities.archive ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
        </Col>
        <Col xs={24}>
            <Card size="small" title="Profile">
              <Space align="start" size={16} style={{ marginBottom: 12 }}>
                <Avatar size={56} style={{ backgroundColor: '#1677ff', flexShrink: 0 }}>
                  {initials || '?'}
                </Avatar>
                <div>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {user?.displayName ?? '—'}
                  </Typography.Text>
                  <div style={{ color: TEXT.secondary, fontSize: 13 }}>{user?.email ?? '—'}</div>
                  <div style={{ marginTop: 6 }}>
                    {(user?.roles ?? []).length === 0 ? (
                      <Tag>No role assigned</Tag>
                    ) : (
                      (user?.roles ?? []).map((r) => (
                        <Tag key={r.key} color={r.key === ADMIN_ROLE ? 'gold' : 'blue'}>
                          {r.name}
                        </Tag>
                      ))
                    )}
                  </div>
                </div>
              </Space>
              <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
                <Descriptions.Item label="Department">
                  {user?.department ?? <span style={{ color: TEXT.secondary }}>Not synced</span>}
                </Descriptions.Item>
                <Descriptions.Item label="Sign-in">
                  {/* Not always SSO: the seeded …@demo.mbc360.local accounts come
                      in through dev-login, and claiming Microsoft 365 for one of
                      those would simply be false. */}
                  {user?.email.endsWith('@demo.mbc360.local')
                    ? 'Dev login (seeded demo account)'
                    : 'Microsoft 365 (single sign-on)'}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                Name, email and department come from Microsoft 365 at sign-in and are not editable
                here. Your role is a decision made inside MBc360 — an administrator sets it on the{' '}
                <Link to="/admin/users">Users</Link> page.
              </Typography.Paragraph>
            </Card>
        </Col>
        <Col xs={24}>
            <Card
              size="small"
              title="My review areas"
              extra={
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {reviewAreas.length === 0 ? 'None' : `${reviewAreas.length} project(s)`}
                </Typography.Text>
              }
            >
              {reviewAreas.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="You are not assigned as a reviewer on any project. Reviewers are chosen per project when it is created."
                />
              ) : (
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={reviewAreas}
                  pagination={false}
                  scroll={{ x: 420 }}
                  columns={[
                    {
                      title: 'Project',
                      width: 160,
                      render: (_, row) => (
                        <span>
                          <Link to={`/projects/${row.id}/my-sheets`}>{row.name}</Link>
                          {row.sku && (
                            <div style={{ color: TEXT.secondary, fontSize: 12 }}>{row.sku}</div>
                          )}
                        </span>
                      ),
                    },
                    {
                      title: 'Review areas you hold',
                      render: (_, row) =>
                        row.areas.map((key) => (
                          <Tag key={key} style={{ marginBottom: 2 }}>
                            {reviewRoleLabel(key)}
                          </Tag>
                        )),
                    },
                  ]}
                />
              )}
            </Card>
        </Col>
        <Col xs={24} xl={12}>
            <Card size="small" title="Signature">
              {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
              <Typography.Paragraph type="secondary">
                Draw a signature once and reuse it when signing a phase. Attaching it to a sign-off
                still needs a fresh code from your authenticator app each time — saving it here does
                not.
              </Typography.Paragraph>
              {loading ? (
                <Spin />
              ) : signature?.hasSignature ? (
                <Space direction="vertical" size={12}>
                  <div
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      padding: 8,
                      background: '#fff',
                      display: 'inline-block',
                    }}
                  >
                    <img
                      src={signature.imageData}
                      alt="Your saved signature"
                      width={300}
                      height={90}
                      style={{ display: 'block', maxWidth: 300, height: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                  <Space>
                    <Button onClick={() => setModalOpen(true)}>Update signature</Button>
                    <Popconfirm
                      title="Remove your saved signature?"
                      description="You can draw a new one at any time."
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                      onConfirm={handleDelete}
                    >
                      <Button danger>Remove</Button>
                    </Popconfirm>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical">
                  <Typography.Text type="secondary">No signature saved yet.</Typography.Text>
                  <Button type="primary" onClick={() => setModalOpen(true)}>
                    Add signature
                  </Button>
                </Space>
              )}
            </Card>
        </Col>
        <Col xs={24} xl={12}>
          <TotpEnrollCard />
        </Col>
      </Row>
      <SignatureCaptureModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}
