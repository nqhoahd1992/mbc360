import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterClosureRole, RegisterClosureSignOff, RegisterClosureState } from '@mbc360/shared/types';
import { hasStandingClosureSignature, isRegisterClosureSigned, isRegisterClosureStale, isRegisterClosed } from '@mbc360/shared/types';
import type { ReviewOwnerSpec } from '@mbc360/shared/config/reviewers';
import { registerClosureSignerRole } from '@mbc360/shared/config/reviewers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import RegisterCloseStepUpModal from './RegisterCloseStepUpModal';
import RegisterClosePreviewModal from './RegisterClosePreviewModal';
import { Link } from 'react-router-dom';
import { TABLE_STICKY } from '../theme/tokens';
import { GATES } from '@mbc360/shared/config/gates';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { closureColumns, closureKey, registerClosureGateIds } from '@mbc360/shared/utils/registerClosures';

const CLOSURE_ROLES: RegisterClosureRole[] = ['Review owner', 'Co-sign'];

// A register is closed once PER GATE that needs it (SW-36): one card per gate, each attesting to — and locking — the columns
// settled at that gate. Nothing locks until somebody signs; the readiness list makes the gate wait for it.
export default function RegisterClosurePanel({
  projectId,
  registerKey,
  spec,
  reviewers,
  closures,
}: {
  projectId: string;
  registerKey: string;
  spec: ReviewOwnerSpec;
  reviewers: Record<string, string> | undefined;
  closures: Record<string, RegisterClosureState>;
}) {
  const config = getRegisterConfig(registerKey);
  if (!config) return null;
  const gates = registerClosureGateIds(config);
  return (
    <>
      {gates.map((gateId) => {
        const columns = closureColumns(config, gateId)
          .map((key) => config.columns.find((c) => c.key === key)?.label ?? key)
          .join(', ');
        return (
          <GateClosureCard
            key={gateId}
            projectId={projectId}
            registerKey={registerKey}
            gateId={gateId}
            gateLabel={GATES.find((g) => g.id === gateId)?.name ?? gateId}
            columns={columns}
            spec={spec}
            reviewers={reviewers}
            closure={closures[closureKey(registerKey, gateId)]}
          />
        );
      })}
    </>
  );
}

// Register closing (2026-08-27, user-requested): editing a register stays
// open to anyone (rule A4, untouched) — but a deliberate two-signature act
// (Review owner + Co-sign) makes it read-only independently of its gate.
// Modeled directly on SignOffBlock.tsx's phase sign-off, trimmed to what this
// simpler act actually needs: exactly 2 fixed roles, no Lead-nominated signer
// (the signer is derived straight from the register's own reviewOwner spec —
// see registerClosureSignerRole), and no decision/comment fields (closing IS
// the act; there is nothing else to record).
function GateClosureCard({
  projectId,
  registerKey,
  gateId,
  gateLabel,
  columns,
  spec,
  reviewers,
  closure,
}: {
  projectId: string;
  registerKey: string;
  gateId: string;
  gateLabel: string;
  columns: string;
  spec: ReviewOwnerSpec;
  reviewers: Record<string, string> | undefined;
  closure: RegisterClosureState | undefined;
}) {
  const signRegisterClose = useAppStore((s) => s.signRegisterClose);
  const withdrawRegisterClose = useAppStore((s) => s.withdrawRegisterClose);
  const { user: me } = useSession();
  const { isAdmin } = usePermissionView();
  // A closure given for a gate that has passed stands until Backtrack, like the gate's own signatures (SW-36).
  const gatePassed = useAppStore((st) => {
    const project = st.projects.find((x) => x.identity.id === projectId);
    return !!project && isGatePassed(project, gateId);
  });

  const [withdrawing, setWithdrawing] = useState<RegisterClosureRole | null>(null);
  const [reason, setReason] = useState('');
  // Sign opens the preview first (everything the signature attests to), then the authenticator step.
  const [reviewing, setReviewing] = useState<RegisterClosureRole | null>(null);
  const [stepUp, setStepUp] = useState<{ role: RegisterClosureRole; hash: string } | null>(null);

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
  const standing = hasStandingClosureSignature(closure);

  const blockedReason = (row: RegisterClosureSignOff): string | null => {
    const assignedName = nameFor(row.role);
    if (!assignedName) return `No one is assigned to "${row.role}" for this register yet`;
    if (!me || me.displayName.trim() !== assignedName.trim()) return `Assigned to ${assignedName}`;
    if (!hasSignature) return 'Save a signature in My Account first — closing attaches it';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    return null;
  };

  const sign = (row: RegisterClosureSignOff, stepUpToken: string, expectedHash: string) =>
    signRegisterClose(projectId, registerKey, gateId, row.role, stepUpToken, expectedHash);

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    withdrawRegisterClose(projectId, registerKey, gateId, withdrawing, reason);
    setWithdrawing(null);
    setReason('');
  };

  return (
    <Card size="small" title={`Register closing — ${gateId} ${gateLabel}`}>
      {closed ? (
        <Alert
          type="success"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          title="Closed for this gate"
          description={`Both signatures are recorded. This locks the columns settled at ${gateId}: ${columns}. To correct them, withdraw a signature below, or Backtrack past the gate.`}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          icon={<UnlockOutlined />}
          style={{ marginBottom: 12 }}
          title="Open"
          description={`Closing for ${gateId} needs both signatures below and is required before that gate can pass. It attests to, and locks, these columns: ${columns}.`}
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
      {standing && !closed && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Locked while a signature stands"
          description="One of the two signatures is in place, so these columns are read-only: both signers must attest to the same content. To change them, the signer withdraws their signature (with a reason)."
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
                    {(mine || isAdmin) && !gatePassed && (
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
                  {isRegisterClosureStale(r) && (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>
                      Signed by {r.name} on {r.signedAt ? dayjs(r.signedAt).format('YYYY-MM-DD HH:mm') : '—'}, but the register
                      changed after that, so it no longer counts. Sign again to confirm what it says now.
                    </Typography.Text>
                  )}
                  <Tooltip title={why ?? ''}>
                    <span>
                      <Button size="small" type="primary" disabled={!!why} onClick={() => setReviewing(r.role)}>
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
      <RegisterClosePreviewModal
        open={reviewing !== null}
        projectId={projectId}
        registerKey={registerKey}
        gateId={gateId}
        roleLabel={reviewing ?? ''}
        onCancel={() => setReviewing(null)}
        onContinue={(preview) => {
          if (!reviewing) return;
          setStepUp({ role: reviewing, hash: preview.hash });
          setReviewing(null);
        }}
      />
      <RegisterCloseStepUpModal
        open={stepUp !== null}
        projectId={projectId}
        registerKey={registerKey}
        gateId={gateId}
        role={stepUp?.role ?? 'Review owner'}
        expectedHash={stepUp?.hash ?? ''}
        onClose={() => setStepUp(null)}
        onVerified={(token) => {
          if (!stepUp) return;
          const row = signOffs.find((s) => s.role === stepUp.role);
          const hash = stepUp.hash;
          setStepUp(null);
          if (row) sign(row, token, hash);
        }}
      />
    </Card>
  );
}
