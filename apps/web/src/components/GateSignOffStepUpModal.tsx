import { useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import type { GateSignOffRole } from '@mbc360/shared/types';
import { verifyGateSignOffStepUp } from '../api/projectsApi';

// The authenticator code that gates a per-gate signature (Round 4 questions 18
// and 29). Deliberately a second component rather than a `phase | gate` union on
// SignatureStepUpModal: the two acts verify against different endpoints and bind
// to different purposes, and a modal that quietly did either would be one edit
// away from binding a proof to the wrong act.
export default function GateSignOffStepUpModal({
  open,
  projectId,
  gateId,
  market,
  role,
  onClose,
  onVerified,
}: {
  open: boolean;
  projectId: string;
  gateId: string;
  market?: string;
  role: GateSignOffRole;
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
      const { stepUpToken } = await verifyGateSignOffStepUp(projectId, gateId, market, role, code);
      setCode('');
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
      title={`Confirm it is you — ${role}, ${gateId}${market ? ` (${market})` : ''}`}
      okText="Verify and sign"
      confirmLoading={verifying}
      onOk={submit}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Signing attaches your saved signature to this gate. Enter the current code from your
        authenticator app.
      </Typography.Paragraph>
      <Input
        autoFocus
        maxLength={6}
        inputMode="numeric"
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        onPressEnter={submit}
      />
      {error && <Alert type="error" showIcon style={{ marginTop: 12 }} message={error} />}
    </Modal>
  );
}
