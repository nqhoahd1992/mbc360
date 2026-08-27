import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterClosureRole, RegisterClosureSignOff, RegisterClosureState } from '@mbc360/shared/types';
import { isRegisterClosureSigned, isRegisterClosed } from '@mbc360/shared/types';
import type { ReviewOwnerSpec } from '@mbc360/shared/config/reviewers';
import { registerClosureSignerRole } from '@mbc360/shared/config/reviewers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import RegisterCloseStepUpModal from './RegisterCloseStepUpModal';
import { Link } from 'react-router-dom';
import { TABLE_STICKY } from '../theme/tokens';

const CLOSURE_ROLES: RegisterClosureRole[] = ['Review owner', 'Co-sign'];

// Register closing (2026-08-27, user-requested): editing a register stays
// open to anyone (rule A4, untouched) — but a deliberate two-signature act
// (Review owner + Co-sign) makes it read-only independently of its gate.
// Modeled directly on SignOffBlock.tsx's phase sign-off, trimmed to what this
// simpler act actually needs: exactly 2 fixed roles, no Lead-nominated signer
// (the signer is derived straight from the register's own reviewOwner spec —
// see registerClosureSignerRole), and no decision/comment fields (closing IS
// the act; there is nothing else to record).
export default function RegisterClosurePanel({
  projectId,
  registerKey,
  spec,
  reviewers,
  closure,
}: {
  projectId: string;
  registerKey: string;
  spec: ReviewOwnerSpec;
  reviewers: Record<string, string> | undefined;
  closure: RegisterClosureState | undefined;
}) {
  const signRegisterClose = useAppStore((s) => s.signRegisterClose);
  const withdrawRegisterClose = useAppStore((s) => s.withdrawRegisterClose);
  const { user: me, isAdmin } = useSession();

  const [withdrawing, setWithdrawing] = useState<RegisterClosureRole | null>(null);
  const [reason, setReason] = useState('');
  const [stepUpRole, setStepUpRole] = useState<RegisterClosureRole | null>(null);

  // Same precondition as the phase sign-off: closing always attaches the
  // signer's saved signature and always asks for a fresh authenticator code.
  const [hasSignature, setHasSignature] = useState(false);
  const [totpEnrolled, setTotpEnrolled] = useState(false);
  useEffect(() => {
    getMySignature()
      .then((r) => setHasSignature(r.hasSignature))
      .catch(() => setHasSignature(false));
    getMyTotpStatus()
      .then((r) => setTotpEnrolled(r.enrolled))
      .catch(() => setTotpEnrolled(false));
  }, []);

  const signOffs = CLOSURE_ROLES.map(
    (role) => closure?.signOffs.find((s) => s.role === role) ?? { role },
  );
  const roleKeyFor = (role: RegisterClosureRole) => registerClosureSignerRole(spec, role);
  const nameFor = (role: RegisterClosureRole) => reviewers?.[roleKeyFor(role)];

  // A register whose spec declares no distinct Co-sign (falls back to
  // Project Manager per registerClosureSignerRole) AND whose owner already
  // IS Project Manager needs the SAME PERSON to sign both rows — not a
  // second independent signature. Not blocked (same "visible warning, not a
  // block" precedent SignOffBlock already uses for its own D1 independence
  // concern) — just flagged, since a silent 2-signature UI over 1 real
  // signer would misrepresent what actually happened.
  // [ASSUMPTION: R5-Q21](d) — whether this should instead get a distinct
  // Co-sign role assigned is an open question, see
  // docs/rules/F1_Per_Gate_Open_Questions.md.
  const sameSignerForBothRoles = roleKeyFor('Review owner') === roleKeyFor('Co-sign');

  const closed = isRegisterClosed(closure);

  const blockedReason = (row: RegisterClosureSignOff): string | null => {
    const assignedName = nameFor(row.role);
    if (!assignedName) return `No one is assigned to "${row.role}" for this register yet`;
    if (!me || me.displayName.trim() !== assignedName.trim()) return `Assigned to ${assignedName}`;
    if (!hasSignature) return 'Save a signature in My Account first — closing attaches it';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    return null;
  };

  const sign = (row: RegisterClosureSignOff, stepUpToken: string) =>
    signRegisterClose(projectId, registerKey, row.role, stepUpToken);

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    withdrawRegisterClose(projectId, registerKey, withdrawing, reason);
    setWithdrawing(null);
    setReason('');
  };

  return (
    <Card size="small" title="Register Closing">
      {closed ? (
        <Alert
          type="success"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          title="Closed — read-only"
          description="Both signatures are recorded. To correct this register, withdraw a signature below, or Backtrack past the gate that depends on it."
        />
      ) : (
        <Alert
          type="info"
          showIcon
          icon={<UnlockOutlined />}
          style={{ marginBottom: 12 }}
          title="Open — anyone may add, edit or delete rows"
          description="Closing needs both signatures below, and is required before the gate that depends on this register can pass."
        />
      )}
      {sameSignerForBothRoles && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Both roles resolve to the same person (${nameFor('Review owner') ?? 'unassigned'})`}
          description="This register's review-owner spec declares no distinct Co-sign, so closing it needs the same person to sign twice rather than a genuinely independent second signature."
        />
      )}
      <Table
        size="small"
        rowKey={(r) => r.role}
        dataSource={signOffs}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 720 }}
        columns={[
          { title: 'Role', width: 110, dataIndex: 'role', fixed: 'left', render: (v) => <b>{v}</b> },
          {
            title: 'Assigned to',
            width: 180,
            render: (_, r: RegisterClosureSignOff) => nameFor(r.role) ?? <Typography.Text type="secondary">Unassigned</Typography.Text>,
          },
          {
            title: 'Signature',
            width: 320,
            render: (_, r: RegisterClosureSignOff) => {
              if (isRegisterClosureSigned(r)) {
                const mine = r.signedByUserId === me?.id;
                return (
                  <Space orientation="vertical" size={0}>
                    <span>
                      <Tag color="green">Signed</Tag>
                      <span>{r.name}</span>
                    </span>
                    {r.signatureImage && (
                      <img
                        src={r.signatureImage}
                        alt={`${r.name}'s signature`}
                        width={160}
                        height={50}
                        style={{
                          maxWidth: 160,
                          maxHeight: 50,
                          width: 'auto',
                          display: 'block',
                          margin: '2px 0',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {r.roleAtSigning ?? 'role not recorded'} ·{' '}
                      {r.signedAt ? dayjs(r.signedAt).format('YYYY-MM-DD HH:mm') : '—'} · record v
                      {r.recordVersion ?? '—'}
                    </Typography.Text>
                    {(mine || isAdmin) && (
                      <Button
                        size="small"
                        type="link"
                        danger
                        style={{ paddingLeft: 0 }}
                        onClick={() => setWithdrawing(r.role)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </Space>
                );
              }
              const why = blockedReason(r);
              return (
                <Space orientation="vertical" size={4}>
                  <Tooltip title={why ?? ''}>
                    <span>
                      <Button size="small" type="primary" disabled={!!why} onClick={() => setStepUpRole(r.role)}>
                        Sign as me
                      </Button>
                    </span>
                  </Tooltip>
                  {(!hasSignature || !totpEnrolled) && (
                    <Link to="/account" style={{ fontSize: 12 }}>
                      {!hasSignature ? 'Add a signature' : 'Set up an authenticator'} in My Account
                    </Link>
                  )}
                </Space>
              );
            },
          },
        ]}
      />
      <Modal
        open={withdrawing !== null}
        title={`Withdraw the "${withdrawing}" signature`}
        okText="Withdraw signature"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={confirmWithdraw}
        onCancel={() => {
          setWithdrawing(null);
          setReason('');
        }}
      >
        <p>
          The signature is cleared and this register stops counting as closed — it becomes editable
          again unless something else (its gate having passed) still locks it. B4: the reason is
          recorded on the audit trail.
        </p>
        <Input.TextArea
          rows={3}
          value={reason}
          placeholder="Why is this signature being withdrawn?"
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
      <RegisterCloseStepUpModal
        open={stepUpRole !== null}
        projectId={projectId}
        registerKey={registerKey}
        role={stepUpRole ?? 'Review owner'}
        onClose={() => setStepUpRole(null)}
        onVerified={(token) => {
          const row = signOffs.find((s) => s.role === stepUpRole);
          setStepUpRole(null);
          if (row) sign(row, token);
        }}
      />
    </Card>
  );
}
