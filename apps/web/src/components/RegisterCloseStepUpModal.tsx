import { useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import type { RegisterClosureRole } from '@mbc360/shared/types';
import { verifyRegisterCloseStepUp } from '../api/projectsApi';

// Step-up (2026-08-27) for closing a register — same shape as
// SignatureStepUpModal.tsx (phase sign-off), just targeting a register + a
// closing role instead of a phase + sign-off role. One step: the app on the
// signer's phone is already generating codes, so there is nothing to request
// first. The code is verified against this exact project/register/role, and
// the proof token it returns is spent by the caller's signRegisterClose call.
export default function RegisterCloseStepUpModal({
  open,
  projectId,
  registerKey,
  role,
  onClose,
  onVerified,
}: {
  open: boolean;
  projectId: string;
  registerKey: string;
  role: RegisterClosureRole;
  onClose: () => void;
  onVerified: (stepUpToken: string) => void;
}) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (code.length !== 6) {
      setError('Enter the 6 digits currently shown in your authenticator app');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const { stepUpToken } = await verifyRegisterCloseStepUp(projectId, registerKey, role, code);
      setCode('');
      setError(null);
      onVerified(stepUpToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Verify it's you — "${role}"`}
      onCancel={handleClose}
      onOk={submit}
      okText="Verify & sign"
      okButtonProps={{ loading: verifying, disabled: code.length !== 6 }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Typography.Paragraph type="secondary">
        Closing this register attaches your saved signature and needs the current code from your
        authenticator app. Signing records your account, the role you hold now, the server
        timestamp and the version of this project record.
      </Typography.Paragraph>
      <Input
        size="large"
        maxLength={6}
        placeholder="000000"
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        spellCheck={false}
        name="registerCloseOtp"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        onPressEnter={submit}
      />
    </Modal>
  );
}
