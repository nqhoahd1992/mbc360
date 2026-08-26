import { useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import type { SignOff } from '@mbc360/shared/types';
import { verifySignOffStepUp } from '../api/projectsApi';

// Step-up (2026-08-21): the authenticator code required to attach a saved
// signature to a phase sign-off act. One step — the app on the signer's phone
// is already generating codes, so unlike the emailed code this replaced there
// is nothing to request first. The code is verified against this exact
// project/phase/role, and the proof token it returns is spent by the caller's
// signSignOff call.
export default function SignatureStepUpModal({
  open,
  projectId,
  phase,
  role,
  onClose,
  onVerified,
}: {
  open: boolean;
  projectId: string;
  phase: number;
  role: SignOff['role'];
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
      const { stepUpToken } = await verifySignOffStepUp(projectId, phase, role, code);
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
        Attaching your saved signature needs the current code from your authenticator app. Signing
        records your account, the role you hold now, the server timestamp and the version of this
        project record.
      </Typography.Paragraph>
      <Input
        size="large"
        maxLength={6}
        placeholder="000000"
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        spellCheck={false}
        name="signOffOtp"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        onPressEnter={submit}
      />
    </Modal>
  );
}
