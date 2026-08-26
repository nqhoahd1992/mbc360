import { useState } from 'react';
import { Alert, Button, Input, Modal, Popover, Space, Tag, Tooltip, Typography } from 'antd';
import { EditOutlined, SafetyCertificateFilled } from '@ant-design/icons';
import type { RegisterColumn } from '@mbc360/shared/config/registers';
import { signatureFieldKeys } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { verifyRegisterSignatureStepUp } from '../api/projectsApi';
import { canSignRegisterColumn } from '../utils/permissions';
import { EMPTY_GRANTS } from '../utils/permissions';
import { TEXT } from '../theme/tokens';

// The cell renderer for a `signature` register column (2026-08-26), replacing
// the workbook's "type your name here" approval box.
//
// Nothing here writes the value. Signing is an act: an authenticator code is
// exchanged for a single-use proof bound to this exact row and column, and the
// server then records the signer's account, the roles they held at that moment,
// its own timestamp and the signer's saved signature image. Withdrawing needs a
// reason and is the signer's alone (or an admin's) — B4, no silent corrections.
//
// Same three properties the phase sign-off has, for the same reason: a name
// anybody can type into a cell, and edit afterwards with nothing recorded, is
// not evidence that anybody approved anything.
export default function RegisterSignatureCell({
  projectId,
  registerKey,
  column,
  row,
  rowIndex,
  readOnly,
}: {
  projectId: string;
  registerKey: string;
  column: RegisterColumn;
  row: RegisterRow;
  rowIndex: number;
  readOnly?: boolean;
}) {
  const keys = signatureFieldKeys(column.key);
  const signedName = row[keys.name] as string | undefined;
  const signedUserId = row[keys.userId] as string | undefined;
  const signedRole = row[keys.role] as string | undefined;
  const signedAt = row[keys.at] as string | undefined;
  const signedImage = row[keys.image] as string | undefined;

  const { user, isAdmin } = useSession();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const signRegisterRow = useAppStore((s) => s.signRegisterRow);
  const withdrawRegisterSignature = useAppStore((s) => s.withdrawRegisterSignature);

  const [signOpen, setSignOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REAL signed-in roles, never the "View as" simulator — a signature is a real
  // act on real data (same reasoning as archive/delete).
  const maySign = canSignRegisterColumn(
    grants,
    (user?.roles ?? []).map((r) => r.key),
    column.signCapability,
  );
  const mayWithdraw = !!signedUserId && (signedUserId === user?.id || isAdmin);

  const closeSign = () => {
    setSignOpen(false);
    setCode('');
    setError(null);
  };

  const submitSign = async () => {
    if (code.length !== 6) {
      setError('Enter the 6 digits currently shown in your authenticator app');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { stepUpToken } = await verifyRegisterSignatureStepUp(
        projectId,
        registerKey,
        rowIndex,
        column.key,
        code,
      );
      // The store surfaces a server rejection itself and re-fetches, so there is
      // nothing to catch here beyond the step-up call above.
      signRegisterRow(projectId, registerKey, rowIndex, column.key, stepUpToken);
      closeSign();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const submitWithdraw = () => {
    if (!reason.trim()) return;
    withdrawRegisterSignature(projectId, registerKey, rowIndex, column.key, reason.trim());
    setWithdrawOpen(false);
    setReason('');
  };

  if (signedUserId) {
    const detail = (
      <div style={{ maxWidth: 280, display: 'grid', gap: 6, fontSize: 12 }}>
        <div>
          <b>{signedName}</b>
        </div>
        {signedRole && <div style={{ color: TEXT.secondary }}>Role at signing: {signedRole}</div>}
        {signedAt && (
          <div style={{ color: TEXT.secondary }}>{new Date(signedAt).toLocaleString()}</div>
        )}
        {signedImage && (
          <img
            src={signedImage}
            alt={`${signedName} signature`}
            style={{ maxWidth: '100%', maxHeight: 70, background: '#fff', borderRadius: 4 }}
          />
        )}
        {mayWithdraw && (
          <Button size="small" danger onClick={() => setWithdrawOpen(true)}>
            Withdraw signature
          </Button>
        )}
      </div>
    );
    return (
      <>
        <Popover content={detail} title={column.label} trigger="click">
          <Tag color="success" icon={<SafetyCertificateFilled />} style={{ cursor: 'pointer', margin: 0 }}>
            {signedName}
          </Tag>
        </Popover>
        <Modal
          open={withdrawOpen}
          title={`Withdraw "${column.label}"`}
          okText="Withdraw"
          okButtonProps={{ danger: true, disabled: !reason.trim() }}
          onOk={submitWithdraw}
          onCancel={() => setWithdrawOpen(false)}
          destroyOnHidden
        >
          <Typography.Paragraph type="secondary">
            The signature is removed and the reason recorded. The row itself is not changed.
          </Typography.Paragraph>
          <Input.TextArea
            rows={3}
            autoFocus
            placeholder="Why is this signature being withdrawn?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Modal>
      </>
    );
  }

  if (readOnly) return <span style={{ color: TEXT.secondary }}>Not signed</span>;

  return (
    <>
      <Space size={4}>
        <Tooltip
          title={
            maySign
              ? 'Signs as you, with a code from your authenticator app'
              : `Your role may not sign this (needs ${column.signCapability})`
          }
        >
          <Button size="small" icon={<EditOutlined />} disabled={!maySign} onClick={() => setSignOpen(true)}>
            Sign
          </Button>
        </Tooltip>
      </Space>
      <Modal
        open={signOpen}
        title={`Sign "${column.label}"`}
        okText="Verify & sign"
        okButtonProps={{ loading: busy, disabled: code.length !== 6 }}
        onOk={submitSign}
        onCancel={closeSign}
        destroyOnHidden
      >
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
        <Typography.Paragraph type="secondary">
          You are signing as <b>{user?.displayName}</b>. Enter the current code from your
          authenticator app. The signature records your account, the roles you hold now, the server
          timestamp and your saved signature — none of them typed by hand.
        </Typography.Paragraph>
        <Input
          size="large"
          maxLength={6}
          placeholder="000000"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          name="registerSignatureOtp"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onPressEnter={submitSign}
        />
      </Modal>
    </>
  );
}
