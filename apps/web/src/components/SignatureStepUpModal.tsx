import { useState } from 'react';
import { Alert, Button, Input, Modal, Typography } from 'antd';
import type { SignOff } from '@mbc360/shared/types';
import { confirmSignOffCode, requestSignOffCode } from '../api/projectsApi';

// Step-up (2026-08-21): the one-time email code required to attach a saved
// signature to a phase sign-off act. Two steps, one modal: send a code bound
// to this exact project/phase/role, then confirm it for a short-lived proof
// token that the caller passes into signSignOff.
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
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSent(false);
    setCode('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await requestSignOffCode(projectId, phase, role);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!code.trim()) {
      setError('Enter the code from your email');
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const { stepUpToken } = await confirmSignOffCode(projectId, phase, role, code.trim());
      onVerified(stepUpToken);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Verify it's you — "${role}"`}
      onCancel={handleClose}
      destroyOnHidden
      footer={
        sent
          ? [
              <Button key="resend" onClick={send} loading={sending}>
                Resend code
              </Button>,
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
              <Button key="confirm" type="primary" loading={confirming} onClick={confirm}>
                Confirm
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
              <Button key="send" type="primary" loading={sending} onClick={send}>
                Send code to my email
              </Button>,
            ]
      }
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {sent ? (
        <>
          <Typography.Paragraph type="secondary">
            Enter the 6-digit code we just emailed you. It expires in 10 minutes.
          </Typography.Paragraph>
          <Input
            size="large"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onPressEnter={confirm}
          />
        </>
      ) : (
        <Typography.Paragraph type="secondary">
          Attaching your saved signature to this sign-off needs a one-time code sent to your
          account email.
        </Typography.Paragraph>
      )}
    </Modal>
  );
}
